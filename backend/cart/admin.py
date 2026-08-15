from django.contrib import admin

from cart.models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    """
    Inline admin for cart items within the cart admin.
    """
    model = CartItem
    extra = 0
    readonly_fields = ('id', 'product_id', 'product_name', 'product_image', 'product_price', 'created_at', 'updated_at')
    fields = (
        'product_id', 'product_name', 'product_image',
        'product_price', 'quantity', 'size', 'color',
    )
    max_num = 0  # No adding via inline
    can_delete = True

    def get_line_total(self, obj):
        return obj.get_line_total()
    get_line_total.short_description = 'Line Total'


class CartAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Cart model.
    """
    list_display = (
        'id',
        'user',
        'session_id',
        'item_count',
        'subtotal',
        'coupon',
        'coupon_discount',
        'updated_at',
        'created_at',
    )
    list_filter = ('coupon', 'created_at', 'updated_at')
    search_fields = ('user__email', 'session_id', 'id')
    ordering = ('-updated_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'subtotal')
    inlines = [CartItemInline]
    list_select_related = ('user', 'coupon')

    fieldsets = (
        ('Cart Info', {
            'fields': ('id', 'user', 'session_id', 'coupon', 'coupon_discount')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def item_count(self, obj):
        return obj.get_item_count()
    item_count.short_description = 'Items'
    item_count.admin_order_field = None

    def subtotal(self, obj):
        from core.utils import format_currency
        return format_currency(obj.get_subtotal())
    subtotal.short_description = 'Subtotal'


class CartItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for the CartItem model.
    """
    list_display = (
        'id',
        'cart',
        'product_id',
        'product_name',
        'product_price',
        'quantity',
        'size',
        'color',
        'line_total',
        'created_at',
    )
    list_filter = ('size', 'color', 'created_at')
    search_fields = ('product_id', 'product_name', 'cart__id')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    list_select_related = ('cart',)

    def line_total(self, obj):
        from core.utils import format_currency
        return format_currency(obj.get_line_total())
    line_total.short_description = 'Line Total'


admin.site.register(Cart, CartAdmin)
admin.site.register(CartItem, CartItemAdmin)
