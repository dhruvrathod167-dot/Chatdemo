from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, OpenApiParameter

logger = __import__('logging').getLogger('maison_api')


@extend_schema(
    tags=['Search'],
    parameters=[
        OpenApiParameter(
            name='q',
            type=str,
            location='query',
            description='Search query string.',
            required=True,
        ),
        OpenApiParameter(
            name='category',
            type=str,
            location='query',
            description='Filter by category slug.',
        ),
        OpenApiParameter(
            name='brand',
            type=str,
            location='query',
            description='Filter by brand slug.',
        ),
        OpenApiParameter(
            name='min_price',
            type=float,
            location='query',
            description='Minimum price filter.',
        ),
        OpenApiParameter(
            name='max_price',
            type=float,
            location='query',
            description='Maximum price filter.',
        ),
        OpenApiParameter(
            name='sort',
            type=str,
            location='query',
            description='Sort order: price_asc, price_desc, newest, rating.',
            enum=['price_asc', 'price_desc', 'newest', 'rating'],
        ),
        OpenApiParameter(
            name='page',
            type=int,
            location='query',
            description='Page number (1-indexed).',
        ),
        OpenApiParameter(
            name='page_size',
            type=int,
            location='query',
            description='Number of results per page (max 48).',
        ),
    ],
    responses={200: None},
)
class ProductSearchView(APIView):
    """
    Full-text product search with faceted filtering.

    Uses Elasticsearch when available, falls back to database
    full-text search when ES is not connected.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {'error': 'Search query parameter \'q\' is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Try Elasticsearch first
        results = self._elasticsearch_search(request, query)
        if results is not None:
            return Response(results)

        # Fallback to database search
        results = self._database_search(request, query)
        return Response(results)

    def _elasticsearch_search(self, request, query):
        """Attempt search via Elasticsearch."""
        try:
            from elasticsearch_dsl import Q
            from .documents import ProductDocument

            search = ProductDocument.search()

            # Multi-match query across name, description, brand, tags
            must = [
                Q(
                    'multi_match',
                    query=query,
                    fields=[
                        'name^3',
                        'name.keyword^2',
                        'brand_name^2',
                        'brand_name.keyword',
                        'category_name^1.5',
                        'tags^2',
                        'short_description',
                        'description',
                    ],
                    type='best_fields',
                    fuzziness='AUTO',
                )
            ]

            filters = []

            # Category filter
            category = request.query_params.get('category')
            if category:
                filters.append(Q('term', category_slug=category))

            # Brand filter
            brand = request.query_params.get('brand')
            if brand:
                filters.append(Q('term', brand_slug=brand))

            # Price range
            min_price = request.query_params.get('min_price')
            if min_price:
                filters.append(Q('range', price={'gte': float(min_price)}))

            max_price = request.query_params.get('max_price')
            if max_price:
                filters.append(Q('range', price={'lte': float(max_price)}))

            # Active only
            filters.append(Q('term', is_active=True))

            query_dsl = Q('bool', must=must, filter=filters)
            search = search.query(query_dsl)

            # Sorting
            sort = request.query_params.get('sort', 'relevance')
            if sort == 'price_asc':
                search = search.sort('price')
            elif sort == 'price_desc':
                search = search.sort('-price')
            elif sort == 'newest':
                search = search.sort('-created_at')
            elif sort == 'rating':
                search = search.sort('-rating')

            # Pagination
            page = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 12)), 48)
            start = (page - 1) * page_size
            search = search[start:start + page_size]

            response = search.execute()

            hits = []
            for hit in response:
                hits.append({
                    'id': hit.meta.id,
                    'name': hit.name,
                    'slug': hit.slug,
                    'price': hit.price,
                    'sale_price': hit.sale_price,
                    'rating': hit.rating,
                    'review_count': hit.review_count,
                    'brand': hit.brand_name,
                    'category': hit.category_name,
                    'image': getattr(hit, 'image', None),
                })

            return {
                'query': query,
                'results': hits,
                'total': response.hits.total.value,
                'page': page,
                'page_size': page_size,
                'total_pages': (response.hits.total.value + page_size - 1) // page_size,
                'backend': 'elasticsearch',
            }

        except Exception:
            logger.warning('Elasticsearch unavailable, falling back to DB search')
            return None

    def _database_search(self, request, query):
        """Fallback database search using Django ORM."""
        from django.db.models import Q, Count
        from products.models import Product
        from products.serializers import ProductListSerializer

        qs = Product.objects.filter(
            status='ACTIVE',
        ).filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(brand__name__icontains=query)
            | Q(category__name__icontains=query)
            | Q(tags__icontains=query)
        ).select_related('brand', 'category').distinct()

        # Filters
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)

        brand = request.query_params.get('brand')
        if brand:
            qs = qs.filter(brand__slug=brand)

        min_price = request.query_params.get('min_price')
        if min_price:
            qs = qs.filter(price__gte=float(min_price))

        max_price = request.query_params.get('max_price')
        if max_price:
            qs = qs.filter(price__lte=float(max_price))

        # Sorting
        sort = request.query_params.get('sort', 'relevance')
        if sort == 'price_asc':
            qs = qs.order_by('price')
        elif sort == 'price_desc':
            qs = qs.order_by('-price')
        elif sort == 'newest':
            qs = qs.order_by('-created_at')
        elif sort == 'rating':
            qs = qs.order_by('-rating')

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 12)), 48)
        start = (page - 1) * page_size
        end = start + page_size

        total = qs.count()
        paginated_qs = qs[start:end]

        serializer = ProductListSerializer(
            paginated_qs, many=True, context={'request': request}
        )

        return {
            'query': query,
            'results': serializer.data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if total else 0,
            'backend': 'database',
        }
