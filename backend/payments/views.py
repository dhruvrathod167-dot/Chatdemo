import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from core.permissions import IsOwner
from orders.models import Order
from .models import PaymentTransaction
from .serializers import (
    PaymentIntentSerializer,
    PaymentTransactionSerializer,
    PaymentVerifySerializer,
)
from .services import PaymentService

logger = logging.getLogger('maison_api')


FRONTEND_URL = 'http://localhost:3000'


class CreatePaymentView(APIView):
    """
    Create a payment intent/session with the chosen provider.

    POST /api/payments/create/
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Payments'],
        request=PaymentIntentSerializer,
        responses={200: PaymentTransactionSerializer},
    )
    def post(self, request):
        serializer = PaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data['order_id']
        provider = serializer.validated_data['provider']
        currency = serializer.validated_data.get('currency', 'USD')

        try:
            order = Order.objects.get(pk=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.status != 'PENDING_PAYMENT':
            return Response(
                {'error': f'Order status is {order.status}; cannot pay.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = PaymentService()
        try:
            result = service.create_payment(
                order=order,
                provider=provider,
                currency=currency,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(f'Payment creation failed: {exc}', exc_info=True)
            return Response(
                {'error': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class VerifyPaymentView(APIView):
    """
    Verify and confirm a payment after the client completes
    the provider's checkout flow.

    POST /api/payments/verify/
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Payments'],
        request=PaymentVerifySerializer,
        responses={200: PaymentTransactionSerializer},
    )
    def post(self, request):
        serializer = PaymentVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        transaction_id = data['transaction_id']
        provider = data['provider']

        try:
            txn = PaymentTransaction.objects.get(
                pk=transaction_id, user=request.user
            )
        except PaymentTransaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        service = PaymentService()
        try:
            result = service.verify_payment(
                transaction=txn,
                provider=provider,
                payload=data,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(f'Payment verification failed: {exc}', exc_info=True)
            return Response(
                {'error': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class StripeWebhookView(APIView):
    """
    Stripe webhook endpoint for async payment events.

    POST /api/payments/webhooks/stripe/
    """
    permission_classes = []  # Verified via webhook signature

    def post(self, request):
        service = PaymentService()
        try:
            result = service.handle_stripe_webhook(request.data, request.META)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(f'Stripe webhook error: {exc}', exc_info=True)
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class RazorpayWebhookView(APIView):
    """
    Razorpay webhook endpoint.

    POST /api/payments/webhooks/razorpay/
    """
    permission_classes = []

    def post(self, request):
        service = PaymentService()
        try:
            result = service.handle_razorpay_webhook(request.data, request.META)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(f'Razorpay webhook error: {exc}', exc_info=True)
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PaymentHistoryView(APIView):
    """
    List payment transactions for the authenticated user.

    GET /api/payments/history/
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Payments'],
        responses={200: PaymentTransactionSerializer(many=True)},
    )
    def get(self, request):
        txns = PaymentTransaction.objects.filter(
            user=request.user
        ).select_related('order').order_by('-created_at')
        serializer = PaymentTransactionSerializer(txns, many=True)
        return Response(serializer.data)
