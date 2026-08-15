import logging
from decimal import Decimal

from rest_framework import serializers

from core.exceptions import NotFoundError, BadRequestError
from core.utils import format_currency
from .models import Order, OrderItem, OrderStatus

logger = logging.getLogger('maison_api')


# ============================================================================
# Order Item Serializer
# ============================================================================

class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for order items (line items within an order).
    """

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_id',
            'product_name',
            'product_price',
            'quantity',
            'size',
            'color',
            'image',
            'total',
            'created_at',
        ]


# ============================================================================
# Order List Serializer
# ============================================================================

class OrderListSerializer(serializers.ModelSerializer):
    """
    Light-weight serializer for order listing.
    Includes a computed item_count field.
    """

    item_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    formatted_total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'status',
            'status_display',
            'total',
            'formatted_total',
            'currency',
            'item_count',
            'created_at',
        ]

    def get_formatted_total(self, obj):
        return format_currency(obj.total, obj.currency)


# ============================================================================
# Order Detail Serializer
# ============================================================================

class OrderDetailSerializer(serializers.ModelSerializer):
    """
    Full order serializer with nested items and address details.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    coupon_code = serializers.CharField(
        source='coupon.code',
        read_only=True,
        default=None,
    )
    coupon_discount_type = serializers.CharField(
        source='coupon.get_type_display',
        read_only=True,
        default=None,
    )
    formatted_subtotal = serializers.SerializerMethodField()
    formatted_discount = serializers.SerializerMethodField()
    formatted_shipping = serializers.SerializerMethodField()
    formatted_tax = serializers.SerializerMethodField()
    formatted_total = serializers.SerializerMethodField()
    is_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'user',
            'status',
            'status_display',
            'subtotal',
            'formatted_subtotal',
            'discount_amount',
            'formatted_discount',
            'shipping_cost',
            'formatted_shipping',
            'tax_amount',
            'formatted_tax',
            'total',
            'formatted_total',
            'currency',
            'coupon',
            'coupon_code',
            'coupon_discount_type',
            'shipping_address',
            'billing_address',
            'payment_method',
            'payment_id',
            'paid_at',
            'is_paid',
            'notes',
            'tracking_number',
            'item_count',
            'items',
            'created_at',
            'updated_at',
        ]

    def get_formatted_subtotal(self, obj):
        return format_currency(obj.subtotal, obj.currency)

    def get_formatted_discount(self, obj):
        return format_currency(obj.discount_amount, obj.currency)

    def get_formatted_shipping(self, obj):
        return format_currency(obj.shipping_cost, obj.currency)

    def get_formatted_tax(self, obj):
        return format_currency(obj.tax_amount, obj.currency)

    def get_formatted_total(self, obj):
        return format_currency(obj.total, obj.currency)


# ============================================================================
# Order Create Serializer
# ============================================================================

class OrderCreateSerializer(serializers.Serializer):
    """
    Serializer for creating an order from the user's cart.
    Validates that addresses have required fields.
    """

    shipping_address = serializers.JSONField()
    billing_address = serializers.JSONField(required=False, default=None)
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    REQUIRED_ADDRESS_FIELDS = [
        'first_name', 'last_name', 'address_line_1',
        'city', 'postal_code', 'country',
    ]

    def validate_shipping_address(self, value):
        if not isinstance(value, dict):
            raise BadRequestError('Shipping address must be a JSON object.')
        missing = [
            f for f in self.REQUIRED_ADDRESS_FIELDS
            if not value.get(f)
        ]
        if missing:
            raise serializers.ValidationError(
                f'Missing required shipping address fields: {", ".join(missing)}'
            )
        return value

    def validate_billing_address(self, value):
        if value is None:
            return value
        if not isinstance(value, dict):
            raise BadRequestError('Billing address must be a JSON object.')
        missing = [
            f for f in self.REQUIRED_ADDRESS_FIELDS
            if not value.get(f)
        ]
        if missing:
            raise serializers.ValidationError(
                f'Missing required billing address fields: {", ".join(missing)}'
            )
        return value

    def validate_coupon_code(self, value):
        if value:
            value = value.strip()
        return value

    def create(self, validated_data):
        from .services import OrderService
        from cart.models import Cart, CartItem

        user = self.context['request'].user
        shipping_address = validated_data['shipping_address']
        billing_address = validated_data.get('billing_address') or shipping_address
        coupon_code = validated_data.get('coupon_code') or None

        # Get the user's cart
        try:
            cart = Cart.objects.filter(user=user).last()
            if not cart:
                raise BadRequestError('No active cart found.')
        except Exception:
            raise BadRequestError('No active cart found.')

        cart_items = cart.items.all()
        if not cart_items.exists():
            raise BadRequestError('Your cart is empty.')

        # Create the order
        order = OrderService.create_order(
            user=user,
            cart_items=cart_items,
            shipping_address=shipping_address,
            billing_address=billing_address,
            coupon_code=coupon_code,
        )

        # Clear the cart after successful order creation
        cart.items.all().delete()
        if cart.coupon:
            cart.coupon = None
            cart.coupon_discount = Decimal('0.00')
            cart.save(update_fields=['coupon', 'coupon_discount', 'updated_at'])

        if validated_data.get('notes'):
            order.notes = validated_data['notes']
            order.save(update_fields=['notes', 'updated_at'])

        return order

    def to_representation(self, instance):
        return OrderDetailSerializer(instance, context=self.context).data


# ============================================================================
# Order Status Update Serializer
# ============================================================================

class OrderStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating an order's status.
    Validates that the transition is allowed.
    """

    status = serializers.CharField()
    tracking_number = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
    )

    def validate_status(self, value):
        valid = [s[0] for s in OrderStatus.CHOICES]
        if value.upper() not in valid:
            raise serializers.ValidationError(
                f'Invalid status. Must be one of: {", ".join(valid)}'
            )
        return value.upper()

    def validate(self, attrs):
        order = self.context.get('order')
        if order and not order.can_transition_to(attrs['status']):
            raise serializers.ValidationError(
                f'Cannot transition from {order.status} to {attrs["status"]}'
            )
        return attrs


# ============================================================================
# Order Cancel Serializer
# ============================================================================

class OrderCancelSerializer(serializers.Serializer):
    """
    Serializer for cancelling an order.
    """

    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
    )


class AdminOrderDetailSerializer(OrderDetailSerializer):
    """
    Extended order detail serializer for admin use.
    Includes user email for easier management.
    """

    user_email = serializers.EmailField(
        source='user.email',
        read_only=True,
        default=None,
    )
    user_name = serializers.SerializerMethodField()

    class Meta(OrderDetailSerializer.Meta):
        fields = OrderDetailSerializer.Meta.fields + [
            'user_email',
            'user_name',
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return 'Guest'
