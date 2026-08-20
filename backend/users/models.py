"""
User Models for MAISON

Defines the custom User model and UserAddress model.
Uses AbstractBaseUser with a custom manager for email-based authentication.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models


class CustomUserManager(models.Manager):
    """
    Custom manager for the User model.

    Replaces Django's default UserManager to use email as the
    unique identifier instead of username.
    """

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with the given email and password.

        Args:
            email: The user's email address (required, must be unique).
            password: The user's plaintext password (will be hashed).
            **extra_fields: Additional fields (first_name, last_name, etc.).

        Returns:
            User: The created user instance.

        Raises:
            ValueError: If email is not provided.
        """
        if not email:
            raise ValueError('Users must have an email address.')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with the given email and password.

        All superusers are automatically staff, active, and verified.

        Args:
            email: The superuser's email address.
            password: The superuser's plaintext password.
            **extra_fields: Additional fields.

        Returns:
            User: The created superuser instance.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for MAISON.

    Uses email as the primary identifier instead of username.
    Includes reward points, avatar support, and address storage.
    """

    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(unique=True, db_index=True, verbose_name='Email Address')
    first_name = models.CharField(max_length=150, blank=True, default='', verbose_name='First Name')
    last_name = models.CharField(max_length=150, blank=True, default='', verbose_name='Last Name')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Phone Number')
    avatar = models.ImageField(upload_to='avatars/', blank=True, verbose_name='Avatar')
    is_verified = models.BooleanField(default=False, verbose_name='Email Verified')
    is_active = models.BooleanField(default=True, verbose_name='Active')
    is_staff = models.BooleanField(default=False, verbose_name='Staff Status')
    is_superuser = models.BooleanField(default=False, verbose_name='Superuser Status')
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name='Date Joined')
    last_login = models.DateTimeField(auto_now=True, verbose_name='Last Login')
    addresses = models.JSONField(default=list, blank=True, verbose_name='Saved Addresses')
    reward_points = models.IntegerField(default=0, verbose_name='Reward Points')

    EMAIL_FIELD = 'email'
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = CustomUserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email

    def get_full_name(self):
        """
        Return the user's full name (first + last), or email if empty.
        """
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name if full_name else self.email

    def get_short_name(self):
        """
        Return the user's first name, or email if empty.
        """
        return self.first_name.strip() if self.first_name else self.email


class UserAddress(models.Model):
    """
    User shipping/billing address model.

    Each user can have multiple addresses. One address can be
    marked as the default for quick checkout.
    """

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_addresses',
        verbose_name='User',
    )
    label = models.CharField(
        max_length=50,
        blank=True,
        default='Home',
        verbose_name='Address Label',
        help_text='e.g., Home, Office, Warehouse',
    )
    first_name = models.CharField(max_length=150, verbose_name='First Name')
    last_name = models.CharField(max_length=150, verbose_name='Last Name')
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name='Phone Number')
    address_line_1 = models.CharField(max_length=255, verbose_name='Address Line 1')
    address_line_2 = models.CharField(max_length=255, blank=True, default='', verbose_name='Address Line 2')
    city = models.CharField(max_length=100, verbose_name='City')
    state = models.CharField(max_length=100, blank=True, default='', verbose_name='State/Province')
    postal_code = models.CharField(max_length=20, verbose_name='Postal Code')
    country = models.CharField(max_length=100, default='United States', verbose_name='Country')
    is_default = models.BooleanField(default=False, verbose_name='Default Address')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated At')

    class Meta:
        db_table = 'user_addresses'
        verbose_name = 'User Address'
        verbose_name_plural = 'User Addresses'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f'{self.label} — {self.city}, {self.country} ({self.user.email})'

    def save(self, *args, **kwargs):
        """
        Override save to ensure only one default address per user.
        If this address is set as default, unset all other defaults.
        """
        if self.is_default:
            UserAddress.objects.filter(
                user=self.user,
                is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def get_full_address(self):
        """
        Return a formatted full address string.
        """
        parts = [self.address_line_1]
        if self.address_line_2:
            parts.append(self.address_line_2)
        parts.append(f'{self.city}, {self.state} {self.postal_code}')
        parts.append(self.country)
        return ', '.join(parts)
