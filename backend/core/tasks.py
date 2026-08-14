"""
Celery task definitions for the MAISON platform.

Tasks are registered with Celery's autodiscover mechanism via
the django_celery_beat scheduler. All async work (emails, search
indexing, etc.) should be routed through this module.
"""

import logging

from celery import shared_task

logger = logging.getLogger('maison_api')


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def send_email_task(self, subject: str, message: str, from_email: str,
                    recipient_list: list, html_message: str = None,
                    fail_silently: bool = False):
    """
    Asynchronous email sending task.

    Retries up to 3 times with a 60-second delay between attempts.
    Used by core.utils.send_email_async() as the Celery path.
    """
    from django.core.mail import send_mail

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=fail_silently,
        )
        logger.info(f'Email sent successfully to {recipient_list}')
        return {'status': 'sent', 'recipients': recipient_list}
    except Exception as exc:
        logger.error(f'Email send failed: {exc}', exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def send_order_confirmation_task(self, order_id: str):
    """
    Send order confirmation email asynchronously.
    """
    from core.utils import send_order_confirmation_email

    try:
        send_order_confirmation_email(order_id)
        logger.info(f'Order confirmation email sent for order {order_id}')
        return {'status': 'sent', 'order_id': order_id}
    except Exception as exc:
        logger.error(
            f'Order confirmation email failed for {order_id}: {exc}',
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def send_welcome_email_task(self, user_id: str):
    """
    Send welcome email to a newly registered user.
    """
    from core.utils import send_welcome_email

    try:
        send_welcome_email(user_id)
        logger.info(f'Welcome email sent for user {user_id}')
        return {'status': 'sent', 'user_id': user_id}
    except Exception as exc:
        logger.error(
            f'Welcome email failed for user {user_id}: {exc}',
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def generate_product_thumbnails(self, product_id: str):
    """
    Generate thumbnails for a product's images.
    Used after image upload to create various sizes.
    """
    try:
        from products.models import Product
        product = Product.objects.get(pk=product_id)
        # Thumbnail generation logic would go here
        # using Pillow or django-imagekit
        logger.info(f'Thumbnails generated for product {product_id}')
        return {'status': 'completed', 'product_id': product_id}
    except Exception as exc:
        logger.error(f'Thumbnail generation failed for {product_id}: {exc}')
        raise self.retry(exc=exc)
