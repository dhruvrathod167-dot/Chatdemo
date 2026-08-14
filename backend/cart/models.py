import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum, F, DecimalField


AUTH_USER_MODEL = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')


class Cart(models.Model):
    """
    Shopping cart model.

    Supports both authenticated users (user FK) and anonymous
    sessions (session_id). The unique_together constraint ensures
    one cart per user/session combination.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='carts',
        verbose_name='User',
        help_text='Set when the cart belongs to an authenticated user.',
    )
    session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Session ID',
        help_text='Set for anonymous/visitor carts.',
    )
    coupon = models.ForeignKey(
        'coupons.Coupon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='carts',
        verbose_name='Applied Coupon',
    )
    coupon_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Coupon Discount Amount',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'carts'
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'
        ordering = ['-updated_at']
        unique_together = [['user', 'session_id']]
        constraints = [
            models.CheckConstraint(
                check=models.Q(user__isnull=False) | models.Q(session_id__isnull=False),
                name='cart_must_have_user_or_session',
            )
        ]

    def __str__(self):
        if self.user:
            return f'Cart ({self.user.email})'
        return f'Cart (session: {self.session_id})'

    def get_total(self):
        """
        Calculate the total price of all items in the cart.

        Returns:
            Decimal: Total price.
        """
        total = self.items.aggregate(
            total=Sum(
                F('product_price') * F('quantity'),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            )
        )['total']
        return total or Decimal('0.00')

    def get_item_count(self):
        """
        Return the total number of individual items in the cart.

        Returns:
            int: Sum of all item quantities.
        """
        count = self.items.aggregate(count=Sum('quantity'))['count']
        return count or 0
    
    def get_subtotal(self):
        """
        Return the subtotal (total before coupon discount).
        """
        return self.get_total()
    
    def get_discount_total(self):
        """
        Return the applied coupon discount amount.
        """
        return self.coupon_discount
    
    def get_grand_total(self):
        """
        Return the grand total (subtotal minus coupon discount).
        """
        subtotal = self.get_subtotal()
        discount = self.get_discount_total()
        return max(subtotal - discount, Decimal('0.00'))


class CartItem(models.Model):
    """
    Individual item within a shopping cart.

    Stores product details as denormalized fields (name, image, price)
    to preserve historical pricing and avoid foreign key dependencies.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Cart',
    )
    product_id = models.CharField(max_length=255, verbose_name='Product ID')
    product_name = models.CharField(max_length=255, verbose_name='Product Name')
    product_image = models.URLField(blank=True, verbose_name='Product Image URL')
    product_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Product Price',
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name='Quantity')
    size = models.CharField(max_length=20, blank=True, default='', verbose_name='Size')
    color = models.CharField(max_length=50, blank=True, default='', verbose_name='Color')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'cart_items'
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        ordering = ['created_at']
        unique_together = [['cart', 'product_id', 'size', 'color']]

    def __str__(self):
        return f'{self.product_name} x{self.quantity} ({self.cart})'

    def get_line_total(self):
        """
        Calculate the total price for this line item (price × quantity).

        Returns:
            Decimal: Line total.
        """
        return self.product_price * self.quantity
