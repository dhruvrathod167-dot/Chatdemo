"""
Utility Functions for MAISON

A collection of pure and semi-pure helper functions used across
the application. Includes order number generation, SKU formatting,
tax calculation, currency formatting, IP extraction, image
validation, and async email dispatch via Celery.
"""

import hashlib
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image

logger = logging.getLogger('maison_api')


# ============================================================================
# Order Number Generation
# ============================================================================

def generate_order_number():
    """
    Generate a unique, human-readable order number.

    Format: MSN-YYYYMMDD-XXXXX
    - MSN: Maison order prefix
    - YYYYMMDD: Current UTC date
    - XXXXX: 5-character alphanumeric hash derived from UUID + timestamp

    The combination of date + random hash ensures uniqueness while
    remaining readable for customer service lookups.

    Returns:
        str: A unique order number string.

    Example:
        >>> generate_order_number()
        'MSN-20260814-A3F9K'
    """
    now = datetime.now(timezone.utc)
    date_part = now.strftime('%Y%m%d')

    # Generate a short hash from UUID4 + timestamp for uniqueness
    raw = f"{uuid.uuid4().hex}{time.time()}{now.microsecond}"
    hash_digest = hashlib.sha256(raw.encode()).hexdigest().upper()
    # Take 5 alphanumeric characters from the hash
    short_hash = re.sub(r'[^A-Z0-9]', '', hash_digest)[:5]

    return f'MSN-{date_part}-{short_hash}'


# ============================================================================
# SKU Generation
# ============================================================================

def generate_sku(product_name, color=None, size=None):
    """
    Generate a Stock Keeping Unit (SKU) from product details.

    The SKU format is designed to be compact yet descriptive:
    - First 3 letters of the product name (uppercase)
    - First 3 letters of the color (if provided, uppercase)
    - Size code (if provided)
    - Last 4 characters of a UUID for uniqueness

    Args:
        product_name (str): The name of the product.
        color (str, optional): The color variant.
        size (str, optional): The size variant (e.g., 'S', 'M', 'L', 'XL').

    Returns:
        str: A unique SKU string.

    Example:
        >>> generate_sku('Silk Blazer', 'Navy', 'M')
        'SIL-NAV-M-A3F9'
    """
    # Normalize the product name: remove non-alphanumeric, uppercase
    clean_name = re.sub(r'[^A-Za-z0-9]', '', product_name).upper()
    name_code = clean_name[:3].ljust(3, 'X')

    parts = [name_code]

    if color:
        clean_color = re.sub(r'[^A-Za-z0-9]', '', color).upper()
        color_code = clean_color[:3].ljust(3, 'X')
        parts.append(color_code)

    if size:
        clean_size = re.sub(r'[^A-Za-z0-9]', '', str(size)).upper()
        parts.append(clean_size)

    # Append a short unique suffix from UUID
    unique_suffix = uuid.uuid4().hex[:4].upper()
    parts.append(unique_suffix)

    return '-'.join(parts)


# ============================================================================
# Tax Calculation
# ============================================================================

def calculate_tax(amount, rate=0.08):
    """
    Calculate tax on a given amount.

    Uses Decimal arithmetic for financial precision and rounds
    to 2 decimal places using the standard rounding method.

    Args:
        amount (Decimal | float | int): The pre-tax amount.
        rate (float, optional): Tax rate as a decimal (e.g., 0.08 for 8%).
                                     Defaults to 0.08 (8%).

    Returns:
        Decimal: The calculated tax amount, rounded to 2 decimal places.

    Example:
        >>> calculate_tax(Decimal('199.99'), 0.08)
        Decimal('16.00')
    """
    amount_decimal = Decimal(str(amount))
    rate_decimal = Decimal(str(rate))
    tax = (amount_decimal * rate_decimal).quantize(
        Decimal('0.01'),
        rounding=ROUND_HALF_UP,
    )
    return tax


# ============================================================================
# Currency Formatting
# ============================================================================

def format_currency(amount, currency='USD'):
    """
    Format a monetary amount with the appropriate currency symbol.

    Supports common currencies used in luxury eCommerce.

    Args:
        amount (Decimal | float | int): The monetary amount.
        currency (str, optional): ISO 4217 currency code.
                                      Defaults to 'USD'.

    Returns:
        str: Formatted currency string.

    Example:
        >>> format_currency(1999.99, 'USD')
        '$1,999.99'
        >>> format_currency(1999.99, 'EUR')
        '€1,999.99'
        >>> format_currency(1999.99, 'GBP')
        '£1,999.99'
    """
    amount_decimal = Decimal(str(amount))
    formatted_number = f'{amount_decimal:,.2f}'

    currency_symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'INR': '₹',
        'AUD': 'A$',
        'CAD': 'C$',
        'CHF': 'CHF ',
        'AED': 'AED ',
        'SAR': 'SAR ',
        'KRW': '₩',
        'SGD': 'S$',
        'HKD': 'HK$',
    }

    symbol = currency_symbols.get(currency.upper(), f'{currency} ')

    # JPY and KRW have no decimal places in common use
    if currency.upper() in ('JPY', 'KRW'):
        formatted_number = f'{int(amount_decimal):,}'

    return f'{symbol}{formatted_number}'


