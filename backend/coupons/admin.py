from django.contrib import admin

from coupons.models import Coupon


class CouponAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Coupon model.
    """
    list_display = (
        'code',
        'type',
        'value',
        'min_order_amount',
        'max_discount_amount',
        'usage_limit',
        'used_count',
        'remaining_uses',
        'is_active',
        'valid_from',
        'valid_until',
        'created_at',
    )
    list_filter = (
        'type',
        'is_active',
        'valid_from',
        'valid_until',
    )
    search_fields = (
        'code',
    )
    ordering = ('-created_at',)
    readonly_fields = ('id', 'used_count', 'created_at', 'updated_at')

    fieldsets = (
        ('Coupon Details', {
            'fields': ('code', 'type', 'value', 'is_active')
        }),
        ('Limits', {
            'fields': (
                'min_order_amount',
                'max_discount_amount',
                'usage_limit',
                'used_count',
            )
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def remaining_uses(self, obj):
        """
        Calculate and display remaining uses.
        """
        if obj.usage_limit is None:
            return 'Unlimited'
        remaining = obj.usage_limit - obj.used_count
        if remaining <= 0:
            return '0 (exhausted)'
        return str(remaining)
    remaining_uses.short_description = 'Remaining Uses'
    remaining_uses.admin_order_field = None

    def get_readonly_fields(self, request, obj=None):
        """
        Make 'used_count' readonly when editing an existing coupon,
        but allow setting it when creating a new one.
        """
        if obj:
            return self.readonly_fields
        return ('id', 'created_at', 'updated_at')


admin.site.register(Coupon, CouponAdmin)
