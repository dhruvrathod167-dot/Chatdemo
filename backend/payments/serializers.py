from rest_framework import serializers

from .models import PaymentTransaction


class PaymentIntentSerializer(serializers.Serializer):
    """Request serializer for creating a payment intent."""
    order_id = serializers.UUIDField(help_text='The order UUID to pay for.')
    provider = serializers.ChoiceField(
        choices=['STRIPE', 'RAZORPAY', 'PAYPAL'],
        help_text='Payment provider to use.',
    )
    currency = serializers.CharField(
        default='USD',
        help_text='ISO 4217 currency code.',
    )


class PaymentVerifySerializer(serializers.Serializer):
    """Request serializer for verifying/confirming a payment."""
    transaction_id = serializers.UUIDField(
        help_text='The PaymentTransaction UUID.',
    )
    provider = serializers.ChoiceField(
        choices=['STRIPE', 'RAZORPAY', 'PAYPAL'],
    )
    # Provider-specific fields
    payment_intent_id = serializers.CharField(
        required=False,
        help_text='Stripe: the PaymentIntent ID.',
    )
    razorpay_payment_id = serializers.CharField(
        required=False,
        help_text='Razorpay: the payment_id from checkout.',
    )
    razorpay_signature = serializers.CharField(
        required=False,
        help_text='Razorpay: HMAC-SHA256 signature.',
    )
    paypal_order_id = serializers.CharField(
        required=False,
        help_text='PayPal: the order ID to capture.',
    )


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Read-only serializer for payment transaction records."""

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'order', 'provider', 'status', 'currency',
            'amount', 'provider_payment_id', 'provider_order_id',
            'error_message', 'created_at', 'updated_at',
        ]
        read_only_fields = fields
