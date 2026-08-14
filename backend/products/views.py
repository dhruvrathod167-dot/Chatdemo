import logging

from django.db.models import Q, Count
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from rest_framework import status, viewsets
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    CreateAPIView,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from core.exceptions import NotFoundError, BadRequestError, ForbiddenError
from core.permissions import IsAdminUser, IsOwnerOrReadOnly
from core.paginators import StandardResultSetPagination, ProductPagination

from .models import Category, Brand, Product, Review
from .serializers import (
    CategoryListSerializer,
    CategoryDetailSerializer,
    CategoryCreateUpdateSerializer,
    BrandListSerializer,
    BrandDetailSerializer,
    BrandCreateUpdateSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ReviewSerializer,
    ReviewCreateSerializer,
)

logger = logging.getLogger('maison_api')


# ============================================================================
# Filters
# ============================================================================

class ProductFilter(filters.FilterSet):
    """
    Django-filter filter set for the product listing endpoint.
    Supports filtering by category, brand, price range, boolean flags,
    status, full-text search, and ordering.
    """

    min_price = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='price', lookup_expr='lte')
    is_featured = filters.BooleanFilter(field_name='is_featured')
    is_new_arrival = filters.BooleanFilter(field_name='is_new_arrival')
    is_best_seller = filters.BooleanFilter(field_name='is_best_seller')
    is_trending = filters.BooleanFilter(field_name='is_trending')
    status = filters.CharFilter(field_name='status')
    category = filters.UUIDFilter(field_name='category__id')
    brand = filters.UUIDFilter(field_name='brand__id')
    search = filters.CharFilter(method='filter_search')
    ordering = filters.OrderingFilter(
        fields=(
            ('price', 'price'),
            ('-price', '-price'),
            ('-created_at', '-created_at'),
            ('-rating', '-rating'),
            ('name', 'name'),
        ),
    )

    class Meta:
        model = Product
        fields = [
            'category',
            'brand',
            'min_price',
            'max_price',
            'is_featured',
            'is_new_arrival',
            'is_best_seller',
            'is_trending',
            'status',
            'search',
            'ordering',
        ]

    def filter_search(self, queryset, name, value):
        """
        Full-text search across name, description, tags, and material.
        """
        if not value:
            return queryset

        q = Q()
        terms = value.strip().split()
        for term in terms:
            q |= Q(name__icontains=term)
            q |= Q(description__icontains=term)
            q |= Q(material__icontains=term)
            # tags is a JSONField — use Postgres JSON containment or
            # fall back to raw SQL ILIKE for SQLite compatibility
            q |= Q(tags__icontains=term)

        return queryset.filter(q).distinct()


class BrandFilter(filters.FilterSet):
    """Filter set for brand listing."""

    is_featured = filters.BooleanFilter(field_name='is_featured')

    class Meta:
        model = Brand
        fields = ['is_featured']


# ============================================================================
# Category Views (Public)
# ============================================================================

@extend_schema(
    tags=['Categories'],
    summary='List top-level categories',
    description='Retrieve a list of all top-level categories with their product counts and child categories.',
    responses={200: CategoryDetailSerializer(many=True)},
)
class CategoryListView(ListAPIView):
    """
    List all top-level categories.

    Returns categories with nested children and product counts.
    No pagination is applied — the full tree is returned.
    """

    queryset = Category.objects.filter(parent__isnull=True).prefetch_related(
        'children', 'children__children'
    )
    serializer_class = CategoryDetailSerializer
    permission_classes = [AllowAny]


@extend_schema(
    tags=['Categories'],
    summary='Retrieve a category by slug',
    description='Get detailed information about a single category including children and product count.',
    responses={200: CategoryDetailSerializer},
)
class CategoryDetailView(RetrieveAPIView):
    """
    Retrieve a single category by its slug.

    Includes nested children and product count.
    """

    queryset = Category.objects.all().prefetch_related('children')
    serializer_class = CategoryDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


# ============================================================================
# Brand Views (Public)
# ============================================================================

@extend_schema(
    tags=['Brands'],
    summary='List brands',
    description='Retrieve a paginated list of brands. Supports filtering by featured status.',
    parameters=[
        OpenApiParameter(
            name='is_featured',
            type=bool,
            description='Filter by featured status',
        ),
    ],
    responses={200: BrandListSerializer(many=True)},
)
class BrandListView(ListAPIView):
    """
    List all brands with optional featured filter.
    """

    queryset = Brand.objects.annotate(
        product_count=Count(
            'products',
            filter=Q(products__status='ACTIVE'),
        ),
    )
    serializer_class = BrandListSerializer
    permission_classes = [AllowAny]
    filterset_class = BrandFilter
    pagination_class = StandardResultSetPagination


@extend_schema(
    tags=['Brands'],
    summary='Retrieve a brand by slug',
    description='Get detailed information about a single brand including its story and products.',
    responses={200: BrandDetailSerializer},
)
class BrandDetailView(RetrieveAPIView):
    """
    Retrieve a single brand by its slug.
    """

    queryset = Brand.objects.annotate(
        product_count=Count(
            'products',
            filter=Q(products__status='ACTIVE'),
        ),
    )
    serializer_class = BrandDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


# ============================================================================
# Product Views (Public)
# ============================================================================

