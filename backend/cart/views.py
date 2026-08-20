import logging
import uuid
from decimal import Decimal

from rest_framework import status, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter

from core.exceptions import NotFoundError, BadRequestError, UnauthorizedError
from core.permissions import IsAuthenticatedAndActive
from cart.models import Cart, CartItem
from cart.serializers import (
    CartSerializer,
    CartItemSerializer,
    CartItemCreateSerializer,
    CartItemUpdateSerializer,
    CouponApplySerializer,
    CartMergeSerializer,
)

logger = logging.getLogger('maison_api')


# ============================================================================
# Cart View
# ============================================================================

class CartView(APIView):
    """
    Retrieve the current user's cart or add an item to it.
    
    Supports both authenticated users and anonymous sessions.
    Anonymous sessions use the X-Session-ID header.
    """
    permission_classes = [AllowAny]

    def get_cart(self, request):
        """
        Retrieve or create the cart for the current request.
        
        For authenticated users, uses the user's cart.
        For anonymous users, uses the session_id from the X-Session-ID header.
        
        Args:
            request: The HTTP request.
            
        Returns:
            Cart instance.
        """
        user = request.user if request.user and request.user.is_authenticated else None
        session_id = request.headers.get('X-Session-ID', '').strip()

        if not user and not session_id:
            session_id = str(uuid.uuid4())

        cart, created = Cart.objects.get_or_create(
            user=user,
            session_id=session_id if not user else None,
        )
        return cart

    @extend_schema(
        operation_id='cart_retrieve',
        summary='Get Cart',
        description=(
            'Retrieve the current shopping cart with all items and computed totals. '
            'For authenticated users, returns the user\'s cart. '
            'For anonymous users, uses the X-Session-ID header.'
        ),
        tags=['Cart'],
        parameters=[
            OpenApiParameter(
                name='X-Session-ID',
                type=str,
                location='header',
                required=False,
                description='Session ID for anonymous carts.',
            ),
        ],
        responses={
            200: CartSerializer,
        },
    )
    def get(self, request):
        cart = self.get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        operation_id='cart_add_item',
        summary='Add Item to Cart',
        description=(
            'Add a product to the cart. If the product with the same size/color '
            'already exists, its quantity will be incremented.'
        ),
        tags=['Cart'],
        parameters=[
            OpenApiParameter(
                name='X-Session-ID',
                type=str,
                location='header',
                required=False,
                description='Session ID for anonymous carts.',
            ),
        ],
        request=CartItemCreateSerializer,
        responses={
            201: CartItemSerializer,
            400: OpenApiResponse(description='Validation error or product unavailable.'),
        },
    )
    def post(self, request):
        cart = self.get_cart(request)
        serializer = CartItemCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        product = serializer._product
        validated_data = serializer.validated_data

        product_id = validated_data['product_id']
        quantity = validated_data['quantity']
        size = validated_data.get('size', '')
        color = validated_data.get('color', '')

        # Get product price (prefer sale_price over price)
        price = getattr(product, 'sale_price', None)
        if price is None:
            price = getattr(product, 'price', Decimal('0.00'))

        # Get product image
        image_url = ''
        if hasattr(product, 'images') and product.images:
            images = product.images
            if isinstance(images, list) and len(images) > 0:
                image_url = images[0]
            elif hasattr(images, 'first'):
                first_image = images.first()
                if first_image:
                    image_url = getattr(first_image, 'image', '')
                    if hasattr(image_url, 'url'):
                        image_url = image_url.url
                    else:
                        image_url = str(image_url)
        elif hasattr(product, 'featured_image') and product.featured_image:
            image_url = product.featured_image

        # Get product name
        product_name = getattr(product, 'name', str(product_id))

        # Try to update existing cart item or create a new one
        cart_item, created = CartItem.objects.update_or_create(
            cart=cart,
            product_id=product_id,
            size=size,
            color=color,
            defaults={
                'product_name': product_name,
                'product_image': image_url,
                'product_price': price,
                'quantity': quantity,
            },
        )

        if not created:
            # Item existed, update_or_create used defaults so we need to increment
            cart_item.quantity += quantity
            cart_item.save(update_fields=['quantity', 'updated_at'])

        return Response(
            CartItemSerializer(cart_item).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================================
# Cart Item Detail View
# ============================================================================

class CartItemDetailView(APIView):
    """
    Update or delete a specific cart item.
    """
    permission_classes = [AllowAny]

    def get_cart_item(self, pk, cart):
        """
        Fetch a cart item by primary key, ensuring it belongs to the given cart.
        """
        try:
            return CartItem.objects.get(pk=pk, cart=cart)
        except CartItem.DoesNotExist:
            raise NotFoundError('Cart item not found.')

    def _get_cart(self, request):
        """
        Retrieve the cart for the current request.
        """
        user = request.user if request.user and request.user.is_authenticated else None
        session_id = request.headers.get('X-Session-ID', '').strip()

        try:
            if user:
                return Cart.objects.get(user=user)
            elif session_id:
                return Cart.objects.get(session_id=session_id, user__isnull=True)
            else:
                raise NotFoundError('No cart found. Provide X-Session-ID header or authenticate.')
        except Cart.DoesNotExist:
            raise NotFoundError('No cart found. Provide X-Session-ID header or authenticate.')

    @extend_schema(
        operation_id='cart_item_update',
        summary='Update Cart Item Quantity',
        description='Update the quantity of a specific cart item.',
        tags=['Cart'],
        parameters=[
            OpenApiParameter(
                name='pk', type=str, location='path', description='Cart item UUID.'
            ),
            OpenApiParameter(
                name='X-Session-ID',
                type=str,
                location='header',
                required=False,
                description='Session ID for anonymous carts.',
            ),
        ],
        request=CartItemUpdateSerializer,
        responses={
            200: CartItemSerializer,
            404: OpenApiResponse(description='Cart item not found.'),
        },
    )
    def patch(self, request, pk):
        cart = self._get_cart(request)
        cart_item = self.get_cart_item(pk, cart)

        serializer = CartItemUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart_item.quantity = serializer.validated_data['quantity']
        cart_item.save(update_fields=['quantity', 'updated_at'])

        return Response(CartItemSerializer(cart_item).data)

    @extend_schema(
        operation_id='cart_item_delete',
        summary='Remove Cart Item',
        description='Remove a specific item from the cart.',
        tags=['Cart'],
        parameters=[
            OpenApiParameter(
                name='pk', type=str, location='path', description='Cart item UUID.'
            ),
            OpenApiParameter(
                name='X-Session-ID',
                type=str,
                location='header',
                required=False,
                description='Session ID for anonymous carts.',
            ),
        ],
        responses={
            204: OpenApiResponse(description='Cart item removed.'),
            404: OpenApiResponse(description='Cart item not found.'),
        },
    )
    def delete(self, request, pk):
        cart = self._get_cart(request)
        cart_item = self.get_cart_item(pk, cart)
        cart_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Cart Clear View
# ============================================================================

class CartClearView(APIView):
    """
    Clear all items from the cart.
    
    Also removes any applied coupon.
    """
    permission_classes = [AllowAny]

    def _get_cart(self, request):
        """
        Retrieve the cart for the current request.
        """
        user = request.user if request.user and request.user.is_authenticated else None
        session_id = request.headers.get('X-Session-ID', '').strip()

        try:
            if user:
                return Cart.objects.get(user=user)
            elif session_id:
                return Cart.objects.get(session_id=session_id, user__isnull=True)
            else:
                raise NotFoundError('No cart found.')
        except Cart.DoesNotExist:
            raise NotFoundError('No cart found.')

    @extend_schema(
        operation_id='cart_clear',
        summary='Clear Cart',
        description='Remove all items from the cart and any applied coupon.',
        tags=['Cart'],
        parameters=[
            OpenApiParameter(
                name='X-Session-ID',
                type=str,
                location='header',
                required=False,
                description='Session ID for anonymous carts.',
            ),
        ],
        responses={
            200: OpenApiResponse(
                description='Cart cleared.',
                examples=[OpenApiExample('Success', value={'message': 'Cart cleared.'})],
            ),
            404: OpenApiResponse(description='Cart not found.'),
        },
    )
    def post(self, request):
        cart = self._get_cart(request)
        cart.items.all().delete()

        # Remove coupon
        cart.coupon = None
        cart.coupon_discount = Decimal('0.00')
        cart.save(update_fields=['coupon', 'coupon_discount', 'updated_at'])

        return Response({'message': 'Cart cleared.'})


# ============================================================================
# Cart Merge View
# ============================================================================

class CartMergeView(APIView):
    """
    Merge an anonymous session cart into the authenticated user's cart.
    
    Typically called after login to preserve items added before authentication.
    If the same product/size/color exists in both carts, quantities are summed.
    """
    permission_classes = [IsAuthenticatedAndActive]

    @extend_schema(
        operation_id='cart_merge',
        summary='Merge Session Cart into User Cart',
        description=(
            'Merge an anonymous session cart into the authenticated user\'s cart. '
            'Called after login. If the same product/size/color exists in both, '
            'quantities are summed. The session cart is then deleted.'
        ),
        tags=['Cart'],
        request=CartMergeSerializer,
        responses={
            200: OpenApiResponse(
                description='Cart merged.',
                examples=[OpenApiExample('Success', value={'message': 'Cart merged.', 'items_merged': 3})],
            ),
            400: OpenApiResponse(description='Validation error.'),
            401: OpenApiResponse(description='Authentication required.'),
        },
    )
    def post(self, request):
        serializer = CartMergeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data['session_id']
        user = request.user

        # Get the session cart
        try:
            session_cart = Cart.objects.get(session_id=session_id, user__isnull=True)
        except Cart.DoesNotExist:
            raise NotFoundError('No session cart found with the provided session ID.')

        # Get or create the user's cart
        user_cart, _ = Cart.objects.get_or_create(
            user=user,
            session_id__isnull=True,
        )

        # Carry over the user cart's coupon if session cart doesn't have one
        if session_cart.coupon and not user_cart.coupon:
            user_cart.coupon = session_cart.coupon
            user_cart.coupon_discount = session_cart.coupon_discount

        # Merge items
        items_merged = 0
        for session_item in session_cart.items.all():
            user_item, created = CartItem.objects.update_or_create(
                cart=user_cart,
                product_id=session_item.product_id,
                size=session_item.size,
                color=session_item.color,
                defaults={
                    'product_name': session_item.product_name,
                    'product_image': session_item.product_image,
                    'product_price': session_item.product_price,
                    'quantity': session_item.quantity,
                },
            )

            if not created:
                user_item.quantity += session_item.quantity
                user_item.save(update_fields=['quantity', 'updated_at'])

            items_merged += 1

        # Recalculate coupon discount on the merged cart
        if user_cart.coupon:
            self._recalculate_coupon(user_cart)

        user_cart.save(update_fields=['coupon', 'coupon_discount', 'updated_at'])

        # Delete the session cart
        session_cart.delete()

        return Response({
            'message': 'Cart merged.',
            'items_merged': items_merged,
        })

    def _recalculate_coupon(self, cart):
        """
        Recalculate the coupon discount for a cart after items change.
        """
        if not cart.coupon:
            return

        coupon = cart.coupon
        subtotal = cart.get_subtotal()

        # Validate coupon is still applicable
        from django.utils import timezone
        now = timezone.now()

        if not coupon.is_active:
            cart.coupon = None
            cart.coupon_discount = Decimal('0.00')
            return

        if now < coupon.valid_from or now > coupon.valid_until:
            cart.coupon = None
            cart.coupon_discount = Decimal('0.00')
            return

        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            cart.coupon = None
            cart.coupon_discount = Decimal('0.00')
            return

        if coupon.min_order_amount and subtotal < coupon.min_order_amount:
            cart.coupon = None
            cart.coupon_discount = Decimal('0.00')
            return

        # Calculate discount
        discount = Decimal('0.00')
        if coupon.type == 'PERCENTAGE':
            discount = (subtotal * coupon.value) / Decimal('100')
        elif coupon.type == 'FIXED':
            discount = coupon.value
        elif coupon.type == 'FREE_SHIPPING':
            discount = Decimal('0.00')  # Handled separately in checkout

        # Cap at max_discount_amount
        if coupon.max_discount_amount and discount > coupon.max_discount_amount:
            discount = coupon.max_discount_amount

        cart.coupon_discount = discount


# ============================================================================
# Apply Coupon View
# ============================================================================

class ApplyCouponView(APIView):
    """
    Apply a coupon code to the cart.
    
    Removes any previously applied coupon before applying the new one.
    Validates the coupon is active, not expired, meets minimum order, etc.
    """
    permission_classes = [AllowAny]

    def _get_cart(self, request):
        """
        Retrieve the cart for the current request.
        """
        user = request.user if request.user and request.user.is_authenticated else None
        session_id = request.headers.get('X-Session-ID', '').strip()

        try:
            if user:
                return Cart.objects.get(user=user)
            elif session_id:
                return Cart.objects.get(session_id=session_id, user__isnull=True)
            else:
                raise NotFoundError('No cart found.')
        except Cart.DoesNotExist:
            raise NotFoundError('No cart found.')

    @extend_schema(
        operation_id='cart_apply_coupon',
        summary='Apply Coupon to Cart',
        description=(
            'Apply a coupon code to the cart. Removes any previously applied coupon '
            'before applying the new one. Validates the coupon is active, not expired, '
            'not over usage limit, and meets minimum order requirements.'
        ),
        tags=['Cart'],
        parameters=[
            OpenApiParameter(
                name='X-Session-ID',
                type=str,
                location='header',
                required=False,
                description='Session ID for anonymous carts.',
            ),
        ],
        request=CouponApplySerializer,
        responses={
            200: OpenApiResponse(
                description='Coupon applied.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'message': 'Coupon applied.',
                            'coupon_code': 'SAVE20',
                            'discount': '40.00',
                            'subtotal': '200.00',
                            'total': '160.00',
                        }
                    )
                ],
            ),
            400: OpenApiResponse(description='Invalid coupon code or requirements not met.'),
            404: OpenApiResponse(description='Cart not found.'),
        },
    )
    def post(self, request):
        cart = self._get_cart(request)

        serializer = CouponApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']

        # Remove previous coupon
        cart.coupon = None
        cart.coupon_discount = Decimal('0.00')

        # Find the coupon
        from coupons.models import Coupon
        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            raise BadRequestError(f'Coupon code "{code}" is not valid.')

        # Validate coupon
        from django.utils import timezone
        now = timezone.now()

        if not coupon.is_active:
            raise BadRequestError('This coupon is no longer active.')

        if now < coupon.valid_from:
            raise BadRequestError('This coupon is not yet valid.')

        if now > coupon.valid_until:
            raise BadRequestError('This coupon has expired.')

        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            raise BadRequestError('This coupon has reached its usage limit.')

        # Check minimum order amount
        subtotal = cart.get_subtotal()

        if coupon.min_order_amount and subtotal < coupon.min_order_amount:
            from core.utils import format_currency
            raise BadRequestError(
                f'Minimum order amount of {format_currency(coupon.min_order_amount)} '
                f'is required to use this coupon.'
            )

        if subtotal == Decimal('0.00'):
            raise BadRequestError('Cannot apply a coupon to an empty cart.')

        # Calculate discount
        discount = Decimal('0.00')
        if coupon.type == 'PERCENTAGE':
            discount = (subtotal * coupon.value) / Decimal('100')
        elif coupon.type == 'FIXED':
            discount = coupon.value
        elif coupon.type == 'FREE_SHIPPING':
            discount = Decimal('0.00')  # Shipping discount handled at checkout

        # Cap at max_discount_amount
        if coupon.max_discount_amount and discount > coupon.max_discount_amount:
            discount = coupon.max_discount_amount

        # Apply coupon to cart
        cart.coupon = coupon
        cart.coupon_discount = discount
        cart.save(update_fields=['coupon', 'coupon_discount', 'updated_at'])

        from core.utils import format_currency

        return Response({
            'message': 'Coupon applied.',
            'coupon_code': coupon.code,
            'discount': format_currency(discount),
            'subtotal': format_currency(subtotal),
            'total': format_currency(cart.get_grand_total()),
        })
