import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q, F, DecimalField

from core.utils import calculate_tax, format_currency, send_order_confirmation_email
from core.exceptions import BadRequestError, ForbiddenError

from .models import Order, OrderItem, OrderStatus

logger = logging.getLogger('maison_api')

FREE_SHIPPING_THRESHOLD = Decimal('500.00')
SHIPPING_COST = Decimal('25.00')
TAX_RATE = Decimal('0.08')


class OrderService:
    """
    Service layer for order operations.
    Encapsulates business logic for creating, updating, cancelling,
    and analysing orders.
    """

    @staticmethod
    @transaction.atomic
    def create_order(user, cart_items, shipping_address, billing_address,
                     coupon_code=None):
        """
        Create an order from cart items.
        Calculates subtotal, applies coupon discount, calculates
        tax (8%), and shipping (free over $500, otherwise $25).

        Args:
            user: The User instance placing the order.
            cart_items: QuerySet or list of CartItem objects.
            shipping_address (dict): Shipping address data.
            billing_address (dict): Billing address data.
            coupon_code (str, optional): Coupon code to apply.

        Returns:
            Order: The created order instance.

        Raises:
            BadRequestError: If cart is empty or coupon is invalid.
        """
        if not cart_items:
            raise BadRequestError('Cannot create order from an empty cart.')

        # Calculate subtotal
        subtotal = Decimal('0.00')
        order_items_data = []

        for item in cart_items:
            line_total = item.product_price * item.quantity
            subtotal += line_total
            order_items_data.append({                'product_id': item.product_id,
                'product_name': item.product_name,
                'product_price': item.product_price,
                'quantity': item.quantity,
                'size': item.size,
                'color': item.color,
                'image': item.product_image,
                'total': line_total,
            })

        discount_amount = Decimal('0.00')
        coupon = None

        # Apply coupon if provided
        if coupon_code:
            try:
                from coupons.models import Coupon

                coupon = Coupon.objects.get(code__iexact=coupon_code.strip())
                is_valid, reason = coupon.is_valid_for_use(order_amount=subtotal)
                if not is_valid:
                    raise BadRequestError(reason)

                discount_amount = coupon.calculate_discount(subtotal)

                # Increment used count
                coupon.used_count += 1
                coupon.save(update_fields=['used_count', 'updated_at'])
            except Coupon.DoesNotExist:
                raise BadRequestError('Invalid coupon code.')

        # Calculate shipping
        if subtotal >= FREE_SHIPPING_THRESHOLD or (coupon and coupon.type == 'FREE_SHIPPING'):
            shipping_cost = Decimal('0.00')
        else:
            shipping_cost = SHIPPING_COST

        # Calculate tax on (subtotal - discount)
        tax_base = subtotal - discount_amount
        if tax_base < 0:
            tax_base = Decimal('0.00')
        tax_amount = calculate_tax(tax_base, float(TAX_RATE))

        # Calculate total
        total = tax_base + shipping_cost + tax_amount

        # Create order
        order = Order(
            user=user,
            status=OrderStatus.PENDING,
            subtotal=subtotal,
            discount_amount=discount_amount,
            shipping_cost=shipping_cost,
            tax_amount=tax_amount,
            total=total,
            currency='USD',
            coupon=coupon,
            shipping_address=shipping_address,
            billing_address=billing_address,
        )
        order.save()

        # Create order items
        for item_data in order_items_data:
            OrderItem.objects.create(
                order=order,
                product_id=item_data['product_id'],
                product_name=item_data['product_name'],
                product_price=item_data['product_price'],
                quantity=item_data['quantity'],
                size=item_data.get('size', ''),
                color=item_data.get('color', ''),
                image=item_data.get('image', ''),
                total=item_data['total'],
            )

        # Send confirmation email (fire and forget)
        try:
            send_order_confirmation_email(order)
        except Exception as e:
            logger.warning(
                f'Failed to send order confirmation email for {order.order_number}: {e}'
            )

        logger.info(f'Order created: {order.order_number} — Total: {order.total}')
        return order

    @staticmethod
    def update_order_status(order, new_status):
        """
        Update an order's status with transition validation.
        Sends email notification on status change.

        Args:
            order (Order): The order to update.
            new_status (str): The target status.

        Returns:
            Order: The updated order instance.

        Raises:
            BadRequestError: If the transition is not valid.
        """
        new_status = new_status.upper()

        valid_statuses = [s[0] for s in OrderStatus.CHOICES]
        if new_status not in valid_statuses:
            raise BadRequestError(f'Invalid order status: {new_status}')

        if order.status in OrderStatus.TERMINAL:
            raise BadRequestError(
                f'Cannot update order in terminal status: {order.status}'
            )

        if not order.can_transition_to(new_status):
            raise BadRequestError(
                f'Invalid status transition from {order.status} to {new_status}'
            )

        old_status = order.status
        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])

        logger.info(
            f'Order {order.order_number} status updated: '
            f'{old_status} -> {new_status}'
        )

        # Send email notification on status change
        try:
            OrderService._send_status_change_email(order, old_status, new_status)
        except Exception as e:
            logger.warning(
                f'Failed to send status change email for {order.order_number}: {e}'
            )

        return order

    @staticmethod
    def cancel_order(order, reason=''):
        """
        Cancel an order.
        Restores stock if the order was paid.

        Args:
            order (Order): The order to cancel.
            reason (str): Optional cancellation reason.

        Returns:
            Order: The cancelled order.

        Raises:
            BadRequestError: If the order cannot be cancelled.
        """
        if order.status in OrderStatus.TERMINAL:
            raise BadRequestError(
                f'Cannot cancel order in status: {order.status}'
            )

        if not order.can_transition_to(OrderStatus.CANCELLED):
            raise BadRequestError(
                f'Cannot cancel order from status: {order.status}'
            )

        # Restore stock if order was paid
        if order.is_paid:
            OrderService._restore_stock(order)

        order.status = OrderStatus.CANCELLED
        order.notes = f'Cancelled. Reason: {reason}' if reason else 'Cancelled by user.'
        order.save(update_fields=['status', 'notes', 'updated_at'])

        logger.info(f'Order {order.order_number} cancelled. Reason: {reason}')
        return order

    @staticmethod
    def process_refund(order):
        """
        Mark an order as refunded.
        Validates that the order was paid before refunding.

        Args:
            order (Order): The order to refund.

        Returns:
            Order: The refunded order.

        Raises:
            BadRequestError: If the order was not paid.
        """
        if not order.is_paid:
            raise BadRequestError('Cannot refund an order that has not been paid.')

        if order.status != OrderStatus.DELIVERED:
            raise BadRequestError(
                'Only delivered orders can be refunded.'
            )

        # Restore stock
        OrderService._restore_stock(order)

        order.status = OrderStatus.REFUNDED
        order.save(update_fields=['status', 'updated_at'])

        logger.info(f'Order {order.order_number} refunded. Total: {order.total}')
        return order

    @staticmethod
    def get_order_summary(user):
        """
        Get order statistics for a user's dashboard.

        Returns:
            dict: Statistics including total_orders, total_spent,
            pending_orders, completed_orders, cancelled_orders,
            average_order_value.
        """
        qs = Order.objects.filter(user=user)
        stats = qs.aggregate(
            total_orders=Count('id'),
            total_spent=Sum(
                'total',
                filter=Q(status__in=[OrderStatus.CONFIRMED, OrderStatus.PROCESSING,
                                       OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            pending_orders=Count(
                'id',
                filter=Q(status=OrderStatus.PENDING),
            ),
            completed_orders=Count(
                'id',
                filter=Q(status=OrderStatus.DELIVERED),
            ),
            cancelled_orders=Count(
                'id',
                filter=Q(status=OrderStatus.CANCELLED),
            ),
            average_order_value=Avg(
                'total',
                filter=Q(status__in=[OrderStatus.CONFIRMED, OrderStatus.PROCESSING,
                                       OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        return {
            'total_orders': stats['total_orders'] or 0,
            'total_spent': stats['total_spent'] or Decimal('0.00'),
            'pending_orders': stats['pending_orders'] or 0,
            'completed_orders': stats['completed_orders'] or 0,
            'cancelled_orders': stats['cancelled_orders'] or 0,
            'average_order_value': round(stats['average_order_value'] or 0, 2),
        }

    @staticmethod
    def get_admin_stats(start_date=None, end_date=None):
        """
        Get administrative order statistics for a date range.

        Args:
            start_date (datetime, optional): Start of date range.
            end_date (datetime, optional): End of date range.

        Returns:
            dict: Revenue, order count, and average order value.
        """
        qs = Order.objects.all()

        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)

        stats = qs.aggregate(
            total_revenue=Sum('total', output_field=DecimalField(max_digits=12, decimal_places=2)),
            order_count=Count('id'),
            average_order_value=Avg('total', output_field=DecimalField(max_digits=12, decimal_places=2)),
            paid_order_count=Count(
                'id',
                filter=Q(paid_at__isnull=False),
            ),
            pending_order_count=Count(
                'id',
                filter=Q(status=OrderStatus.PENDING),
            ),
            cancelled_order_count=Count(
                'id',
                filter=Q(status=OrderStatus.CANCELLED),
            ),
            refunded_order_count=Count(
                'id',
                filter=Q(status=OrderStatus.REFUNDED),
            ),
        )

        return {
            'total_revenue': stats['total_revenue'] or Decimal('0.00'),
            'order_count': stats['order_count'] or 0,
            'average_order_value': round(stats['average_order_value'] or 0, 2),
            'paid_order_count': stats['paid_order_count'] or 0,
            'pending_order_count': stats['pending_order_count'] or 0,
            'cancelled_order_count': stats['cancelled_order_count'] or 0,
            'refunded_order_count': stats['refunded_order_count'] or 0,
        }

    @staticmethod
    def _restore_stock(order):
        """
        Restore stock for all items in an order.
        Used when cancelling or refunding a paid order.
        """
        try:
            from products.models import Product

            for item in order.items.all():
                Product.objects.filter(id=item.product_id).update(
                    stock_count=F('stock_count') + item.quantity
                )
            logger.info(f'Stock restored for order {order.order_number}')
        except Exception as e:
            logger.error(
                f'Failed to restore stock for order {order.order_number}: {e}'
            )

    @staticmethod
    def _send_status_change_email(order, old_status, new_status):
        """
        Send an email notification when order status changes.
        """
        if not order.user or not order.user.email:
            return

        user = order.user
        subject = f'Order Update — {order.order_number}'

        status_messages = {
            OrderStatus.CONFIRMED: 'Your order has been confirmed and is being prepared.',
            OrderStatus.PROCESSING: 'Your order is being processed and will ship soon.',
            OrderStatus.SHIPPED: (
                f'Your order has been shipped! '
                f'Tracking number: {order.tracking_number or "Not yet available"}'
            ),
            OrderStatus.DELIVERED: 'Your order has been delivered. We hope you enjoy your purchase!',
            OrderStatus.CANCELLED: 'Your order has been cancelled as requested.',
            OrderStatus.REFUNDED: f'A refund has been processed for your order. Total: {format_currency(order.total, order.currency)}',
        }

        message = status_messages.get(new_status, f'Your order status has been updated to {new_status}.')

        body = f"""Dear {user.get_full_name() or 'Valued Customer'},

{message}

Order Number: {order.order_number}
Previous Status: {old_status}
Current Status: {new_status}
Total: {format_currency(order.total, order.currency)}

If you have any questions, please don't hesitate to contact us.

With refined regards,
The MAISON Team"""

        try:
            from core.utils import send_email_async
            send_email_async(subject=subject, body=body, to=user.email)
        except Exception as e:
            logger.warning(f'Failed to queue status email: {e}')
