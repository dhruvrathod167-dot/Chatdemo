from django.contrib import admin

from .models import Order, OrderItem, OrderStatus


# ============================================================================
# OrderItem Inline
# ============================================================================


class OrderItemInline(admin.TabularInline):
    """Inline admin for order items."""

    model = OrderItem
    extra = 0
    readonly_fields = (
        'id', 'product_id', 'product_name', 'product_price',
        'quantity', 'size', 'color', 'image', 'total', 'created_at',
    )
    fields = (
        'product_id', 'product_name', 'product_price',
        'quantity', 'size', 'color', 'image', 'total',
    )
    can_delete = False
    max_num = 0
    show_change_link = False


# ============================================================================
# Order Admin
# ============================================================================


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Admin interface for Order model."""

    list_display = (
        'order_number',
        'user_email',
        'status',
        'total',
        'currency',
        'payment_method',
        'is_paid',
        'item_count_inline',
        'created_at',
    )
    list_filter = (
        'status',
        'payment_method',
        'created_at',
        'paid_at',
    )
    search_fields = (
        'order_number',
        'user__email',
        'user__first_name',
        'user__last_name',
        'tracking_number',
        'payment_id',
    )
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    readonly_fields = (
        'id',
        'order_number',
        'subtotal',
        'discount_amount',
        'shipping_cost',
        'tax_amount',
        'total',
        'currency',
        'created_at',
        'updated_at',
    )
    inlines = [OrderItemInline]

    fieldsets = (
        (None, {
            'fields': (
                'user', 'order_number', 'status',
            )
        }),
        ('Totals', {
            'fields': (
                'subtotal', 'discount_amount', 'shipping_cost',
                'tax_amount', 'total', 'currency',
            )
        }),
        ('Payment', {
            'fields': (
                'payment_method', 'payment_id', 'paid_at',
                'coupon',
            )
        }),
        ('Addresses', {
            'fields': ('shipping_address', 'billing_address'),
            'classes': ('wide',),
        }),
        ('Shipping & Notes', {
            'fields': (
                'tracking_number', 'notes',
            )
        }),
        ('System', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Items')
    def item_count_inline(self, obj):
        return obj.item_count

    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email if obj.user else 'Guest'

    @admin.display(boolean=True, description='Paid')
    def is_paid(self, obj):
        return obj.is_paid

    is_paid.admin_order_field = 'paid_at'

    actions = ['mark_as_confirmed', 'mark_as_processing', 'mark_as_shipped', 'mark_as_delivered']

    @admin.action(description='Mark selected orders as Confirmed')
    def mark_as_confirmed(self, request, queryset):
        updated = queryset.filter(status=OrderStatus.PENDING).update(status=OrderStatus.CONFIRMED)
        self.message_user(request, f'{updated} orders marked as confirmed.')

    @admin.action(description='Mark selected orders as Processing')
    def mark_as_processing(self, request, queryset):
        updated = queryset.filter(status=OrderStatus.CONFIRMED).update(status=OrderStatus.PROCESSING)
        self.message_user(request, f'{updated} orders marked as processing.')

    @admin.action(description='Mark selected orders as Shipped')
    def mark_as_shipped(self, request, queryset):
        updated = queryset.filter(status=OrderStatus.PROCESSING).update(status=OrderStatus.SHIPPED)
        self.message_user(request, f'{updated} orders marked as shipped.')

    @admin.action(description='Mark selected orders as Delivered')
    def mark_as_delivered(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status=OrderStatus.SHIPPED).update(
            status=OrderStatus.DELIVERED,
            paid_at=timezone.now(),
        )
        self.message_user(request, f'{updated} orders marked as delivered.')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    """Admin interface for OrderItem model (standalone view)."""

    list_display = (
        'order',
        'product_name',
        'product_price',
        'quantity',
        'size',
        'color',
        'total',
        'created_at',
    )
    list_filter = ('size', 'color', 'created_at')
    search_fields = ('product_name', 'product_id', 'order__order_number')
    readonly_fields = ('id', 'total', 'created_at')
    ordering = ('-created_at',)
