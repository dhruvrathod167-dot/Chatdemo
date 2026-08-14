import logging
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger("maison_api")


class PaymentService:
    """
    Service layer for payment processing.
    Supports Stripe, Razorpay, and PayPal integrations.
    Each method checks if API keys are configured before making calls.
    """

    # ========================================================================
    # Stripe
    # ========================================================================

    @staticmethod
    def create_stripe_payment_intent(order, currency="USD"):
        stripe_secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
        if not stripe_secret_key:
            raise Exception("Stripe is not configured. Missing STRIPE_SECRET_KEY.")

        import stripe
        stripe.api_key = stripe_secret_key

        try:
            amount_cents = int(order.total * 100)
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency.lower(),
                metadata={
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "user_id": str(order.user.id) if order.user else "guest",
                },
                automatic_payment_methods={"enabled": True},
            )
            logger.info(
                f"Stripe PaymentIntent created: {intent.id} for order {order.order_number}"
            )
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe PaymentIntent creation failed: {e}")
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating Stripe PaymentIntent: {e}")
            raise

    @staticmethod
    def verify_stripe_payment(payment_intent_id):
        stripe_secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
        if not stripe_secret_key:
            raise Exception("Stripe is not configured.")

        import stripe
        stripe.api_key = stripe_secret_key

        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent.status == "succeeded":
                return {
                    "verified": True,
                    "payment_intent_id": intent.id,
                    "amount": Decimal(str(intent.amount / 100)),
                    "currency": intent.currency.upper(),
                    "status": intent.status,
                    "metadata": dict(intent.metadata),
                }
            else:
                return {
                    "verified": False,
                    "payment_intent_id": intent.id,
                    "status": intent.status,
                }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe verification failed: {e}")
            raise Exception(f"Stripe verification error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error verifying Stripe payment: {e}")
            raise

    @staticmethod
    def process_webhook_stripe(payload, signature):
        stripe_webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
        if not stripe_webhook_secret:
            logger.error("Stripe webhook secret not configured.")
            return {"success": False, "error": "Webhook secret not configured."}

        import stripe
        stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, signature, stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid Stripe webhook signature.")
            return {"success": False, "error": "Invalid signature."}
        except Exception as e:
            logger.error(f"Stripe webhook parsing failed: {e}")
            return {"success": False, "error": str(e)}

        event_type = event["type"]
        logger.info(f"Stripe webhook received: {event_type}")

        try:
            if event_type == "payment_intent.succeeded":
                PaymentService._handle_stripe_payment_success(event)
            elif event_type == "payment_intent.payment_failed":
                PaymentService._handle_stripe_payment_failure(event)
            else:
                logger.info(f"Unhandled Stripe event type: {event_type}")
            return {"success": True, "event_type": event_type}
        except Exception as e:
            logger.error(f"Error processing Stripe webhook {event_type}: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _handle_stripe_payment_success(event):
        from orders.models import Order
        from django.utils import timezone

        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        if not order_id:
            logger.warning("Stripe success event missing order_id in metadata.")
            return

        try:
            order = Order.objects.get(id=order_id)
            order.status = "CONFIRMED"
            order.payment_method = "stripe"
            order.payment_id = intent["id"]
            order.paid_at = timezone.now()
            order.save(update_fields=[
                "status", "payment_method", "payment_id", "paid_at", "updated_at"
            ])
            logger.info(f"Order {order.order_number} marked as paid via Stripe.")
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found for Stripe webhook.")

    @staticmethod
    def _handle_stripe_payment_failure(event):
        from orders.models import Order

        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        if not order_id:
            return

        try:
            order = Order.objects.get(id=order_id)
            if order.status == "PENDING":
                order.status = "CANCELLED"
                order.notes = f"Payment failed: {intent.get("last_payment_error", {}).get("message", "Unknown error")}"
                order.save(update_fields=["status", "notes", "updated_at"])
                logger.info(f"Order {order.order_number} cancelled due to payment failure.")
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found for Stripe webhook.")

    # ========================================================================
    # Razorpay
    # ========================================================================

    @staticmethod
    def create_razorpay_order(order):
        razorpay_key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        razorpay_key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not razorpay_key_id or not razorpay_key_secret:
            raise Exception("Razorpay is not configured. Missing API keys.")

        import razorpay as rzp
        client = rzp.Client(auth=(razorpay_key_id, razorpay_key_secret))

        try:
            amount_paise = int(order.total * 100)
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": order.currency.lower(),
                "receipt": order.order_number,
                "notes": {
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                },
            })
            logger.info(
                f"Razorpay order created: {razorpay_order["id"]} for order {order.order_number}"
            )
            return {
                "order_id": razorpay_order["id"],
                "amount": amount_paise,
                "currency": order.currency.lower(),
            }
        except rzp.errors.BadRequestError as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise Exception(f"Razorpay error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating Razorpay order: {e}")
            raise

    @staticmethod
    def verify_razorpay_payment(razorpay_payment_id, razorpay_order_id, razorpay_signature):
        razorpay_key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not razorpay_key_secret:
            raise Exception("Razorpay is not configured.")

        import hashlib

        try:
            generated_signature = hashlib.sha256(
                f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
            ).hexdigest()

            if generated_signature == razorpay_signature:
                return {"verified": True}
            else:
                logger.warning("Razorpay signature verification failed.")
                return {"verified": False}
        except Exception as e:
            logger.error(f"Error verifying Razorpay payment: {e}")
            raise

    @staticmethod
    def process_webhook_razorpay(payload):
        try:
            event_type = payload.get("event", "")
            logger.info(f"Razorpay webhook received: {event_type}")

            if event_type == "payment.captured":
                PaymentService._handle_razorpay_payment_captured(payload)
            else:
                logger.info(f"Unhandled Razorpay event type: {event_type}")

            return {"success": True, "event_type": event_type}
        except Exception as e:
            logger.error(f"Error processing Razorpay webhook: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _handle_razorpay_payment_captured(payload):
        from orders.models import Order
        from django.utils import timezone

        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_number = payment_entity.get("notes", {}).get("order_number")
        if not order_number:
            logger.warning("Razorpay webhook missing order_number.")
            return

        try:
            order = Order.objects.get(order_number=order_number)
            order.status = "CONFIRMED"
            order.payment_method = "razorpay"
            order.payment_id = payment_entity.get("id", "")
            order.paid_at = timezone.now()
            order.save(update_fields=[
                "status", "payment_method", "payment_id", "paid_at", "updated_at"
            ])
            logger.info(f"Order {order.order_number} marked as paid via Razorpay.")
        except Order.DoesNotExist:
            logger.error(f"Order {order_number} not found for Razorpay webhook.")

    # ========================================================================
    # PayPal
    # ========================================================================

    @staticmethod
    def create_paypal_order(order):
        paypal_client_id = getattr(settings, "PAYPAL_CLIENT_ID", "")
        paypal_client_secret = getattr(settings, "PAYPAL_CLIENT_SECRET", "")
        if not paypal_client_id or not paypal_client_secret:
            raise Exception("PayPal is not configured. Missing API credentials.")

        import paypalrestsdk
        paypalrestsdk.configure({
            "mode": getattr(settings, "PAYPAL_MODE", "sandbox"),
            "client_id": paypal_client_id,
            "client_secret": paypal_client_secret,
        })

        try:
            frontend_url = getattr(settings, "FRONTEND_URL", "")
            paypal_order = paypalrestsdk.Order({
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": order.order_number,
                    "amount": {
                        "currency_code": order.currency,
                        "value": str(order.total),
                    },
                    "description": f"MAISON Order {order.order_number}",
                }],
                "application_context": {
                    "brand_name": "MAISON",
                    "return_url": f"{frontend_url}/api/payments/paypal/return/",
                    "cancel_url": f"{frontend_url}/api/payments/paypal/cancel/",
                },
            })

            if paypal_order.create():
                approval_url = None
                for link in paypal_order.links:
                    if link.rel == "approve":
                        approval_url = link.href
                        break

                logger.info(
                    f"PayPal order created: {paypal_order.id} for order {order.order_number}"
                )
                return {
                    "approval_url": approval_url,
                    "order_id": paypal_order.id,
                }
            else:
                error = paypal_order.error
                logger.error(f"PayPal order creation failed: {error}")
                raise Exception(f"PayPal error: {str(error)}")
        except Exception as e:
            logger.error(f"Unexpected error creating PayPal order: {e}")
            raise

    @staticmethod
    def capture_paypal_payment(order_id, paypal_order_id):
        from orders.models import Order
        from django.utils import timezone

        paypal_client_id = getattr(settings, "PAYPAL_CLIENT_ID", "")
        paypal_client_secret = getattr(settings, "PAYPAL_CLIENT_SECRET", "")
        if not paypal_client_id or not paypal_client_secret:
            raise Exception("PayPal is not configured.")

        import paypalrestsdk
        paypalrestsdk.configure({
            "mode": getattr(settings, "PAYPAL_MODE", "sandbox"),
            "client_id": paypal_client_id,
            "client_secret": paypal_client_secret,
        })

        try:
            paypal_order = paypalrestsdk.Order.find(paypal_order_id)

            if paypal_order.capture():
                order = Order.objects.get(id=order_id)
                order.status = "CONFIRMED"
                order.payment_method = "paypal"
                order.payment_id = paypal_order_id
                order.paid_at = timezone.now()
                order.save(update_fields=[
                    "status", "payment_method", "payment_id", "paid_at", "updated_at"
                ])
                logger.info(f"Order {order.order_number} paid via PayPal.")
                return {"success": True, "details": {"status": paypal_order.status}}
            else:
                logger.error(f"PayPal capture failed: {paypal_order.error}")
                return {"success": False, "details": {"error": str(paypal_order.error)}}
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found for PayPal capture.")
            raise Exception("Order not found.")
        except Exception as e:
            logger.error(f"Error capturing PayPal payment: {e}")
            raise
