import uuid
import logging

from django.conf import settings
from django.db import models
from django.db.models import Avg, Count
from django.utils.text import slugify

logger = logging.getLogger('maison_api')

AUTH_USER_MODEL = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')


class Category(models.Model):
    """
    Product category with hierarchical structure.

    Supports unlimited nesting via self-referential FK.
    Used to organize products into browsable collections.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name='Category Name')
    slug = models.SlugField(unique=True, db_index=True, verbose_name='Slug')
    description = models.TextField(blank=True, verbose_name='Description')
    image = models.ImageField(
        upload_to='categories/',
        blank=True,
        verbose_name='Category Image',
    )
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children',
        verbose_name='Parent Category',
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Featured',
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='Sort Order',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'/categories/{self.slug}/'

    @property
    def product_count(self):
        return self.products.filter(status='ACTIVE').count()


class Brand(models.Model):
    """
    Brand / designer label.

    Stores brand information, logo, origin story,
    and country of origin for the storefront.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name='Brand Name')
    slug = models.SlugField(unique=True, db_index=True, verbose_name='Slug')
    description = models.TextField(blank=True, verbose_name='Description')
    logo = models.ImageField(
        upload_to='brands/',
        blank=True,
        verbose_name='Brand Logo',
    )
    story = models.TextField(blank=True, verbose_name='Brand Story')
    country = models.CharField(max_length=100, blank=True, verbose_name='Country')
    founded_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Founded Year',
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Featured',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'brands'
        verbose_name = 'Brand'
        verbose_name_plural = 'Brands'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def product_count(self):
        return self.products.filter(status='ACTIVE').count()


class Product(models.Model):
    """
    Core product model for the MAISON luxury fashion eCommerce platform.

    Stores all product details including pricing, attributes,
    SEO metadata, and status flags for storefront filtering.
    """

    STATUS_DRAFT = 'DRAFT'
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_ARCHIVED = 'ARCHIVED'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500, verbose_name='Product Name')
    slug = models.SlugField(unique=True, db_index=True, verbose_name='Slug')
    description = models.TextField(blank=True, verbose_name='Description')
    short_description = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Short Description',
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Price',
    )
    compare_at_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Compare-at Price',
    )
    currency = models.CharField(
        max_length=3,
        default='USD',
        verbose_name='Currency',
    )
    sku = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        verbose_name='SKU',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name='Category',
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Brand',
    )
    sizes = models.JSONField(
        default=list,
        verbose_name='Available Sizes',
    )
    colors = models.JSONField(
        default=list,
        verbose_name='Available Colors',
    )
    material = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Material',
    )
    care_instructions = models.TextField(
        blank=True,
        verbose_name='Care Instructions',
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Featured',
    )
    is_new_arrival = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='New Arrival',
    )
    is_best_seller = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Best Seller',
    )
    is_trending = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Trending',
    )
    stock_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Stock Count',
    )
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Weight (kg)',
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Tags',
    )
    meta_title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Meta Title',
    )
    meta_description = models.TextField(
        blank=True,
        verbose_name='Meta Description',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        verbose_name='Status',
    )
    rating = models.FloatField(
        default=0,
        verbose_name='Average Rating',
    )
    review_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Review Count',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug'], name='idx_product_slug'),
            models.Index(fields=['status'], name='idx_product_status'),
            models.Index(fields=['price'], name='idx_product_price'),
            models.Index(fields=['is_featured'], name='idx_product_featured'),
            models.Index(fields=['is_new_arrival'], name='idx_product_new_arrival'),
            models.Index(fields=['is_best_seller'], name='idx_product_best_seller'),
            models.Index(fields=['is_trending'], name='idx_product_trending'),
            models.Index(fields=['category'], name='idx_product_category'),
            models.Index(fields=['brand'], name='idx_product_brand'),
        ]

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'/products/{self.slug}/'

    @property
    def first_image(self):
        """
        Return the first image associated with this product, if any.
        Uses ProductImage model if it exists, otherwise returns None.
        """
        try:
            image = self.images.first()
            if image and image.image:
                return image.image.url
        except Exception:
            pass
        return None

    def update_rating(self):
        """
        Recalculate the average rating and review count from all reviews.
        Called by the post_save / post_delete signals on Review.
        """
        agg = self.reviews.aggregate(
            avg_rating=Avg('rating'),
            total_reviews=Count('id'),
        )
        self.rating = round(agg['avg_rating'] or 0, 1)
        self.review_count = agg['total_reviews'] or 0
        self.save(update_fields=['rating', 'review_count', 'updated_at'])


class ProductImage(models.Model):
    """
    Multiple images per product.

    Supports an explicit sort order and an optional alt-text field.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='Product',
    )
    image = models.ImageField(
        upload_to='products/',
        verbose_name='Image',
    )
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Alt Text',
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='Sort Order',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')

    class Meta:
        db_table = 'product_images'
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        return f'Image for {self.product.name} (order {self.sort_order})'


class Review(models.Model):
    """
    Product review submitted by authenticated (or guest) users.

    Each user can leave at most one review per product (enforced by
    unique_together). On save/delete, the parent product's aggregate
    rating and review count are recalculated via signals.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='Product',
    )
    user = models.ForeignKey(
        AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='User',
    )
    user_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='User Name',
    )
    rating = models.PositiveIntegerField(
        verbose_name='Rating',
        validators=[
            models.MinValueValidator(1),
            models.MaxValueValidator(5),
        ],
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Review Title',
    )
    comment = models.TextField(
        blank=True,
        verbose_name='Comment',
    )
    is_verified_purchase = models.BooleanField(
        default=False,
        verbose_name='Verified Purchase',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')

    class Meta:
        db_table = 'reviews'
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']
        unique_together = [['product', 'user']]

    def __str__(self):
        name = self.user_name or (self.user.get_full_name() if self.user else 'Anonymous')
        return f'Review by {name} on {self.product.name}'
