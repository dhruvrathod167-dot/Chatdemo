"""
User Serializers for MAISON

Provides serialization for user registration, profile management,
password changes, JWT token handling, and address CRUD operations.
"""

import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

logger = logging.getLogger('maison_api')

User = get_user_model()


# ============================================================================
# Registration
# ============================================================================

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Validates that passwords match and email is unique.
    Creates the user with a hashed password.
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text='Minimum 8 characters with mixed case, numbers, and symbols.',
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate_email(self, value):
        """
        Ensure the email is not already registered.
        """
        email_lower = value.lower()
        if User.objects.filter(email=email_lower).exists():
            raise serializers.ValidationError(
                'A user with this email address already exists.'
            )
        return email_lower

    def validate(self, attrs):
        """
        Validate that passwords match and meet Django's password validators.
        """
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({
                'password': 'Passwords do not match.',
                'confirm_password': 'Passwords do not match.',
            })

        # Run Django's password validators
        password = attrs.get('password')
        if password:
            try:
                validate_password(password)
            except serializers.ValidationError as e:
                raise serializers.ValidationError({'password': list(e.messages)})

        return attrs

    def create(self, validated_data):
        """
        Create a new user with a hashed password.
        Removes confirm_password before creation.
        """
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)

        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()

        logger.info(f'New user registered: {user.email}')
        return user


# ============================================================================
# User Profile & Display
# ============================================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Full user serializer for read operations.

    Exposes all user fields except password. Used for detailed
    user representations in API responses.
    """
    full_name = serializers.SerializerMethodField(read_only=True)
    user_addresses = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'avatar', 'is_verified', 'is_active', 'is_staff',
            'is_superuser', 'date_joined', 'last_login', 'addresses',
            'reward_points', 'user_addresses',
        ]
        read_only_fields = [
            'id', 'email', 'is_verified', 'is_active', 'is_staff',
            'is_superuser', 'date_joined', 'last_login', 'reward_points',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_user_addresses(self, obj):
        """
        Return the user's addresses using HyperlinkedModelSerializer
        style for nested read-only relations.
        """
        from users.models import UserAddress
        from users.serializers import UserAddressSerializer

        addresses = UserAddress.objects.filter(user=obj)
        return UserAddressSerializer(addresses, many=True, context=self.context).data


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile information.

    Only exposes editable fields: first_name, last_name, phone, avatar.
    """
    full_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone', 'avatar', 'full_name']
        read_only_fields = ['id', 'full_name']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def validate_avatar(self, value):
        """
        Validate the uploaded avatar image.
        """
        from core.utils import validate_image
        if value:
            try:
                validate_image(value)
            except ValueError as e:
                raise serializers.ValidationError(str(e))
        return value


# ============================================================================
# Address Management
# ============================================================================

class UserAddressSerializer(serializers.ModelSerializer):
    """
    Serializer for full address CRUD operations.
    """
    full_address = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = 'users.UserAddress'
        fields = [
            'id', 'label', 'first_name', 'last_name', 'phone',
            'address_line_1', 'address_line_2', 'city', 'state',
            'postal_code', 'country', 'is_default', 'full_address',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_address']

    def get_full_address(self, obj):
        return obj.get_full_address()

    def validate(self, attrs):
        """
        Ensure required address fields are present.
        """
        if not attrs.get('address_line_1'):
            raise serializers.ValidationError({
                'address_line_1': 'Address line 1 is required.'
            })
        if not attrs.get('city'):
            raise serializers.ValidationError({
                'city': 'City is required.'
            })
        if not attrs.get('postal_code'):
            raise serializers.ValidationError({
                'postal_code': 'Postal code is required.'
            })
        return attrs


# ============================================================================
# Password Management
# ============================================================================

class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing an authenticated user's password.

    Validates the old password before allowing the change.
    """
    old_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text='Minimum 8 characters.',
    )
    confirm_new_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate_old_password(self, value):
        """
        Verify the old password is correct.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        """
        Validate new passwords match and meet strength requirements.
        """
        if attrs.get('new_password') != attrs.get('confirm_new_password'):
            raise serializers.ValidationError({
                'new_password': 'New passwords do not match.',
                'confirm_new_password': 'New passwords do not match.',
            })

        # Ensure new password differs from old password
        if attrs.get('old_password') == attrs.get('new_password'):
            raise serializers.ValidationError({
                'new_password': 'New password must be different from the current password.',
            })

        # Run Django's password validators on new password
        new_password = attrs.get('new_password')
        if new_password:
            try:
                validate_password(new_password, self.context['request'].user)
            except serializers.ValidationError as e:
                raise serializers.ValidationError({'new_password': list(e.messages)})

        return attrs

    def save(self):
        """
        Set the new password for the user.
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        logger.info(f'Password changed for user: {user.email}')
        return user


# ============================================================================
# JWT Token
# ============================================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that adds user data to the token response
    and verifies the user account is active.
    """

    def validate(self, attrs):
        """
        Validate credentials and return tokens with user info.

        Raises:
            ValidationError: If the user account is inactive.
        """
        data = super().validate(attrs)

        # Check if user is active
        if not self.user.is_active:
            raise serializers.ValidationError({
                'detail': 'This account has been deactivated. Please contact support.'
            })

        # Append user data to the response
        data.update({
            'user': {
                'id': self.user.id,
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
                'full_name': self.user.get_full_name(),
                'is_verified': self.user.is_verified,
                'is_staff': self.user.is_staff,
                'avatar': self.user.avatar.url if self.user.avatar else None,
            }
        })

        return data


# ============================================================================
# Password Reset
# ============================================================================

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset email.
    """
    email = serializers.EmailField(
        help_text='The email address associated with your account.',
    )

    def validate_email(self, value):
        """
        Verify the email exists in the system.

        Note: We do NOT reveal whether the email exists to prevent
        user enumeration attacks. We always return success.
        """
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming a password reset with token.

    Accepts uid (base64-encoded user ID), token, and the new password.
    """
    uid = serializers.CharField(
        help_text='Base64-encoded user ID.',
    )
    token = serializers.CharField(
        help_text='Password reset token.',
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text='Minimum 8 characters.',
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate(self, attrs):
        """
        Validate passwords match, then verify the reset token.
        """
        if attrs.get('new_password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({
                'new_password': 'Passwords do not match.',
                'confirm_password': 'Passwords do not match.',
            })

        # Run Django's password validators
        new_password = attrs.get('new_password')
        if new_password:
            try:
                validate_password(new_password)
            except serializers.ValidationError as e:
                raise serializers.ValidationError({'new_password': list(e.messages)})

        # Verify the token using Django's default token generator
        try:
            from django.utils.encoding import force_str
            from django.utils.http import urlsafe_base64_decode
            from django.contrib.auth.tokens import default_token_generator

            uid_decoded = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid_decoded)

            if not default_token_generator.check_token(user, attrs['token']):
                raise serializers.ValidationError({
                    'token': 'Invalid or expired password reset token.'
                })

            if not user.is_active:
                raise serializers.ValidationError({
                    'token': 'This account has been deactivated.'
                })

            self.context['reset_user'] = user

        except (ValueError, TypeError, User.DoesNotExist) as e:
            raise serializers.ValidationError({
                'token': 'Invalid or expired password reset token.'
            })

        return attrs

    def save(self):
        """
        Set the new password for the user identified by the reset token.
        """
        user = self.context['reset_user']
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        logger.info(f'Password reset completed for user: {user.email}')
        return user
