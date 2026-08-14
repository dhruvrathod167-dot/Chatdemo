"""
MAISON Luxury Fashion eCommerce Platform
Main URL Configuration

Routes all incoming requests to the appropriate application routers.
API endpoints are versioned under /api/v1/.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView


urlpatterns = [
    # ------------------------------------------------------------------
    # Django Admin
    # ------------------------------------------------------------------
    path('admin/', admin.site.urls),

    # ------------------------------------------------------------------
    # API: Authentication & User Management
    # ------------------------------------------------------------------
    path('api/auth/', include('users.urls')),

    # ------------------------------------------------------------------
    # API: Products & Categories
    # ------------------------------------------------------------------
    path('api/products/', include('products.urls')),

    # ------------------------------------------------------------------
    # API: Orders & Order Management
    # ------------------------------------------------------------------
    path('api/orders/', include('orders.urls')),

    # ------------------------------------------------------------------
    # API: Shopping Cart
    # ------------------------------------------------------------------
    path('api/cart/', include('cart.urls')),

    # ------------------------------------------------------------------
    # API: Product Search (Elasticsearch)
    # ------------------------------------------------------------------
    path('api/search/', include('search.urls')),

    # ------------------------------------------------------------------
    # API: Coupons & Discounts
    # ------------------------------------------------------------------
    path('api/coupons/', include('coupons.urls')),

    # ------------------------------------------------------------------
    # API: Payments (Stripe, Razorpay, PayPal)
    # ------------------------------------------------------------------
    path('api/payments/', include('payments.urls')),

    # ------------------------------------------------------------------
    # API: OpenAPI Schema & Documentation
    # ------------------------------------------------------------------
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/schema/swagger/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
    path(
        'api/schema/redoc/',
        SpectacularRedocView.as_view(url_name='schema'),
        name='redoc',
    ),
]

# ------------------------------------------------------------------
# Serve media files in development only
# ------------------------------------------------------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
