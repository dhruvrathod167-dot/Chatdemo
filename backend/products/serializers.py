import logging

from rest_framework import serializers

from core.utils import format_currency
from .models import Category, Brand, Product, ProductImage, Review

logger = logging.getLogger('maison_api')


# ============================================================================
# Category Serializers
# ============================================================================

class CategoryListSerializer(serializers.ModelSerializer):
    """
    Light-weight serializer for category list views.
    Includes a thumbnail URL and annotated product count.
    """

    image_thumbnail = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'image_thumbnail',
            'product_count',
            'is_featured',
            'sort_order',
        ]

    def get_product_count(self, obj):
        return obj.product_count

    def get_image_thumbnail(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class CategoryDetailSerializer(CategoryListSerializer):
    """
    Full category serializer including children and all fields.
    """

    children = serializers.SerializerMethodField()
    description = serializers.CharField(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta(CategoryListSerializer.Meta):
        fields = CategoryListSerializer.Meta.fields + [
            'description',
            'parent',
            'children',
            'created_at',
            'updated_at',
        ]

    def get_children(self, obj):
        children_qs = obj.children.all()
        if children_qs.exists():
            return CategoryListSerializer(
                children_qs,
                many=True,
                context=self.context,
            ).data
        return []


class CategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating categories (admin use).
    """

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'image',
            'parent',
            'is_featured',
            'sort_order',
        ]


# ============================================================================
# Brand Serializers
# ============================================================================

class BrandListSerializer(serializers.ModelSerializer):
    """
    Light-weight serializer for brand listing.
    """

    logo_url = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = [
            'id',
            'name',
            'slug',
            'logo_url',
            'country',
            'founded_year',
            'is_featured',
            'product_count',
        ]

    def get_product_count(self, obj):
        return obj.product_count

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class BrandDetailSerializer(serializers.ModelSerializer):
    """
    Full brand serializer with all fields.
    """

    logo_url = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Brand
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'logo_url',
            'story',
            'country',
            'founded_year',
            'is_featured',
            'product_count',
            'created_at',
            'updated_at',
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class BrandCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating brands (admin use).
    """

    class Meta:
        model = Brand
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'logo',
            'story',
            'country',
            'founded_year',
            'is_featured',
        ]


# ============================================================================
# Product Image Serializer
# ============================================================================

class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for product images.
    """

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = [
            'id',
            'image_url',
            'alt_text',
            'sort_order',
        ]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


# ============================================================================
# Product Serializers
# ============================================================================

class ProductListSerializer(serializers.ModelSerializer):
    """
    Light-weight serializer for product listings.
    Optimised for product grid / card views.
    """

    first_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
    )
    brand_name = serializers.CharField(
        source='brand.name',
        read_only=True,
        default=None,
    )
    is_new = serializers.BooleanField(source='is_new_arrival', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'price',
            'compare_at_price',
            'currency',
            'first_image',
            'category_name',
            'brand_name',
            'rating',
            'review_count',
            'is_new',
            'is_featured',
            'is_best_seller',
            'is_trending',
            'status',
            'created_at',
        ]

    def get_first_image(self, obj):
        first = obj.images.first()
        if first and first.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first.image.url)
            return first.image.url
        return None


class ReviewSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for reviews.
    """

    user_name_display = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id',
            'product',
            'user',
            'user_name',
            'user_name_display',
            'rating',
            'title',
            'comment',
            'is_verified_purchase',
            'created_at',
        ]
        read_only_fields = fields

    def get_user_name_display(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return obj.user_name or 'Anonymous'


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full product serializer for product detail pages.
    Includes reviews, images, and related products.
    """

    images = ProductImageSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    related_products = serializers.SerializerMethodField()
    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
    )
    category_slug = serializers.CharField(
        source='category.slug',
        read_only=True,
    )
    brand_name = serializers.CharField(
        source='brand.name',
        read_only=True,
        default=None,
    )
    brand_slug = serializers.CharField(
        source='brand.slug',
        read_only=True,
        default=None,
    )
    formatted_price = serializers.SerializerMethodField()
    formatted_compare_at_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'short_description',
            'price',
            'compare_at_price',
            'currency',
            'formatted_price',
            'formatted_compare_at_price',
            'sku',
            'category',
            'category_name',
            'category_slug',
            'brand',
            'brand_name',
            'brand_slug',
            'sizes',
            'colors',
            'material',
            'care_instructions',
            'is_featured',
            'is_new_arrival',
            'is_best_seller',
            'is_trending',
            'stock_count',
            'weight_kg',
            'tags',
            'meta_title',
            'meta_description',
            'status',
            'rating',
            'review_count',
            'images',
            'reviews',
            'related_products',
            'created_at',
            'updated_at',
        ]

    def get_formatted_price(self, obj):
        return format_currency(obj.price, obj.currency)

    def get_formatted_compare_at_price(self, obj):
        if obj.compare_at_price:
            return format_currency(obj.compare_at_price, obj.currency)
        return None

    def get_related_products(self, obj):
        related = (
            Product.objects.filter(
                category=obj.category,
                status='ACTIVE',
            )
            .exclude(pk=obj.pk)
            .order_by('-created_at')[:8]
        )
        return ProductListSerializer(
            related,
            many=True,
            context=self.context,
        ).data


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for admin CRUD operations on products.
    Supports image upload via nested write.
    """

    images = ProductImageSerializer(many=True, required=False, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'short_description',
            'price',
            'compare_at_price',
            'currency',
            'sku',
            'category',
            'brand',
            'sizes',
            'colors',
            'material',
            'care_instructions',
            'is_featured',
            'is_new_arrival',
            'is_best_seller',
            'is_trending',
            'stock_count',
            'weight_kg',
            'tags',
            'meta_title',
            'meta_description',
            'status',
            'images',
        ]


# ============================================================================
# Review Serializers
# ============================================================================

class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a product review.
    The user is set from the request context.
    """

    class Meta:
        model = Review
        fields = [
            'product',
            'rating',
            'title',
            'comment',
        ]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                'Rating must be between 1 and 5.'
            )
        return value

    def validate_product(self, value):
        if value.status != 'ACTIVE':
            raise serializers.ValidationError(
                'Cannot review a product that is not active.'
            )
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'You must be authenticated to leave a review.'
            )

        product = attrs.get('product')
        user = request.user

        # Check for existing review
        existing = Review.objects.filter(product=product, user=user).exists()
        if existing:
            raise serializers.ValidationError(
                'You have already reviewed this product.'
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        validated_data['user'] = user
        validated_data['user_name'] = user.get_full_name()

        # Check if the user has purchased this product
        from orders.models import Order, OrderItem
        has_purchased = OrderItem.objects.filter(
            order__user=user,
            product_id=str(validated_data['product'].id),
        ).exists()
        validated_data['is_verified_purchase'] = has_purchased

        return super().create(validated_data)
