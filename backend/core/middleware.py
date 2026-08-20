import time
import logging
from collections import defaultdict
from django.conf import settings
from django.http import HttpResponse
from django.core.cache import cache

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        logger.info(
            f"{request.method} {request.path} - "
            f"{response.status_code} ({duration:.3f}s)"
        )
        return response


class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def __call__(self, request):
        if not getattr(settings, 'RATE_LIMIT_ENABLED', True):
            return self.get_response(request)

        if request.path.startswith('/api/'):
            ip = self._get_client_ip(request)
            key = f'rate_limit:{ip}'
            count = cache.get_or_set(key, 0, timeout=60)
            limit = getattr(settings, 'RATE_LIMIT_REQUESTS', 100)

            if count >= limit:
                return HttpResponse(
                    '{"error": "Rate limit exceeded", "detail": "Too many requests. Try again later."}',
                    status=429,
                    content_type='application/json',
                )
            cache.incr(key)

        return self.get_response(request)


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

        if settings.DEBUG is False:
            sts_seconds = getattr(settings, 'STS_SECONDS', 31536000)
            response['Strict-Transport-Security'] = (
                f'max-age={sts_seconds}; includeSubDomains; preload'
            )

        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://images.unsplash.com https://*.stripe.com; "
            "frame-src https://js.stripe.com https://checkout.razorpay.com; "
            "connect-src 'self' https://api.stripe.com https://api.razorpay.com; "
            "base-uri 'self'; form-action 'self'"
        )
        response['Content-Security-Policy'] = csp

        return response
