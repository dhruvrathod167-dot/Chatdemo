from decimal import Decimal

from rest_framework import serializers

from coupons.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    """
    Public-facing coupon serializer.
    
    Exposes basic coupon info for listing. Does not include
    sensitive admin fields like usage limits.
    """
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True,
    )
    
    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'type', 'type_display', 'value',
            'min_order_amount', 'max_discount_amount',
            'valid_from', 'valid_until', 'is_active',
        ]
        read_only_fields = fields


class CouponValidateSerializer(serializers.Serializer):
    """
    Serializer for validating a coupon code against an order amount.
    
    Returns the discount details if the coupon is valid,
    or an error message if not.
    """
    code = serializers.CharField(
        max_length=30,
        help_text='The coupon code to validate.',
    )
    order_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='The order subtotal to validate against.',
    )

    def validate_code(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Coupon code is required.')
        return value.strip().upper()

    def validate_order_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('Order amount cannot be negative.')
        return value

    def validate(self, attrs):
        code = attrs.get('code')
        order_amount = attrs.get('order_amount', Decimal('0.00'))

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError({
                'code': f'Coupon code "{code}" is not valid.'
            })

        # Check coupon validity
        is_valid, reason = coupon.is_valid_for_use(order_amount=order_amount)
        if not is_valid:
            raise serializers.ValidationError({'code': reason})

        # Calculate the discount
        discount = coupon.calculate_discount(order_amount)
        final_total = max(order_amount - discount, Decimal('0.00'))

        # Store for output
        self._coupon = coupon
        self._discount = discount
        self._final_total = final_total

        return attrs


class CouponAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer for full coupon management.
    
    Includes all fields for CRUD operations by admin users.
    """
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True,
    )
    remaining_uses = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'type', 'type_display', 'value',
            'min_order_amount', 'max_discount_amount',
            'usage_limit', 'used_count', 'remaining_uses',
            'valid_from', 'valid_until', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'used_count', 'remaining_uses', 'created_at', 'updated_at']

    def validate_code(self, value):
        """
        Ensure the coupon code is unique (case-insensitive).
        """
        code_upper = value.strip().upper()
        qs = Coupon.objects.filter(code=code_upper)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A coupon with this code already exists.')
        return code_upper

    def validate_value(self, value):
        """
        Validate the discount value based on coupon type.
        """
        coupon_type = self.initial_data.get('type')
        if not coupon_type and self.instance:
            coupon_type = self.instance.type

        if coupon_type == 'PERCENTAGE':
            if value is None or value <= 0:
                raise serializers.ValidationError('Percentage value must be greater than 0.')
            if value > Decimal('100'):
                raise serializers.ValidationError('Percentage discount cannot exceed 100%.')
        elif coupon_type == 'FIXED':
            if value is None or value <= 0:
                raise serializers.ValidationError('Fixed value must be greater than 0.')
        elif coupon_type == 'FREE_SHIPPING':
            if value and value > 0:
                raise serializers.ValidationError('FREE_SHIPPING coupons should have a value of 0.')

        return value

    def validate(self, attrs):
        """
        Cross-field validation.
        """
        valid_from = attrs.get('valid_from')
        valid_until = attrs.get('valid_until')

        if valid_from and valid_until:
            if valid_from >= valid_until:
                raise serializers.ValidationError({
                    'valid_until': 'Valid until date must be after the valid from date.'
                })

        return attrs

    def get_remaining_uses(self, obj):
        """
        Calculate remaining uses for the coupon.
        """
        if obj.usage_limit is None:
            return None
        return max(obj.usage_limit - obj.used_count, 0)
