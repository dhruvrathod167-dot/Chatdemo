"""
Custom DRF Permission Classes for MAISON

Provides fine-grained access control for the API endpoints,
including ownership checks, admin verification, and account
status validation.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission that allows access only to the owner of the object.
    Supports objects that have either an 'owner' or 'user' field.

    - Read operations (GET, HEAD, OPTIONS) are allowed for anyone.
    - Write operations (POST, PUT, PATCH, DELETE) require ownership.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if the object has an 'owner' attribute
        if hasattr(obj, 'owner'):
            return obj.owner == request.user

        # Fallback: check if the object has a 'user' attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # If neither field exists, deny write access
        return False


class IsAdminUser(permissions.BasePermission):
    """
    Permission that grants access only to staff/admin users.
    This is more restrictive than DRF's built-in IsAdminUser
    because it also requires the user to be active.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
            and request.user.is_active
        )


class IsVerifiedUser(permissions.BasePermission):
    """
    Permission that only allows access to users who have verified
    their email address. This relies on a custom `is_verified` field
    on the User model.

    If the user model does not have an `is_verified` field, it falls
    back to allowing authenticated active users (graceful degradation).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        # Check the custom is_verified field if it exists
        if hasattr(request.user, 'is_verified'):
            return bool(request.user.is_verified)

        # If the field doesn't exist yet, allow authenticated active users
        return True


class IsAuthenticatedAndActive(permissions.BasePermission):
    """
    Permission that requires the user to be both authenticated and active.
    This is stricter than IsAuthenticated because it also checks is_active.
    
    Unauthenticated users receive a 401 Unauthorized response.
    Inactive users also receive a 401 response.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to everyone but restricts
    write operations (create, update, delete) to staff users only.
    Useful for product management, content management, etc.
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for authenticated staff
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
            and request.user.is_active
        )


class IsOwner(permissions.BasePermission):
    """
    Strict ownership permission — only the owner can access the object.
    Unlike IsOwnerOrReadOnly, this denies read access to non-owners.
    Supports objects with 'owner' or 'user' fields.
    """

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'owner'):
            return obj.owner == request.user

        if hasattr(obj, 'user'):
            return obj.user == request.user

        return False