# ============================================================================
# Client IP Extraction
# ============================================================================

def get_client_ip(request):
    """
    Extract the client's real IP address from the request.

    Checks common proxy headers in order of reliability:
    1. X-Forwarded-For (set by load balancers / CDNs)
    2. X-Real-IP (set by Nginx)
    3. REMOTE_ADDR (direct connection)

    When X-Forwarded-For contains multiple addresses, the first
    one is the original client IP.

    Args:
        request: Django HttpRequest object.

    Returns:
        str: The client's IP address.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # X-Forwarded-For can contain: client, proxy1, proxy2
        ip = x_forwarded_for.split(',')[0].strip()
        return ip

    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip.strip()

    return request.META.get('REMOTE_ADDR', '127.0.0.1')


# ============================================================================
# Image Validation
# ============================================================================

# Allowed image formats and their MIME types
ALLOWED_IMAGE_FORMATS = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
    'GIF': 'image/gif',
}

# Maximum file size: 5 MB
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024


def validate_image(image):
    """
    Validate an uploaded image file.

    Checks:
    1. File size does not exceed 5 MB
    2. File is in a supported image format (JPEG, PNG, WEBP, GIF)
    3. The image can be opened by Pillow (is not corrupted)
    4. Image dimensions are reasonable (max 10000x10000 pixels)

    Args:
        image: Django InMemoryUploadedFile or file-like object.

    Returns:
        tuple[bool, str]: (is_valid, error_message)

    Raises:
        ValueError: If the image fails any validation check.
    """
    # Check file size
    if hasattr(image, 'size') and image.size > MAX_IMAGE_SIZE_BYTES:
        max_mb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
        raise ValueError(
            f'Image size must not exceed {max_mb:.0f} MB. '
            f'Received: {image.size / (1024 * 1024):.2f} MB.'
        )

    # Check if the file has content
    if hasattr(image, 'size') and image.size == 0:
        raise ValueError('The uploaded image is empty.')

    # Attempt to open the image with Pillow to validate format and integrity
    try:
        img = Image.open(image)
        img.verify()

        # Re-open after verify (verify() closes the file)
        image.seek(0)
        img = Image.open(image)

        # Check image format
        format_name = img.format
        if format_name not in ALLOWED_IMAGE_FORMATS:
            allowed = ', '.join(sorted(ALLOWED_IMAGE_FORMATS.keys()))
            raise ValueError(
                f'Unsupported image format: {format_name}. '
                f'Allowed formats: {allowed}.'
            )

        # Check image dimensions
        width, height = img.size
        max_dimension = 10000
        if width > max_dimension or height > max_dimension:
            raise ValueError(
                f'Image dimensions too large: {width}x{height}. '
                f'Maximum allowed: {max_dimension}x{max_dimension} pixels.'
            )

    except (IOError, OSError) as e:
        raise ValueError(
            f'The uploaded file is not a valid image or is corrupted. '
            f'Details: {str(e)}'
        )

    return True


# ============================================================================
# Async Email Dispatch via Celery
# ============================================================================

def send_email_async(subject, body, to, html_body=None, from_email=None, reply_to=None):
    """
    Dispatch an email asynchronously via Celery.

    This function enqueues a Celery task to send the email, allowing
    the API to respond immediately without waiting for the SMTP server.

    Args:
        subject (str): Email subject line.
        body (str): Plain-text email body.
        to (str | list[str]): Recipient email address(es).
        html_body (str, optional): HTML email body. If provided, the email
                                     is sent as multipart/alternative.
        from_email (str, optional): Sender email address.
                                         Defaults to DEFAULT_FROM_EMAIL.
        reply_to (str | list[str], optional): Reply-to address(es).

    Returns:
        celery.result.AsyncResult: The Celery task result for tracking.
    """
    try:
        from core.tasks import send_email_task
    except ImportError:
        logger.warning(
            'Celery email task not available. Falling back to synchronous email.'
        )
        _send_email_sync(subject, body, to, html_body, from_email, reply_to)
        return None

    # Normalize recipient to a list
    if isinstance(to, str):
        to = [to]

    # Normalize reply_to to a list
    if reply_to and isinstance(reply_to, str):
        reply_to = [reply_to]

    task_payload = {
        'subject': subject,
        'body': body,
        'to': to,
        'html_body': html_body,
        'from_email': from_email or settings.DEFAULT_FROM_EMAIL,
        'reply_to': reply_to,
    }

    return send_email_task.delay(**task_payload)


def send_order_confirmation_email(order):
    """
    Send an order confirmation email to the customer.

    This constructs a rich email with order details and dispatches
    it asynchronously via Celery.

    Args:
        order: An Order model instance. Must have the following attributes:
            - order_number (str)
            - user.email (str)
            - user.get_full_name() (str)
            - total_amount (Decimal)
            - items (QuerySet of OrderItem)
            - shipping_address (str or dict)

    Returns:
        celery.result.AsyncResult | None: The Celery task result.
    """
    user = order.user
    subject = f'Order Confirmed — {order.order_number}'

    # Build the plain-text body
    lines = [
        f'Dear {user.get_full_name() or "Valued Customer"},',
        '',
        'Thank you for your order at MAISON.',
        '',
        f'Order Number: {order.order_number}',
        '',
        'Order Items:',
        '─' * 40,
    ]

    for item in order.items.all():
        lines.append(
            f'  {item.product_name} x {item.quantity} '
            f'— ${item.product_price:.2f} each'
        )

    lines.extend([
        '─' * 40,
        f'Total: ${order.total:.2f}',
        '',
        'Shipping Address:',
        f'  {order.shipping_address}',
        '',
        'We will notify you when your order ships.',
        '',
        'With refined regards,',
        'The MAISON Team',
    ])

    body = '\n'.join(lines)

    # Build the HTML body
    html_body = f"""
    <html>
    <body style="font-family: 'Georgia', serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 4px;">MAISON</h1>
        </div>
        <h2 style="font-weight: normal; color: #666;">Order Confirmation</h2>
        <p>Dear {user.get_full_name() or "Valued Customer"},</p>
        <p>Thank you for your order at MAISON. Your order has been confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px 0;"><strong>Order Number</strong></td>
                <td style="text-align: right;">{order.order_number}</td>
            </tr>
    """

    for item in order.items.all():
        html_body += f"""
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;">{item.product_name} x {item.quantity}</td>
                <td style="text-align: right;">${item.product_price * item.quantity:.2f}</td>
            </tr>
        """

    html_body += f"""
            <tr style="border-top: 2px solid #1a1a1a;">
                <td style="padding: 10px 0;"><strong>Total</strong></td>
                <td style="text-align: right; font-size: 18px;"><strong>${order.total_amount:.2f}</strong></td>
            </tr>
        </table>
        <p style="color: #666; font-size: 14px;">We will notify you when your order ships.</p>
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; color: #999; font-size: 12px;">
            <p style="margin: 0;">With refined regards,<br>The MAISON Team</p>
        </div>
    </body>
    </html>
    """

    return send_email_async(
        subject=subject,
        body=body,
        to=user.email,
        html_body=html_body,
    )


def send_welcome_email(user):
    """
    Send a welcome email to a newly registered user.

    Constructs a branded welcome email and dispatches it
    asynchronously via Celery.

    Args:
        user: A Django User model instance. Must have:
            - email (str)
            - get_full_name() (str)

    Returns:
        celery.result.AsyncResult | None: The Celery task result.
    """
    subject = 'Welcome to MAISON'
    name = user.get_full_name() or 'Valued Customer'

    body = f"""Dear {name},

