import logging
from decimal import Decimal

from django.utils import timezone
from rest_framework import status, permissions, filters
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample

from core.exceptions import NotFoundError, BadRequestError
from core.permissions import IsAdminUser
from core.paginators import StandardResultSetPagination
from coupons.models import Coupon
from coupons.serializers import (
    CouponSerializer,
    CouponValidateSerializer,
    CouponAdminSerializer,
)

logger = logging.getLogger('maison_api')


# ============================================================================
# Public Coupon List
# ============================================================================

class CouponListView(ListAPIView):
    """
    List all currently active coupons available for use.
    
    Only returns coupons that are active and within their validity period.
    This is a public endpoint (no authentication required).
    """
    permission_classes = [AllowAny]
    pagination_class = StandardResultSetPagination
    serializer_class = CouponSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['valid_from', 'value', 'code']
    ordering = ['valid_from']

    def get_queryset(self):
        """
        Only return active coupons that are currently valid.
        """
        now = timezone.now()
        return Coupon.objects.filter(
            is_active=True,
            valid_from__lte=now,
            valid_until__gte=now,
        )

    @extend_schema(
        operation_id='coupon_list',
        summary='List Active Coupons',
        description=(
            'List all currently active and valid coupons. '
            'This is a public endpoint — no authentication required.'
        ),
        tags=['Coupons'],
        responses={
            200: CouponSerializer(many=True),
        },
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


# ============================================================================
# Coupon Validation
# ============================================================================

class CouponValidateView(APIView):
    """
    Validate a coupon code against an order amount.
    
    Returns the discount details (amount, type, final total) if valid,
    or an error with a descriptive message if not.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        operation_id='coupon_validate',
        summary='Validate Coupon Code',
        description=(
            'Validate a coupon code against an order amount. '
            'Returns the discount amount, coupon type, and final total '
            'if the coupon is valid. Otherwise returns an error message.'
        ),
        tags=['Coupons'],
        request=CouponValidateSerializer,
        responses={
            200: OpenApiResponse(
                description='Coupon is valid.',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'is_valid': True,
                            'coupon_code': 'SAVE20',
                            'type': 'PERCENTAGE',
                            'discount_amount': '40.00',
                            'order_amount': '200.00',
                            'final_total': '160.00',
                        }
                    )
                ],
            ),
            400: OpenApiResponse(description='Invalid coupon or requirements not met.'),
        },
    )
    def post(self, request):
        serializer = CouponValidateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        coupon = serializer._coupon
        discount = serializer._discount
        order_amount = serializer.validated_data['order_amount']
        final_total = serializer._final_total

        from core.utils import format_currency

        return Response({
            'is_valid': True,
            'coupon_code': coupon.code,
            'type': coupon.type,
            'type_display': coupon.get_type_display(),
            'discount_amount': format_currency(discount),
            'order_amount': format_currency(order_amount),
            'final_total': format_currency(final_total),
        })


# ============================================================================
# Admin Coupon Management
# ============================================================================

class AdminCouponViewSet(ModelViewSet):
    """
    Admin-only ViewSet for full coupon CRUD management.
    
    Supports creating, listing, retrieving, updating, and deleting coupons.
    Only accessible by staff/admin users.
    """
    queryset = Coupon.objects.all()
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultSetPagination
    serializer_class = CouponAdminSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code']
    ordering_fields = ['code', 'type', 'value', 'valid_from', 'valid_until', 'is_active', 'used_count']
    ordering = ['-created_at']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @extend_schema(
        operation_id='admin_coupon_list',
        summary='Admin: List All Coupons',
        description='List all coupons (including inactive/expired). Admin only.',
        tags=['Admin - Coupons'],
        responses={
            200: CouponAdminSerializer(many=True),
            403: OpenApiResponse(description='Admin access required.'),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        operation_id='admin_coupon_create',
        summary='Admin: Create Coupon',
        description='Create a new coupon. Admin only.',
        tags=['Admin - Coupons'],
        request=CouponAdminSerializer,
        responses={
            201: CouponAdminSerializer,
            400: OpenApiResponse(description='Validation error.'),
            403: OpenApiResponse(description='Admin access required.'),
        },
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        operation_id='admin_coupon_retrieve',
        summary='Admin: Get Coupon Details',
        description='Retrieve a specific coupon by ID. Admin only.',
        tags=['Admin - Coupons'],
        responses={
            200: CouponAdminSerializer,
            403: OpenApiResponse(description='Admin access required.'),
            404: OpenApiResponse(description='Coupon not found.'),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        operation_id='admin_coupon_update',
        summary='Admin: Update Coupon',
        description='Fully update a coupon. Admin only.',
        tags=['Admin - Coupons'],
        request=CouponAdminSerializer,
        responses={
            200: CouponAdminSerializer,
            400: OpenApiResponse(description='Validation error.'),
            403: OpenApiResponse(description='Admin access required.'),
            404: OpenApiResponse(description='Coupon not found.'),
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        operation_id='admin_coupon_partial_update',
        summary='Admin: Partially Update Coupon',
        description='Partially update a coupon. Admin only.',
        tags=['Admin - Coupons'],
        request=CouponAdminSerializer,
        responses={
            200: CouponAdminSerializer,
            400: OpenApiResponse(description='Validation error.'),
            403: OpenApiResponse(description='Admin access required.'),
            404: OpenApiResponse(description='Coupon not found.'),
        },
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        operation_id='admin_coupon_delete',
        summary='Admin: Delete Coupon',
        description='Delete a coupon. Admin only.',
        tags=['Admin - Coupons'],
        responses={
            204: OpenApiResponse(description='Coupon deleted.'),
            403: OpenApiResponse(description='Admin access required.'),
            404: OpenApiResponse(description='Coupon not found.'),
        },
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
