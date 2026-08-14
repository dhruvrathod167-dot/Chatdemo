from django.urls import path, include

from coupons.views import CouponListView, CouponValidateView, AdminCouponViewSet

app_name = 'coupons'

urlpatterns = [
    # Public endpoints
    path('api/coupons/', CouponListView.as_view(), name='coupon-list'),
    path('api/coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),

    # Admin endpoints
    path('api/admin/coupons/', AdminCouponViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='admin-coupon-list-create'),
    path('api/admin/coupons/<uuid:pk>/', AdminCouponViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='admin-coupon-detail'),
]