Welcome to MAISON — where luxury meets timeless elegance.

We are delighted to have you join our curated community of discerning
individuals who appreciate the finest in fashion and design.

As a MAISON member, you will enjoy:

  • Early access to new collections
  • Exclusive member-only offers
  • Personalized style recommendations
  • Priority customer service

Explore our latest collection and discover pieces that define
sophisticated living.

Visit us at: https://maison.com

With refined regards,
The MAISON Team
"""

    html_body = f"""
    <html>
    <body style="font-family: 'Georgia', serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 4px;">MAISON</h1>
        </div>
        <h2 style="font-weight: normal; color: #666;">Welcome, {name}</h2>
        <p>Thank you for joining MAISON. We are delighted to welcome you to our curated community.</p>
        <p>As a MAISON member, you will enjoy:</p>
        <ul style="line-height: 2;">
            <li>Early access to new collections</li>
            <li>Exclusive member-only offers</li>
            <li>Personalized style recommendations</li>
            <li>Priority customer service</li>
        </ul>
        <p>Explore our latest collection and discover pieces that define sophisticated living.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://maison.com" style="
                display: inline-block;
                background-color: #1a1a1a;
                color: #fff;
                padding: 14px 40px;
                text-decoration: none;
                letter-spacing: 2px;
                font-size: 12px;
            ">EXPLORE COLLECTION</a>
        </div>
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; color: #999; font-size: 12px;">
            <p style="margin: 0;">With refined regards,<br>The MAISON Team</p>
        </div>
    </body>
    </html>
    """

    return send_email_async(
        subject=subject,
        body=body,
        to=user.email,
        html_body=html_body,
    )


# ============================================================================
# Internal: Synchronous Email Fallback
# ============================================================================

def _send_email_sync(subject, body, to, html_body=None, from_email=None, reply_to=None):
    """
    Send an email synchronously (fallback when Celery is unavailable).

    This is used as a degraded fallback in development or when the
    Celery worker is not running. In production, always use the
    async version via send_email_async().
    """
    from django.core.mail import EmailMultiAlternatives

    if isinstance(to, str):
        to = [to]

    email = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        to=to,
        reply_to=reply_to or None,
    )

    if html_body:
        email.attach_alternative(html_body, 'text/html')

    email.send(fail_silently=False)
    logger.info(f'Email sent synchronously to {to}: {subject}')
