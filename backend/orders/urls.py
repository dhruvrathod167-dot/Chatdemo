from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    OrderListView,
    OrderDetailView,
    OrderCreateView,
    OrderCancelView,
    OrderTrackingView,
    AdminOrderViewSet,
    AdminOrderStatsView,
)

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'admin', AdminOrderViewSet, basename='admin-orders')

# Public URL patterns
urlpatterns = [
    # User order management
    path('', OrderListView.as_view(), name='order-list'),
    path('create/', OrderCreateView.as_view(), name='order-create'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<uuid:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('tracking/<str:order_number>/', OrderTrackingView.as_view(), name='order-tracking'),

    # Admin
    path('admin/stats/', AdminOrderStatsView.as_view(), name='admin-order-stats'),
    path('', include(admin_router.urls)),
]
