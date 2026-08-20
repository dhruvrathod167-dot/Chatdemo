import logging

from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.utils.text import slugify

from .models import Category, Brand, Product, Review

logger = logging.getLogger('maison_api')


# ============================================================================
# Auto-generate slug from name on pre_save
# ============================================================================

@receiver(pre_save, sender=Product)
def auto_generate_product_slug(sender, instance, **kwargs):
    """
    Automatically generate a URL slug from the product name when:
    - The slug is empty, or
    - The name has changed and slug has not been manually set.
    """
    if not instance.slug:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1

        # Ensure uniqueness by appending counter suffix if needed
        queryset = Product.objects.filter(slug=slug)
        if instance.pk:
            queryset = queryset.exclude(pk=instance.pk)

        while queryset.exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
            queryset = Product.objects.filter(slug=slug)
            if instance.pk:
                queryset = queryset.exclude(pk=instance.pk)

        instance.slug = slug
        logger.debug(f'Auto-generated slug for product: {instance.slug}')


@receiver(pre_save, sender=Category)
def auto_generate_category_slug(sender, instance, **kwargs):
    """
    Automatically generate a URL slug from the category name.
    """
    if not instance.slug:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1

        queryset = Category.objects.filter(slug=slug)
        if instance.pk:
            queryset = queryset.exclude(pk=instance.pk)

        while queryset.exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
            queryset = Category.objects.filter(slug=slug)
            if instance.pk:
                queryset = queryset.exclude(pk=instance.pk)

        instance.slug = slug
        logger.debug(f'Auto-generated slug for category: {instance.slug}')


@receiver(pre_save, sender=Brand)
def auto_generate_brand_slug(sender, instance, **kwargs):
    """
    Automatically generate a URL slug from the brand name.
    """
    if not instance.slug:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1

        queryset = Brand.objects.filter(slug=slug)
        if instance.pk:
            queryset = queryset.exclude(pk=instance.pk)

        while queryset.exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
            queryset = Brand.objects.filter(slug=slug)
            if instance.pk:
                queryset = queryset.exclude(pk=instance.pk)

        instance.slug = slug
        logger.debug(f'Auto-generated slug for brand: {instance.slug}')


# ============================================================================
# Update product aggregate rating on review save / delete
# ============================================================================

@receiver(post_save, sender=Review)
def update_product_rating_on_review_save(sender, instance, created, **kwargs):
    """
    When a review is created or updated, recalculate the parent
    product's average rating and review count.
    """
    product = instance.product
    product.update_rating()
    logger.info(
        f'Updated product rating for "{product.name}" '
        f'after review save (rating={product.rating}, count={product.review_count})'
    )


@receiver(post_delete, sender=Review)
def update_product_rating_on_review_delete(sender, instance, **kwargs):
    """
    When a review is deleted, recalculate the parent product's
    average rating and review count.
    """
    product = instance.product
    product.update_rating()
    logger.info(
        f'Updated product rating for "{product.name}" '
        f'after review delete (rating={product.rating}, count={product.review_count})'
    )
