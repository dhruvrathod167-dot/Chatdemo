from django.contrib import admin

from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'user', 'provider', 'status',
        'currency', 'amount', 'created_at',
    ]
    list_filter = ['provider', 'status', 'currency', 'created_at']
    search_fields = [
        'provider_payment_id', 'provider_order_id',
        'order__order_number', 'user__email',
    ]
    readonly_fields = [
        'id', 'raw_response', 'created_at', 'updated_at',
    ]
    date_hierarchy = 'created_at'
