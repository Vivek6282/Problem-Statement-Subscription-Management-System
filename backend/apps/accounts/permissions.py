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

class IsAdminOrStaffReadOnly(permissions.BasePermission):
    """
    Allows Staff and Admin read-only access (GET/HEAD/OPTIONS).
    Allows Admin write access (POST/PUT/PATCH/DELETE).
    Customers are denied all access.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if not request.user.is_staff_user:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_admin_user

class CustomerAccessPolicyPermission(permissions.BasePermission):
    """
    Object-level permission preventing cross-customer access.
    Admins and Staff can view and edit everything.
    Customers can only view and interact with objects linked to their customer profile.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff_user:
            return True

        # Check if the object is customer or associated with customer
        customer = getattr(user, 'customer_profile', None)
        if not customer:
            return False

        # If obj is a Customer
        if hasattr(obj, 'user') and obj.user == user:
            return True
        if hasattr(obj, 'customer') and obj.customer == customer:
            return True
        if obj == customer:
            return True

        return False
