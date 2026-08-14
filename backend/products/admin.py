from django.contrib import admin
from .models import Category, Brand, Product, ProductImage, Review


# ============================================================================
# ProductImage Inline
# ============================================================================


class ProductImageInline(admin.TabularInline):
    """Inline admin for managing product images."""

    model = ProductImage
    extra = 1
    readonly_fields = ('id', 'created_at')
    fields = ('image', 'alt_text', 'sort_order', 'id', 'created_at')
    ordering = ('sort_order', 'created_at')


# ============================================================================
# Category Admin
# ============================================================================


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin interface for Category model."""

    list_display = (
        'name',
        'slug',
        'parent',
        'is_featured',
        'sort_order',
        'product_count_inline',
        'created_at',
    )
    list_filter = ('is_featured', 'parent')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('is_featured', 'sort_order')
    ordering = ('sort_order', 'name')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'parent', 'description', 'image')
        }),
        ('Display', {
            'fields': ('is_featured', 'sort_order')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Products')
    def product_count_inline(self, obj):
        return obj.product_count


# ============================================================================
# Brand Admin
# ============================================================================


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    """Admin interface for Brand model."""

    list_display = (
        'name',
        'slug',
        'country',
        'founded_year',
        'is_featured',
        'product_count_inline',
        'created_at',
    )
    list_filter = ('is_featured', 'country')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('is_featured',)
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'logo', 'country', 'founded_year')
        }),
        ('Details', {
            'fields': ('description', 'story')
        }),
        ('Display', {
            'fields': ('is_featured',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Products')
    def product_count_inline(self, obj):
        return obj.product_count


# ============================================================================
# Product Admin
# ============================================================================


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model."""

    list_display = (
        'name',
        'slug',
        'category',
        'brand',
        'price',
        'compare_at_price',
        'status',
        'stock_count',
        'is_featured',
        'is_new_arrival',
        'is_best_seller',
        'is_trending',
        'rating',
        'review_count',
        'created_at',
    )
    list_filter = (
        'status',
        'category',
        'brand',
        'is_featured',
        'is_new_arrival',
        'is_best_seller',
        'is_trending',
    )
    search_fields = ('name', 'slug', 'sku', 'description', 'tags')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = (
        'status',
        'is_featured',
        'is_new_arrival',
        'is_best_seller',
        'is_trending',
    )
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'rating', 'review_count')
    filter_horizontal = ()
    inlines = [ProductImageInline]
    date_hierarchy = 'created_at'

    fieldsets = (
        (None, {
            'fields': (
                'name', 'slug', 'category', 'brand', 'status',
            )
        }),
        ('Pricing', {
            'fields': (
                'price', 'compare_at_price', 'currency',
            )
        }),
        ('Inventory', {
            'fields': ('sku', 'stock_count', 'weight_kg')
        }),
        ('Details', {
            'fields': (
                'short_description', 'description', 'material', 'care_instructions',
                'sizes', 'colors',
            )
        }),
        ('Flags', {
            'fields': (
                'is_featured', 'is_new_arrival', 'is_best_seller', 'is_trending',
            )
        }),
        ('SEO & Tags', {
            'fields': ('tags', 'meta_title', 'meta_description')
        }),
        ('Stats', {
            'fields': ('rating', 'review_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


# ============================================================================
# Review Admin
# ============================================================================


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin interface for Review model."""

    list_display = (
        'product',
        'user',
        'user_name',
        'rating',
        'title',
        'is_verified_purchase',
        'created_at',
    )
    list_filter = (
        'rating',
        'is_verified_purchase',
        'created_at',
    )
    search_fields = (
        'title',
        'comment',
        'user_name',
        'product__name',
    )
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    list_editable = ('is_verified_purchase',)

    fieldsets = (
        (None, {
            'fields': ('product', 'user', 'user_name', 'rating', 'title', 'comment')
        }),
        ('Flags', {
            'fields': ('is_verified_purchase',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )
