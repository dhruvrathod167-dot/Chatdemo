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
    path('', CartView.as_view(), name='cart'),
    path('items/<uuid:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('clear/', CartClearView.as_view(), name='cart-clear'),
    path('merge/', CartMergeView.as_view(), name='cart-merge'),
    path('apply-coupon/', ApplyCouponView.as_view(), name='apply-coupon'),
]