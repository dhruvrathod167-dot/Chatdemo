from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from users.models import User, UserAddress


class UserAdmin(BaseUserAdmin):
    """
    Custom admin configuration for the User model.

    Extends Django's built-in UserAdmin, replacing username
    with email as the primary identifier.
    """
    list_display = (
        'email',
        'first_name',
        'last_name',
        'is_staff',
        'is_active',
        'is_verified',
        'reward_points',
        'date_joined',
        'last_login',
    )
    list_filter = (
        'is_staff',
        'is_superuser',
        'is_active',
        'is_verified',
    )
    search_fields = (
        'email',
        'first_name',
        'last_name',
        'phone',
    )
    ordering = ('-date_joined',)
    filter_horizontal = ()

    fieldsets = (
        ('Personal Information', {
            'fields': ('email', 'first_name', 'last_name', 'phone', 'avatar')
        }),
        ('Permissions', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'is_verified',
                'groups',
                'user_permissions',
            )
        }),
        ('Account Metadata', {
            'fields': ('reward_points', 'addresses', 'date_joined', 'last_login')
        }),
    )

    add_fieldsets = (
        ('Create User', {
            'classes': ('wide',),
            'fields': (
                'email',
                'first_name',
                'last_name',
                'password1',
                'password2',
                'is_staff',
                'is_superuser',
                'is_active',
                'is_verified',
            ),
        }),
    )

    readonly_fields = ('date_joined', 'last_login')


class UserAddressAdmin(admin.ModelAdmin):
    """
    Admin configuration for the UserAddress model.
    """
    list_display = (
        'user',
        'label',
        'city',
        'state',
        'country',
        'postal_code',
        'is_default',
        'created_at',
    )
    list_filter = ('country', 'is_default', 'created_at')
    search_fields = (
        'user__email',
        'user__first_name',
        'user__last_name',
        'label',
        'city',
        'postal_code',
    )
    ordering = ('-created_at',)
    list_select_related = ('user',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('User', {
            'fields': ('user', 'label', 'is_default')
        }),
        ('Contact', {
            'fields': ('first_name', 'last_name', 'phone')
        }),
        ('Address', {
            'fields': (
                'address_line_1',
                'address_line_2',
                'city',
                'state',
                'postal_code',
                'country',
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


admin.site.register(User, UserAdmin)
admin.site.register(UserAddress, UserAddressAdmin)
