"""Server-side role permissions.

These are coarse role gates. Every object-level read or write is additionally
scoped by queryset and ownership checks in the views and services; a role check
alone is never sufficient authorization.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsCustomer(BasePermission):
    message = "This action is only available to customer accounts."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_customer)


class IsProvider(BasePermission):
    message = "This action is only available to provider accounts."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_provider)


class IsStaffUser(BasePermission):
    message = "This action requires an administrator account."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)


class IsCustomerOrProvider(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_customer or user.is_provider)
        )


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
