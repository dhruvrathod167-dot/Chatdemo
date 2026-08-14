import uuid

from django.conf import settings
from django.db import models

AUTH_USER_MODEL = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')


class PaymentTransaction(models.Model):
    """
    Records every payment attempt (Stripe, Razorpay, PayPal).
    Stores the provider-specific identifiers for reconciliation
    and refund processing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='payment_transactions',
        verbose_name='Order',
    )
    user = models.ForeignKey(
        AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_transactions',
        verbose_name='User',
    )
    PROVIDER_STRIPE = 'STRIPE'
    PROVIDER_RAZORPAY = 'RAZORPAY'
    PROVIDER_PAYPAL = 'PAYPAL'
    PROVIDER_CHOICES = [
        (PROVIDER_STRIPE, 'Stripe'),
        (PROVIDER_RAZORPAY, 'Razorpay'),
        (PROVIDER_PAYPAL, 'PayPal'),
    ]
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        verbose_name='Payment Provider',
    )
    STATUS_PENDING = 'PENDING'
    STATUS_PROCESSING = 'PROCESSING'
    STATUS_SUCCESS = 'SUCCESS'
    STATUS_FAILED = 'FAILED'
    STATUS_REFUNDED = 'REFUNDED'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_SUCCESS, 'Success'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_REFUNDED, 'Refunded'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
        verbose_name='Status',
    )
    currency = models.CharField(
        max_length=3, default='USD', verbose_name='Currency'
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name='Amount'
    )
    provider_payment_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name='Provider Payment ID',
        help_text='e.g. Stripe PaymentIntent ID, Razorpay payment_id',
    )
    provider_order_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Provider Order ID',
        help_text='e.g. Razorpay order_id, PayPal order_id',
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Provider Metadata',
    )
    raw_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Raw Provider Response',
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='Error Message',
    )
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True, verbose_name='Updated At'
    )

    class Meta:
        db_table = 'payment_transactions'
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['order', 'status']),
        ]

    def __str__(self):
        return f'{self.provider} {self.status} — {self.currency} {self.amount}'
