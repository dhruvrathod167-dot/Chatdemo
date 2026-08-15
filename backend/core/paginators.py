"""
Custom Pagination Classes for MAISON

Provides consistent pagination behaviour across all API endpoints.
StandardResultSetPagination is the global default (page_size=20).
ProductPagination uses a smaller page size (12) optimized for
product grid layouts in the storefront.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultSetPagination(PageNumberPagination):
    """
    Standard pagination for most API endpoints.

    - Default page size: 20 items per page
    - Maximum page size: 100 items (prevents excessive queries)
    - Page size is controlled via the `page_size` query parameter
    - Page number is controlled via the `page` query parameter
    """

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        """
        Return a paginated response with rich metadata.

        Response format:
        {
            "count": <total_items>,
            "next": <next_page_url_or_null>,
            "previous": <previous_page_url_or_null>,
            "current_page": <current_page_number>,
            "total_pages": <total_number_of_pages>,
            "page_size": <items_per_page>,
            "results": [<...paginated_items...>]
        }
        """
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'page_size': self.get_page_size(self.request),
            'results': data,
        })


class ProductPagination(PageNumberPagination):
    """
    Pagination optimized for product listing grids.

    Uses a smaller default page size (12) to match typical
    e-commerce grid layouts (3x4, 4x3, 2x6, etc.).
    The maximum is capped at 48 to ensure responsive rendering.
    """

    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 48
    page_query_param = 'page'

    def get_paginated_response(self, data):
        """
        Return a paginated response with rich metadata.

        Uses the same response format as StandardResultSetPagination
        for consistency across the API.
        """
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'page_size': self.get_page_size(self.request),
            'results': data,
        })