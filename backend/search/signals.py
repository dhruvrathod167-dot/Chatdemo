"""
Search signals.

Hooks into product save/delete to keep the Elasticsearch index
in sync with the database. Falls back gracefully when ES is unavailable.
"""

import logging

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger('maison_api')


def _index_product(product):
    """Index a single product in Elasticsearch."""
    try:
        from .documents import ProductDocument
        doc = ProductDocument()
        doc.update(product)
        logger.debug(f'Indexed product {product.id} in Elasticsearch')
    except Exception:
        logger.warning(
            f'Elasticsearch indexing failed for product {product.id}; '
            'search may be unavailable',
            exc_info=True,
        )


def _remove_product(product):
    """Remove a product from the Elasticsearch index."""
    try:
        from .documents import ProductDocument
        doc = ProductDocument()
        doc.delete(product.id)
        logger.debug(f'Removed product {product.id} from Elasticsearch')
    except Exception:
        logger.warning(
            f'Elasticsearch removal failed for product {product.id}',
            exc_info=True,
        )


@receiver(post_save, sender='products.Product')
def product_saved(sender, instance, **kwargs):
    _index_product(instance)


@receiver(post_delete, sender='products.Product')
def product_deleted(sender, instance, **kwargs):
    _remove_product(instance)
