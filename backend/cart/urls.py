from django.urls import path

from cart.views import (
    CartView,
    CartItemDetailView,
    CartClearView,
    CartMergeView,
    ApplyCouponView,
)

app_name = 'cart'

urlpatterns = [
    # Cart CRUD
    path('api/cart/', CartView.as_view(), name='cart'),
    path('api/cart/items/<uuid:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('api/cart/clear/', CartClearView.as_view(), name='cart-clear'),
    path('api/cart/merge/', CartMergeView.as_view(), name='cart-merge'),
    path('api/cart/apply-coupon/', ApplyCouponView.as_view(), name='apply-coupon'),
]