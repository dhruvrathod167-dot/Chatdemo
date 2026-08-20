from django_elasticsearch_dsl import Document, Index, fields

from products.models import Product

# Use the setting from settings/base.py
PRODUCT_INDEX = Index('products')

PRODUCT_INDEX.settings(
    number_of_shards=1,
    number_of_replicas=0,
)


@PRODUCT_INDEX.doc_type
class ProductDocument(Document):
    """
    Elasticsearch document mapping for the Product model.

    Provides full-text search across name, description, brand,
    category, and tags with fuzzy matching support.
    """

    id = fields.KeywordField()
    name = fields.TextField(analyzer='standard', fields={'keyword': fields.KeywordField()})
    slug = fields.KeywordField()
    description = fields.TextField(analyzer='standard')
    short_description = fields.TextField(analyzer='standard')
    category_name = fields.TextField(analyzer='standard')
    category_slug = fields.KeywordField()
    brand_name = fields.TextField(analyzer='standard', fields={'keyword': fields.KeywordField()})
    brand_slug = fields.KeywordField()
    tags = fields.KeywordField(multi=True)
    price = fields.FloatField()
    sale_price = fields.FloatField()
    rating = fields.FloatField()
    review_count = fields.IntegerField()
    is_active = fields.BooleanField()
    is_featured = fields.BooleanField()
    is_new_arrival = fields.BooleanField()
    is_best_seller = fields.BooleanField()
    is_trending = fields.BooleanField()
    created_at = fields.DateField()

    class Django:
        model = Product
        fields = [
            'name', 'slug', 'description', 'short_description',
            'tags', 'price', 'sale_price', 'rating', 'review_count',
            'is_active', 'is_featured', 'is_new_arrival',
            'is_best_seller', 'is_trending', 'created_at',
        ]
        related_models = ['category', 'brand']

    def get_instances_from_related(self, related_instance):
        if isinstance(related_instance, (Product,)):
            return related_instance
        return related_instance.product_set.all()
