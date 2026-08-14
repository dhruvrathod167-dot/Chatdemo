import logging

from django.utils import timezone
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework import status, viewsets
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    CreateAPIView,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import NotFoundError, BadRequestError, ForbiddenError, UnauthorizedError
from core.permissions import IsAdminUser, IsOwnerOrReadOnly, IsAuthenticatedAndActive
from core.paginators import StandardResultSetPagination, ProductPagination

from .models import Order, OrderItem, OrderStatus
from .serializers import (
    OrderItemSerializer,
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateSerializer,
    OrderStatusUpdateSerializer,
    OrderCancelSerializer,
    AdminOrderDetailSerializer,
)
from .services import OrderService

logger = logging.getLogger('maison_api')


# ============================================================================
# Filters
# ============================================================================

class OrderFilter(filters.FilterSet):
    """Filter set for order listing."""

    status = filters.CharFilter(field_name='status')
    min_total = filters.NumberFilter(field_name='total', lookup_expr='gte')
    max_total = filters.NumberFilter(field_name='total', lookup_expr='lte')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    payment_method = filters.CharFilter(field_name='payment_method')

    class Meta:
        model = Order
        fields = [
            'status',
            'min_total',
            'max_total',
            'date_from',
            'date_to',
            'payment_method',
        ]


class AdminOrderFilter(filters.FilterSet):
    """Extended filter set for admin order listing."""

    status = filters.CharFilter(field_name='status')
    min_total = filters.NumberFilter(field_name='total', lookup_expr='gte')
    max_total = filters.NumberFilter(field_name='total', lookup_expr='lte')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    payment_method = filters.CharFilter(field_name='payment_method')
    is_paid = filters.BooleanFilter(method='filter_is_paid')
    user = filters.NumberFilter(field_name='user__id')

    class Meta:
        model = Order
        fields = [
            'status',
            'min_total',
            'max_total',
            'date_from',
            'date_to',
            'payment_method',
            'is_paid',
            'user',
        ]

    def filter_is_paid(self, queryset, name, value):
        if value:
            return queryset.filter(paid_at__isnull=False)
        return queryset.filter(paid_at__isnull=True)


# ============================================================================
# Order Views (User)
# ============================================================================

@extend_schema(
    tags=['Orders'],
    summary='List user orders',
    description='Retrieve a paginated list of orders for the authenticated user.',
    responses={200: OrderListSerializer(many=True)},
)
class OrderListView(ListAPIView):
    """
    List all orders for the authenticated user.
    """

    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultSetPagination
    filterset_class = OrderFilter

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user,
        ).prefetch_related('items')


@extend_schema(
    tags=['Orders'],
    summary='Retrieve an order',
    description='Get detailed information about a single order including all items.',
    responses={200: OrderDetailSerializer},
)
class OrderDetailView(RetrieveAPIView):
    """
    Retrieve a single order by its ID.

    Only the order owner (or admin) can access the detail.
    """

    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user,
        ).prefetch_related('items', 'items__order')


@extend_schema(
    tags=['Orders'],
    summary='Create an order from cart',
    description='Create a new order from the user\'s cart. Clears the cart after successful order creation.',
    request=OrderCreateSerializer,
    responses={201: OrderDetailSerializer},
)
class OrderCreateView(CreateAPIView):
    """
    Create an order from the user's cart.

    Validates cart items, applies coupon (if provided),
    calculates tax and shipping, creates the order, and
    clears the cart.
    """

    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticatedAndActive]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@extend_schema(
    tags=['Orders'],
    summary='Cancel an order',
    description='Cancel a pending or confirmed order. Stock is restored if the order was paid.',
    request=OrderCancelSerializer,
    responses={200: OrderDetailSerializer},
)
class OrderCancelView(APIView):
    """
    Cancel an order.

    Only the order owner can cancel. Only orders in PENDING or
    CONFIRMED status can be cancelled. If the order was paid,
    stock will be restored.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=OrderCancelSerializer,
        responses={200: OrderDetailSerializer},
    )
    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            raise NotFoundError('Order not found.')

        if order.user != request.user:
            raise ForbiddenError('You do not have permission to cancel this order.')

        serializer = OrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get('reason', '')
        order = OrderService.cancel_order(order, reason=reason)

        return Response(
            OrderDetailSerializer(order, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=['Orders'],
    summary='Track an order',
    description='Get tracking information for an order by its order number.',
    parameters=[
        OpenApiParameter(
            name='order_number',
            type=str,
            location='path',
            description='The order number (e.g., MSN-20260814-A3F9K)',
        ),
    ],
    responses={200: OrderDetailSerializer},
)
class OrderTrackingView(APIView):
    """
    Track an order by its order number.

    Anyone with the order number can view tracking info.
    Sensitive data (full addresses) is not included.
    """

    permission_classes = [AllowAny]

    def get(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundError(f'Order with number {order_number} not found.')

        # Verify ownership or allow public tracking
        if order.user and request.user.is_authenticated:
            if order.user != request.user and not request.user.is_staff:
                raise ForbiddenError('You do not have permission to track this order.')

        data = {
            'order_number': order.order_number,
            'status': order.status,
            'status_display': order.get_status_display(),
            'tracking_number': order.tracking_number,
            'payment_method': order.payment_method,
            'paid_at': order.paid_at,
            'created_at': order.created_at,
            'updated_at': order.updated_at,
            'item_count': order.item_count,
        }

        return Response(data, status=status.HTTP_200_OK)


# ============================================================================
# Admin Order Views
# ============================================================================

@extend_schema(
    tags=['Admin - Orders'],
    summary='Admin order management',
    description='Full CRUD operations for orders. Admin access required.',
)
class AdminOrderViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for full order management.

    Supports listing, retrieving, updating (status), and
    deleting orders. Filtering by status, date range, payment,
    and user is available.
    """

    queryset = (
        Order.objects
        .select_related('user', 'coupon')
        .prefetch_related('items')
    )
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultSetPagination
    filterset_class = AdminOrderFilter

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        if self.action in ('update', 'partial_update'):
            return OrderStatusUpdateSerializer
        return AdminOrderDetailSerializer

    def get_queryset(self):
        return super().get_queryset()

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(
            data=request.data,
            context={'order': order},
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        tracking_number = serializer.validated_data.get('tracking_number', '')

        order = OrderService.update_order_status(order, new_status)

        if tracking_number:
            order.tracking_number = tracking_number
            order.save(update_fields=['tracking_number', 'updated_at'])

        return Response(
            AdminOrderDetailSerializer(order, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        raise ForbiddenError('Orders cannot be deleted. Use cancellation instead.')


@extend_schema(
    tags=['Admin - Orders'],
    summary='Admin order statistics',
    description='Get revenue, order count, and average order value. Supports date range filtering.',
    parameters=[
        OpenApiParameter(name='start_date', type=str, description='Start date (ISO 8601)'),
        OpenApiParameter(name='end_date', type=str, description='End date (ISO 8601)'),
    ],
    responses={200: dict},
)
class AdminOrderStatsView(APIView):
    """
    Get administrative order statistics.

    Supports optional date range filtering via query parameters.
    Returns revenue, order count, average order value, and
    breakdowns by status.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        from datetime import datetime

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        start_dt = None
        end_dt = None

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
            except (ValueError, TypeError):
                raise BadRequestError('Invalid start_date format. Use ISO 8601.')

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
            except (ValueError, TypeError):
                raise BadRequestError('Invalid end_date format. Use ISO 8601.')

        stats = OrderService.get_admin_stats(
            start_date=start_dt,
            end_date=end_dt,
        )

        return Response(stats, status=status.HTTP_200_OK)
