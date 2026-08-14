from decimal import Decimal

from rest_framework import serializers
from rest_framework.fields import empty

from cart.models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for cart item representation.
    
    Includes computed line_total field.
    """
    line_total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = CartItem
        fields = [
            'id', 'product_id', 'product_name', 'product_image',
            'product_price', 'quantity', 'size', 'color',
            'line_total', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'product_name', 'product_image', 'product_price',
            'line_total', 'created_at', 'updated_at',
        ]

    def validate_quantity(self, value):
        """
        Ensure quantity is at least 1.
        """
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        if value > 99:
            raise serializers.ValidationError('Quantity cannot exceed 99 per item.')
        return value


class CartItemCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for adding a new item to the cart.
    
    On create, fetches product details from the products app
    to populate name, image, and price.
    """
    class Meta:
        model = CartItem
        fields = ['product_id', 'quantity', 'size', 'color']

    def validate_quantity(self, value):
        """
        Ensure quantity is at least 1.
        """
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        if value > 99:
            raise serializers.ValidationError('Quantity cannot exceed 99 per item.')
        return value

    def validate(self, attrs):
        """
        Fetch product details from the products app to validate
        the product exists and get its current name, image, and price.
        """
        product_id = attrs.get('product_id')
        if not product_id:
            raise serializers.ValidationError({'product_id': 'Product ID is required.'})

        # Lazy import to avoid issues when products app isn't ready
        try:
            from products.models import Product
            product = Product.objects.get(pk=product_id)
        except ImportError:
            raise serializers.ValidationError(
                {'product_id': 'Product catalog is currently unavailable.'}
            )
        except Product.DoesNotExist:
            raise serializers.ValidationError(
                {'product_id': f'Product with ID "{product_id}" does not exist.'}
            )

        # Validate the product is active/published
        if hasattr(product, 'is_active') and not product.is_active:
            raise serializers.ValidationError(
                {'product_id': 'This product is no longer available.'}
            )

        # Validate the product has a price
        price = getattr(product, 'price', None) or getattr(product, 'sale_price', None)
        if price is None:
            raise serializers.ValidationError(
                {'product_id': 'This product does not have a valid price.'}
            )

        # Validate size and color if the product has variants
        size = attrs.get('size', '')
        color = attrs.get('color', '')

        if hasattr(product, 'available_sizes') and product.available_sizes:
            available_sizes = product.available_sizes
            if isinstance(available_sizes, str):
                available_sizes = [s.strip() for s in available_sizes.split(',')]
            if size and size not in available_sizes:
                raise serializers.ValidationError(
                    {'size': f'Size "{size}" is not available for this product.'}
                )

        if hasattr(product, 'available_colors') and product.available_colors:
            available_colors = product.available_colors
            if isinstance(available_colors, str):
                available_colors = [c.strip() for c in available_colors.split(',')]
            if color and color not in available_colors:
                raise serializers.ValidationError(
                    {'color': f'Color "{color}" is not available for this product.'}
                )

        # Store product data on the instance for use in create()
        self._product = product
        return attrs


class CartItemUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating a cart item's quantity.
    """
    quantity = serializers.IntegerField(
        min_value=1,
        max_value=99,
        help_text='New quantity (1-99).',
    )

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        if value > 99:
            raise serializers.ValidationError('Quantity cannot exceed 99 per item.')
        return value


class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for the full cart with nested items and computed totals.
    """
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    coupon_discount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    item_count = serializers.IntegerField(read_only=True)
    coupon_code = serializers.CharField(
        source='coupon.code',
        read_only=True,
        default=None,
    )

    class Meta:
        model = Cart
        fields = [
            'id', 'items', 'subtotal', 'coupon_discount',
            'total', 'item_count', 'coupon_code',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class CouponApplySerializer(serializers.Serializer):
    """
    Serializer for applying a coupon code to the cart.
    """
    code = serializers.CharField(
        max_length=30,
        help_text='The coupon code to apply.',
    )

    def validate_code(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Coupon code is required.')
        return value.strip().upper()


class CartMergeSerializer(serializers.Serializer):
    """
    Serializer for merging a session cart into the authenticated user's cart.
    """
    session_id = serializers.CharField(
        max_length=255,
        help_text='The session ID of the anonymous cart to merge.',
    )

    def validate_session_id(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Session ID is required.')
        return value.strip()
