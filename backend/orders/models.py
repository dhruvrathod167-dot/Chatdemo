import uuid
import logging

from django.conf import settings
from django.db import models

from core.utils import generate_order_number

logger = logging.getLogger('maison_api')

AUTH_USER_MODEL = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')


class OrderStatus:
    """Order status constants."""
    PENDING = 'PENDING'
    CONFIRMED = 'CONFIRMED'
    PROCESSING = 'PROCESSING'
    SHIPPED = 'SHIPPED'
    DELIVERED = 'DELIVERED'
    CANCELLED = 'CANCELLED'
    REFUNDED = 'REFUNDED'

    CHOICES = [
        (PENDING, 'Pending'),
        (CONFIRMED, 'Confirmed'),
        (PROCESSING, 'Processing'),
        (SHIPPED, 'Shipped'),
        (DELIVERED, 'Delivered'),
        (CANCELLED, 'Cancelled'),
        (REFUNDED, 'Refunded'),
    ]

    # Valid status transitions (from_status -> [to_statuses])
    VALID_TRANSITIONS = {
        PENDING: [CONFIRMED, CANCELLED],
        CONFIRMED: [PROCESSING, CANCELLED],
        PROCESSING: [SHIPPED, CANCELLED],
        SHIPPED: [DELIVERED],
        DELIVERED: [REFUNDED],
        CANCELLED: [],
        REFUNDED: [],
    }

    # Terminal statuses (no further transitions allowed)
    TERMINAL = {CANCELLED, REFUNDED}


class Order(models.Model):
    """
    Order model for the MAISON eCommerce platform.

    Stores order header information including shipping/billing addresses,
    payment details, and order totals.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(
        unique=True,
        db_index=True,
        max_length=50,
        verbose_name='Order Number',
    )
    user = models.ForeignKey(
        AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='orders',
        verbose_name='User',
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.CHOICES,
        default=OrderStatus.PENDING,
        db_index=True,
        verbose_name='Status',
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Subtotal',
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name='Discount Amount',
    )
    shipping_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name='Shipping Cost',
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name='Tax Amount',
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Total',
    )
    currency = models.CharField(
        max_length=3,
        default='USD',
        verbose_name='Currency',
    )
    coupon = models.ForeignKey(
        'coupons.Coupon',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='orders',
        verbose_name='Coupon',
    )
    shipping_address = models.JSONField(
        verbose_name='Shipping Address',
    )
    billing_address = models.JSONField(
        verbose_name='Billing Address',
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Payment Method',
    )
    payment_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Payment ID',
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Paid At',
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Order Notes',
    )
    tracking_number = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Tracking Number',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)

    @property
    def item_count(self):
        """Return the total number of items in the order."""
        return self.items.aggregate(count=models.Sum('quantity'))['count'] or 0

    @property
    def is_paid(self):
        """Return True if the order has been paid."""
        return bool(self.paid_at)

    def can_transition_to(self, new_status):
        """Check if this order can transition to the given status."""
        allowed = OrderStatus.VALID_TRANSITIONS.get(self.status, [])
        return new_status in allowed


class OrderItem(models.Model):
    """
    Individual item within an order.

    Stores denormalized product data so that historical
    orders remain accurate even after product changes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Order',
    )
    product_id = models.CharField(
        max_length=255,
        verbose_name='Product ID',
    )
    product_name = models.CharField(
        max_length=500,
        verbose_name='Product Name',
    )
    product_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Product Price',
    )
    quantity = models.PositiveIntegerField(
        verbose_name='Quantity',
    )
    size = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Size',
    )
    color = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Color',
    )
    image = models.URLField(
        blank=True,
        verbose_name='Product Image URL',
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Line Total',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')

    class Meta:
        db_table = 'order_items'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.product_name} x{self.quantity} ({self.order.order_number})'

    def save(self, *args, **kwargs):
        self.total = self.product_price * self.quantity
        super().save(*args, **kwargs)
