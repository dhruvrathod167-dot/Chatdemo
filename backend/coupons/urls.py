from django.urls import path

from coupons.views import CouponListView, CouponValidateView, AdminCouponViewSet

app_name = 'coupons'

urlpatterns = [
    # Public endpoints
    path('', CouponListView.as_view(), name='coupon-list'),
    path('validate/', CouponValidateView.as_view(), name='coupon-validate'),

    # Admin endpoints
    path('admin/', AdminCouponViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='admin-coupon-list-create'),
    path('admin/<uuid:pk>/', AdminCouponViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='admin-coupon-detail'),
]