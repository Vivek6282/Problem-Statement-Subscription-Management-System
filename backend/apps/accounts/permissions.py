from rest_framework import permissions

class IsAdminUserOnly(permissions.BasePermission):
    """Allows access only to Admin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_user)

class IsStaffOrAdmin(permissions.BasePermission):
    """Allows access to Staff and Admin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff_user)

class IsCustomerOnly(permissions.BasePermission):
    """Allows access only to Customer users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_customer_user)

class IsAdminOrReadOnly(permissions.BasePermission):
    """Allows read-only access to authenticated users, modification only to Admin."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_admin_user

class CustomerAccessPolicyPermission(permissions.BasePermission):
    """
    Role-aware access policy used by tenant-scoped viewsets.

    - Admin / Staff: full access (object-level checks pass).
    - Customer: read-only on records linked to their own customer profile, plus the
      explicit own-record actions a view lists in `customer_actions` (e.g. pausing
      their own subscription). Every other write is rejected here, so hiding a button
      in the UI is never the only protection.
    Querysets are additionally scoped to the customer in each view's `get_queryset`.
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_staff_user:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(view, 'action', None) in getattr(view, 'customer_actions', ())

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff_user:
            return True

        customer = getattr(user, 'customer_profile', None)
        if not customer:
            return False

        if obj == customer:
            return True
        if getattr(obj, 'customer_id', None) is not None and obj.customer_id == customer.id:
            return True
        return False
