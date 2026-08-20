from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryListView,
    CategoryDetailView,
    BrandListView,
    BrandDetailView,
    ProductListView,
    ProductDetailView,
    ProductReviewListView,
    ProductReviewCreateView,
    AdminProductViewSet,
    AdminCategoryViewSet,
    AdminBrandViewSet,
    AdminReviewViewSet,
)

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'admin/products', AdminProductViewSet, basename='admin-products')
admin_router.register(r'admin/categories', AdminCategoryViewSet, basename='admin-categories')
admin_router.register(r'admin/brands', AdminBrandViewSet, basename='admin-brands')
admin_router.register(r'admin/reviews', AdminReviewViewSet, basename='admin-reviews')

# Public URL patterns
urlpatterns = [
    # Categories
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('categories/<slug:slug>/', CategoryDetailView.as_view(), name='category-detail'),

    # Brands
    path('brands/', BrandListView.as_view(), name='brand-list'),
    path('brands/<slug:slug>/', BrandDetailView.as_view(), name='brand-detail'),

    # Products
    path('', ProductListView.as_view(), name='product-list'),
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),

    # Reviews
    path('<uuid:product_id>/reviews/', ProductReviewListView.as_view(), name='product-review-list'),
    path('<uuid:product_id>/reviews/create/', ProductReviewCreateView.as_view(), name='product-review-create'),

    # Admin (routed via DefaultRouter)
    path('', include(admin_router.urls)),
]
