"""
User Views for MAISON

Provides views for user registration, profile management,
address CRUD, password management, and OAuth authentication.
"""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from core.exceptions import NotFoundError, BadRequestError, UnauthorizedError
from core.permissions import IsAuthenticatedAndActive
from users.models import User, UserAddress
from users.serializers import (
    RegisterSerializer,
    UserSerializer,
    UserProfileSerializer,
    UserAddressSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

logger = logging.getLogger('maison_api')


# ============================================================================
# Custom Token Obtain View
# ============================================================================

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom login view that returns JWT tokens with enriched user data.
    Uses CustomTokenObtainPairSerializer to include user profile in response.
    """
    serializer_class = CustomTokenObtainPairSerializer

    @extend_schema(
        operation_id='auth_login',
        summary='Obtain JWT Token Pair',
        description=(
            'Authenticate a user with email and password. '
            'Returns access and refresh JWT tokens along with user profile data.'
        ),
        tags=['Authentication'],
        responses={
            200: OpenApiResponse(
                description='Authentication successful. Returns JWT tokens and user data.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOi...',
                            'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOi...',
                            'user': {
                                'id': 1,
                                'email': 'user@example.com',
                                'first_name': 'John',
                                'last_name': 'Doe',
                                'full_name': 'John Doe',
                                'is_verified': True,
                                'is_staff': False,
                            }
                        }
                    )
                ],
            ),
            401: OpenApiResponse(description='Invalid credentials or inactive account.'),
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


# ============================================================================
# Registration
# ============================================================================

class RegisterView(APIView):
    """
    Register a new user account.

    Creates a user with the provided email, name, and password.
    Returns user data and JWT tokens on success.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id='auth_register',
        summary='Register New User',
        description=(
            'Create a new user account. Returns the created user data '
            'and JWT tokens for immediate authentication.'
        ),
        tags=['Authentication'],
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(
                description='User registered successfully.',
                examples=[
                    OpenApiExample(
                        'Created',
                        value={
                            'message': 'Registration successful.',
                            'user': {
                                'id': 1,
                                'email': 'user@example.com',
                                'first_name': 'John',
                                'last_name': 'Doe',
                            },
                            'tokens': {
                                'access': 'eyJ0eXAiOiJKV1Qi...',
                                'refresh': 'eyJ0eXAiOiJKV1Qi...',
                            }
                        }
                    )
                ],
            ),
            400: OpenApiResponse(description='Validation error. Check request body.'),
            409: OpenApiResponse(description='Email already registered.'),
        },
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Generate JWT tokens for the new user
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        # Send welcome email asynchronously
        try:
            from core.utils import send_welcome_email
            send_welcome_email(user)
        except Exception as e:
            logger.warning(f'Failed to send welcome email to {user.email}: {e}')

        return Response(
            {
                'message': 'Registration successful.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.get_full_name(),
                    'is_verified': user.is_verified,
                },
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================================
# User Profile
# ============================================================================

class UserProfileView(APIView):
    """
    Retrieve and update the authenticated user's profile.
    """
    permission_classes = [IsAuthenticatedAndActive]

    @extend_schema(
        operation_id='auth_profile_retrieve',
        summary='Get User Profile',
        description='Retrieve the authenticated user\'s full profile information.',
        tags=['User Profile'],
        responses={
            200: UserSerializer,
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        operation_id='auth_profile_update',
        summary='Update User Profile',
        description=(
            'Update the authenticated user\'s profile. '
            'Supports both full update (PUT) and partial update (PATCH).'
        ),
        tags=['User Profile'],
        request=UserProfileSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='Validation error.'),
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def put(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(UserSerializer(request.user, context={'request': request}).data)

    @extend_schema(
        operation_id='auth_profile_partial_update',
        summary='Partially Update User Profile',
        description='Partially update the authenticated user\'s profile fields.',
        tags=['User Profile'],
        request=UserProfileSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='Validation error.'),
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(UserSerializer(request.user, context={'request': request}).data)


# ============================================================================
# User Addresses
# ============================================================================

class UserAddressListCreateView(APIView):
    """
    List all addresses for the authenticated user or create a new address.
    """
    permission_classes = [IsAuthenticatedAndActive]

    @extend_schema(
        operation_id='auth_addresses_list',
        summary='List User Addresses',
        description='Retrieve all saved addresses for the authenticated user.',
        tags=['User Addresses'],
        responses={
            200: UserAddressSerializer(many=True),
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def get(self, request):
        addresses = UserAddress.objects.filter(user=request.user)
        serializer = UserAddressSerializer(
            addresses,
            many=True,
            context={'request': request},
        )
        return Response(serializer.data)

    @extend_schema(
        operation_id='auth_address_create',
        summary='Create User Address',
        description=(
            'Create a new address for the authenticated user. '
            'If is_default is true, all other addresses will be unset as default.'
        ),
        tags=['User Addresses'],
        request=UserAddressSerializer,
        responses={
            201: UserAddressSerializer,
            400: OpenApiResponse(description='Validation error.'),
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def post(self, request):
        serializer = UserAddressSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        # Attach the user to the address before saving
        address = serializer.save(user=request.user)

        return Response(
            UserAddressSerializer(address, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserAddressDetailView(APIView):
    """
    Retrieve, update, or delete a specific user address.
    """
    permission_classes = [IsAuthenticatedAndActive]

    def _get_address(self, pk, user):
        """
        Fetch a user's address by primary key.

        Args:
            pk: Address primary key.
            user: The authenticated user.

        Returns:
            UserAddress instance.

        Raises:
            NotFoundError: If the address does not exist or doesn't belong to the user.
        """
        try:
            address = UserAddress.objects.get(pk=pk, user=user)
        except UserAddress.DoesNotExist:
            raise NotFoundError('Address not found.')
        return address

    @extend_schema(
        operation_id='auth_address_retrieve',
        summary='Get User Address',
        description='Retrieve a specific address by ID.',
        tags=['User Addresses'],
        responses={
            200: UserAddressSerializer,
            401: OpenApiResponse(description='Authentication required.'),
            404: OpenApiResponse(description='Address not found.'),
        },
    )
    def get(self, request, pk):
        address = self._get_address(pk, request.user)
        serializer = UserAddressSerializer(address, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        operation_id='auth_address_update',
        summary='Update User Address',
        description='Fully update a specific address.',
        tags=['User Addresses'],
        request=UserAddressSerializer,
        responses={
            200: UserAddressSerializer,
            400: OpenApiResponse(description='Validation error.'),
            401: OpenApiResponse(description='Authentication required.'),
            404: OpenApiResponse(description='Address not found.'),
        },
    )
    def put(self, request, pk):
        address = self._get_address(pk, request.user)
        serializer = UserAddressSerializer(
            address,
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(UserAddressSerializer(address, context={'request': request}).data)

    @extend_schema(
        operation_id='auth_address_partial_update',
        summary='Partially Update User Address',
        description='Partially update a specific address.',
        tags=['User Addresses'],
        request=UserAddressSerializer,
        responses={
            200: UserAddressSerializer,
            400: OpenApiResponse(description='Validation error.'),
            401: OpenApiResponse(description='Authentication required.'),
            404: OpenApiResponse(description='Address not found.'),
        },
    )
    def patch(self, request, pk):
        address = self._get_address(pk, request.user)
        serializer = UserAddressSerializer(
            address,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(UserAddressSerializer(address, context={'request': request}).data)

    @extend_schema(
        operation_id='auth_address_delete',
        summary='Delete User Address',
        description='Delete a specific address.',
        tags=['User Addresses'],
        responses={
            204: OpenApiResponse(description='Address deleted successfully.'),
            401: OpenApiResponse(description='Authentication required.'),
            404: OpenApiResponse(description='Address not found.'),
        },
    )
    def delete(self, request, pk):
        address = self._get_address(pk, request.user)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Change Password
# ============================================================================

class ChangePasswordView(APIView):
    """
    Change the authenticated user's password.

    Requires the current password for verification.
    """
    permission_classes = [IsAuthenticatedAndActive]

    @extend_schema(
        operation_id='auth_change_password',
        summary='Change Password',
        description=(
            'Change the authenticated user\'s password. '
            'Requires the current password for verification.'
        ),
        tags=['Authentication'],
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(
                description='Password changed successfully.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={'message': 'Password changed successfully.'}
                    )
                ],
            ),
            400: OpenApiResponse(description='Validation error or incorrect current password.'),
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({'message': 'Password changed successfully.'})


# ============================================================================
# Password Reset
# ============================================================================

class PasswordResetRequestView(APIView):
    """
    Request a password reset email.

    Sends a password reset link to the user's email address.
    Always returns 200 to prevent user enumeration.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id='auth_password_reset_request',
        summary='Request Password Reset',
        description=(
            'Send a password reset email to the provided address. '
            'Always returns success to prevent user enumeration.'
        ),
        tags=['Authentication'],
        request=PasswordResetRequestSerializer,
        responses={
            200: OpenApiResponse(
                description='If the email exists, a reset link has been sent.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={'message': 'If an account with this email exists, a password reset link has been sent.'}
                    )
                ],
            ),
        },
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            if user.is_active:
                # Generate password reset token
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)

                # Build the reset link
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://maison.com')
                reset_link = f'{frontend_url}/reset-password?uid={uid}&token={token}'

                from core.utils import send_email_async

                subject = 'Reset Your MAISON Password'
                body = (
                    f'Dear {user.get_full_name() or "Valued Customer"},\n\n'
                    f'We received a request to reset your password. '
                    f'Click the link below to set a new password:\n\n'
                    f'{reset_link}\n\n'
                    f'This link will expire in 1 hour. '
                    f'If you did not request this, please ignore this email.\n\n'
                    f'With refined regards,\n'
                    f'The MAISON Team'
                )

                html_body = f"""
                <html>
                <body style="font-family: 'Georgia', serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px; letter-spacing: 4px;">MAISON</h1>
                    </div>
                    <h2 style="font-weight: normal; color: #666;">Password Reset</h2>
                    <p>Dear {user.get_full_name() or "Valued Customer"},</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="
                            display: inline-block;
                            background-color: #1a1a1a;
                            color: #fff;
                            padding: 14px 40px;
                            text-decoration: none;
                            letter-spacing: 2px;
                            font-size: 12px;
                        ">RESET PASSWORD</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
                    <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; color: #999; font-size: 12px;">
                        <p style="margin: 0;">With refined regards,<br>The MAISON Team</p>
                    </div>
                </body>
                </html>
                """

                send_email_async(
                    subject=subject,
                    body=body,
                    to=user.email,
                    html_body=html_body,
                )

                logger.info(f'Password reset email sent to: {user.email}')

        except User.DoesNotExist:
            # Do nothing — prevent user enumeration
            pass

        return Response({
            'message': 'If an account with this email exists, a password reset link has been sent.'
        })


class PasswordResetConfirmView(APIView):
    """
    Confirm a password reset using the token sent via email.

    Validates the token and sets the new password.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id='auth_password_reset_confirm',
        summary='Confirm Password Reset',
        description=(
            'Confirm a password reset using the UID and token from the reset email. '
            'Sets the new password for the user.'
        ),
        tags=['Authentication'],
        request=PasswordResetConfirmSerializer,
        responses={
            200: OpenApiResponse(
                description='Password reset successful.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={'message': 'Password has been reset successfully.'}
                    )
                ],
            ),
            400: OpenApiResponse(description='Invalid token or validation error.'),
        },
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({'message': 'Password has been reset successfully.'})


# ============================================================================
# Google OAuth
# ============================================================================

class GoogleOAuthView(APIView):
    """
    Authenticate or register a user via Google OAuth token.

    Accepts a Google ID token, verifies it using the JWT secret,
    and returns JWT tokens for the authenticated/created user.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id='auth_google_oauth',
        summary='Google OAuth Authentication',
        description=(
            'Authenticate or register a user using a Google OAuth token. '
            'Verifies the token and returns JWT tokens for the user.'
        ),
        tags=['Authentication'],
        request=OpenApiExample(
            'Google Token',
            value={'token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...'},
            media_type='application/json',
        ),
        responses={
            200: OpenApiResponse(
                description='Authentication successful. Returns JWT tokens and user data.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'user': {
                                'id': 1,
                                'email': 'user@gmail.com',
                                'first_name': 'John',
                                'last_name': 'Doe',
                            },
                            'tokens': {
                                'access': 'eyJ0eXAiOiJKV1Qi...',
                                'refresh': 'eyJ0eXAiOiJKV1Qi...',
                            }
                        }
                    )
                ],
            ),
            400: OpenApiResponse(description='Invalid Google token.'),
        },
    )
    def post(self, request):
        token = request.data.get('token')
        if not token:
            raise BadRequestError('Google OAuth token is required.')

        # Verify the Google ID token
        user_data = self._verify_google_token(token)

        email = user_data.get('email')
        if not email:
            raise BadRequestError('Unable to extract email from Google token.')

        first_name = user_data.get('given_name', '')
        last_name = user_data.get('family_name', '')
        google_id = user_data.get('sub')
        picture = user_data.get('picture', '')

        # Get or create the user
        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'is_verified': True,  # Google-verified email
            },
        )

        # If user exists but is not verified, mark as verified via Google
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=['is_verified'])

        # Update avatar from Google if user doesn't have one
        if picture and not user.avatar:
            user.avatar = picture
            user.save(update_fields=['avatar'])

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        response_status = status.HTTP_200_OK
        if created:
            response_status = status.HTTP_201_CREATED
            try:
                from core.utils import send_welcome_email
                send_welcome_email(user)
            except Exception as e:
                logger.warning(f'Failed to send welcome email to {user.email}: {e}')

        return Response(
            {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.get_full_name(),
                    'is_verified': user.is_verified,
                    'is_new': created,
                },
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
            },
            status=response_status,
        )

    def _verify_google_token(self, token):
        """
        Verify a Google OAuth ID token.

        Uses Google's public key verification via the google-auth library
        if available. Falls back to JWT secret verification for development.

        Args:
            token: The Google ID token string.

        Returns:
            dict: Decoded token payload with user info.

        Raises:
            BadRequestError: If token verification fails.
        """
        try:
            import json
            from jwt import decode, PyJWKClient

            # Use Google's public keys to verify the token
            jwks_client = PyJWKClient('https://www.googleapis.com/oauth2/v3/certs')
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            decoded = decode(
                token,
                signing_key.key,
                algorithms=['RS256'],
                audience=getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', ''),
            )

            return decoded

        except ImportError:
            # Fallback: use simple JWT verification with SECRET_KEY
            # This is only for development/testing
            import jwt
            try:
                decoded = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=['HS256'],
                    options={'verify_aud': False},
                )
                return decoded
            except jwt.ExpiredSignatureError:
                raise BadRequestError('Google token has expired.')
            except jwt.InvalidTokenError:
                raise BadRequestError('Invalid Google token.')

        except Exception as e:
            logger.warning(f'Google token verification failed: {e}')
            raise BadRequestError('Failed to verify Google token. Please try again.')
