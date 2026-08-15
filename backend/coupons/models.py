import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models


class Coupon(models.Model):
    """
    Coupon model for discount codes.
    
    Supports three coupon types:
    - PERCENTAGE: Deducts a percentage of the order total.
    - FIXED: Deducts a fixed amount from the order total.
    - FREE_SHIPPING: Removes shipping cost from the order.
    
    Includes usage limits, validity periods, and minimum order requirements.
    """

    COUPON_TYPES = [
        ('PERCENTAGE', 'Percentage'),
        ('FIXED', 'Fixed Amount'),
        ('FREE_SHIPPING', 'Free Shipping'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        verbose_name='Coupon Code',
        help_text='Unique code entered by customers (e.g., SAVE20).',
    )
    type = models.CharField(
        max_length=20,
        choices=COUPON_TYPES,
        verbose_name='Coupon Type',
        help_text='PERCENTAGE, FIXED, or FREE_SHIPPING.',
    )
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Discount Value',
        help_text=(
            'For PERCENTAGE: the percentage (e.g., 20.00 for 20%). '
            'For FIXED: the dollar amount (e.g., 50.00 for $50 off). '
            'For FREE_SHIPPING: set to 0.'
        ),
    )
    min_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Minimum Order Amount',
        help_text='Minimum order subtotal required to use this coupon.',
    )
    max_discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Maximum Discount Amount',
        help_text=(
            'Cap the discount at this amount. '
            'Useful for percentage coupons to prevent excessive discounts.'
        ),
    )
    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Usage Limit',
        help_text='Maximum number of times this coupon can be used across all users.',
    )
    used_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Times Used',
    )
    valid_from = models.DateTimeField(
        verbose_name='Valid From',
        help_text='When the coupon becomes active.',
    )
    valid_until = models.DateTimeField(
        verbose_name='Valid Until',
        help_text='When the coupon expires.',
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active',
        help_text='Inactive coupons cannot be used.',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'coupons'
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} ({self.get_type_display()})'

    def clean(self):
        """
        Validate the coupon before saving.
        
        Rules:
        - value must be > 0
        - valid_from must be before valid_until
        - If type is PERCENTAGE, value must be <= 100
        """
        super().clean()

        # Value must be positive
        if self.value is not None and self.value <= 0:
            raise ValidationError({
                'value': 'Discount value must be greater than 0.'
            })

        # FREE_SHIPPING can have a value of 0
        if self.type == 'FREE_SHIPPING':
            if self.value and self.value > 0:
                raise ValidationError({
                    'value': 'FREE_SHIPPING coupons should have a value of 0.'
                })
        else:
            if self.value is None or self.value <= 0:
                raise ValidationError({
                    'value': 'Discount value must be greater than 0.'
                })

        # Percentage cannot exceed 100
        if self.type == 'PERCENTAGE' and self.value > Decimal('100.00'):
            raise ValidationError({
                'value': 'Percentage discount cannot exceed 100%.'
            })

        # Date validation
        if self.valid_from and self.valid_until:
            if self.valid_from >= self.valid_until:
                raise ValidationError({
                    'valid_until': 'Valid until date must be after the valid from date.'
                })

    def calculate_discount(self, order_amount):
        """
        Calculate the discount amount for a given order subtotal.

        Args:
            order_amount (Decimal): The order subtotal before discount.

        Returns:
            Decimal: The calculated discount amount.
        """
        if self.type == 'PERCENTAGE':
            discount = (order_amount * self.value) / Decimal('100')
        elif self.type == 'FIXED':
            discount = self.value
        elif self.type == 'FREE_SHIPPING':
            discount = Decimal('0.00')  # Handled at checkout level
        else:
            discount = Decimal('0.00')

        # Cap at max_discount_amount if set
        if self.max_discount_amount and discount > self.max_discount_amount:
            discount = self.max_discount_amount

        return discount

    def is_valid_for_use(self, order_amount=None):
        """
        Check if this coupon can be used.

        Args:
            order_amount (Decimal, optional): The order subtotal to check
                against min_order_amount.

        Returns:
            tuple[bool, str]: (is_valid, reason)
        """
        from django.utils import timezone
        now = timezone.now()

        if not self.is_active:
            return False, 'This coupon is no longer active.'

        if now < self.valid_from:
            return False, 'This coupon is not yet valid.'

        if now > self.valid_until:
            return False, 'This coupon has expired.'

        if self.usage_limit and self.used_count >= self.usage_limit:
            return False, 'This coupon has reached its usage limit.'

        if order_amount is not None and self.min_order_amount:
            if order_amount < self.min_order_amount:
                return False, (
                    f'Minimum order amount of {self.min_order_amount} '
                    f'is required to use this coupon.'
                )

        return True, ''
