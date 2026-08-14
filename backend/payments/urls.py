from django.urls import path

from .views import (
    CreatePaymentView,
    VerifyPaymentView,
    StripeWebhookView,
    RazorpayWebhookView,
    PaymentHistoryView,
)

app_name = 'payments'

urlpatterns = [
    path('create/', CreatePaymentView.as_view(), name='payment-create'),
    path('verify/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('webhooks/razorpay/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
]