@extend_schema(
    tags=['Products'],
    summary='List products',
    description=(
        'Retrieve a paginated list of products with filtering and sorting. '
        'Supports filtering by category, brand, price range, featured/new/best-seller/trending flags, '
        'and full-text search. Supports ordering by price, date, rating, and name.'
    ),
    parameters=[
        OpenApiParameter(name='category', type=str, description='Category UUID'),
        OpenApiParameter(name='brand', type=str, description='Brand UUID'),
        OpenApiParameter(name='min_price', type=float, description='Minimum price'),
        OpenApiParameter(name='max_price', type=float, description='Maximum price'),
        OpenApiParameter(name='is_featured', type=bool, description='Featured products only'),
        OpenApiParameter(name='is_new_arrival', type=bool, description='New arrivals only'),
        OpenApiParameter(name='is_best_seller', type=bool, description='Best sellers only'),
        OpenApiParameter(name='is_trending', type=bool, description='Trending products only'),
        OpenApiParameter(name='status', type=str, description='Product status (DRAFT, ACTIVE, ARCHIVED)'),
        OpenApiParameter(name='search', type=str, description='Full-text search query'),
        OpenApiParameter(name='ordering', type=str, description='Ordering: price, -price, -created_at, -rating, name'),
    ],
    responses={200: ProductListSerializer(many=True)},
)
class ProductListView(ListAPIView):
    """
    List products with comprehensive filtering and sorting.

    Only ACTIVE products are returned to the storefront.
    Admin endpoints can access all statuses.
    """

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    pagination_class = ProductPagination

    def get_queryset(self):
        return (
            Product.objects
            .select_related('category', 'brand')
            .prefetch_related('images')
            .filter(status='ACTIVE')
            .order_by('-created_at')
        )


@extend_schema(
    tags=['Products'],
    summary='Retrieve a product by slug',
    description='Get detailed information about a single product including images, reviews, and related products.',
    responses={200: ProductDetailSerializer},
)
class ProductDetailView(RetrieveAPIView):
    """
    Retrieve a single product by its slug.

    Includes all images, reviews, and related products
    (same category, excluding self).
    """

    queryset = (
        Product.objects
        .select_related('category', 'brand')
        .prefetch_related('images', 'reviews', 'reviews__user')
        .filter(status='ACTIVE')
    )
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


# ============================================================================
# Review Views (Public)
# ============================================================================

@extend_schema(
    tags=['Reviews'],
    summary='List reviews for a product',
    description='Retrieve all reviews for a specific product.',
    parameters=[
        OpenApiParameter(name='product_id', type=str, description='Product UUID', location='path'),
    ],
    responses={200: ReviewSerializer(many=True)},
)
class ProductReviewListView(ListAPIView):
    """
    List all reviews for a specific product.
    """

    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultSetPagination

    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        return Review.objects.filter(
            product__id=product_id,
        ).select_related('user').order_by('-created_at')


@extend_schema(
    tags=['Reviews'],
    summary='Create a product review',
    description='Submit a review for a product. User must be authenticated. One review per product per user.',
    request=ReviewCreateSerializer,
    responses={201: ReviewSerializer},
)
class ProductReviewCreateView(CreateAPIView):
    """
    Create a review for a product.

    Requires authentication. A user can only leave one review per product.
    The review will be marked as a verified purchase if the user
    has previously ordered the product.
    """

    serializer_class = ReviewCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


# ============================================================================
# Admin ViewSets
# ============================================================================

@extend_schema(
    tags=['Admin - Products'],
    summary='Admin product management',
    description='Full CRUD operations for products. Admin access required.',
)
class AdminProductViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for full product management.

    Supports creating, listing, retrieving, updating,
    and deleting products. Image upload is handled through
    the ProductImage model (separate endpoint or inline).
    """

    queryset = (
        Product.objects
        .select_related('category', 'brand')
        .prefetch_related('images', 'reviews')
    )
    permission_classes = [IsAdminUser]
    filterset_class = ProductFilter
    pagination_class = ProductPagination

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        logger.info(f'Admin creating product: {serializer.validated_data.get("name")}')
        serializer.save()

    def perform_update(self, serializer):
        logger.info(f'Admin updating product: {self.get_object().name}')
        serializer.save()

    def perform_destroy(self, instance):
        logger.info(f'Admin deleting product: {instance.name}')
        instance.delete()


@extend_schema(
    tags=['Admin - Categories'],
    summary='Admin category management',
    description='Full CRUD operations for categories. Admin access required.',
)
class AdminCategoryViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for full category management.
    """

    queryset = Category.objects.all().prefetch_related('children')
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultSetPagination

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CategoryCreateUpdateSerializer
        return CategoryDetailSerializer

    def perform_create(self, serializer):
        logger.info(f'Admin creating category: {serializer.validated_data.get("name")}')
        serializer.save()

    def perform_update(self, serializer):
        logger.info(f'Admin updating category: {self.get_object().name}')
        serializer.save()

    def perform_destroy(self, instance):
        logger.info(f'Admin deleting category: {instance.name}')
        instance.delete()


@extend_schema(
    tags=['Admin - Brands'],
    summary='Admin brand management',
    description='Full CRUD operations for brands. Admin access required.',
)
class AdminBrandViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for full brand management.
    """

    queryset = Brand.objects.all()
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultSetPagination

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return BrandCreateUpdateSerializer
        return BrandDetailSerializer

    def perform_create(self, serializer):
        logger.info(f'Admin creating brand: {serializer.validated_data.get("name")}')
        serializer.save()

    def perform_update(self, serializer):
        logger.info(f'Admin updating brand: {self.get_object().name}')
        serializer.save()

    def perform_destroy(self, instance):
        logger.info(f'Admin deleting brand: {instance.name}')
        instance.delete()


@extend_schema(
    tags=['Admin - Reviews'],
    summary='Admin review management',
    description='Full CRUD operations for reviews. Admin access required.',
)
class AdminReviewViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing reviews.
    Allows viewing, updating, and deleting reviews.
    """

    queryset = Review.objects.select_related('product', 'user')
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultSetPagination

    def perform_destroy(self, instance):
        logger.info(f'Admin deleting review: {instance.id}')
        instance.delete()
