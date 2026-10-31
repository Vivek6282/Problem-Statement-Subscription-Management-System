from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.middleware.csrf import get_token
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from rest_framework import status, views, viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.audit.models import AuditEvent
from .models import User, Role
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    StaffCreateSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ProfileUpdateSerializer,
)
from .permissions import IsAdminUserOnly


def _invalidate_user_sessions(user):
    """
    Terminates all active sessions belonging to the specified user upon deactivation.
    """
    from django.contrib.sessions.models import Session
    try:
        for s in Session.objects.all():
            try:
                decoded = s.get_decoded()
                if str(decoded.get('_auth_user_id')) == str(user.id):
                    s.delete()
            except Exception:
                pass
    except Exception:
        pass


class CSRFView(views.APIView):
    """
    Returns CSRF token and sets the csrftoken cookie.
    Allows frontend clients to establish CSRF sync before state-changing requests.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get CSRF Token",
        description="Returns CSRF token in payload and ensures cookie is set.",
        responses={200: OpenApiResponse(description="CSRF Token retrieved")}
    )
    def get(self, request):
        csrf_token = get_token(request)
        response = Response({'csrfToken': csrf_token})
        return response


class RegisterView(views.APIView):
    """
    Public registration endpoint. Always assigns CUSTOMER role.
    Creates a linked Customer record and logs the user in with a session.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={201: UserSerializer},
        summary="Register Customer Account"
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response({
            'message': 'Registration successful.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LoginView(views.APIView):
    """
    Session-based login with HttpOnly session cookies.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserSerializer},
        summary="User Login"
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response({
            'message': 'Login successful.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    """
    Terminates the user's active session.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="User Logout")
    def post(self, request):
        logout(request)
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class MeView(views.APIView):
    """
    Retrieves or updates currently authenticated user's profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: UserSerializer}, summary="Get Current User Profile")
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(request=ProfileUpdateSerializer, responses={200: UserSerializer}, summary="Update Profile")
    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(views.APIView):
    """
    Allows authenticated users to change their password securely.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, summary="Change Password")
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        # Keep user logged in after password change
        login(request, request.user)
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(views.APIView):
    """
    Requests a password reset token sent via email.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=PasswordResetRequestSerializer, summary="Request Password Reset")
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{request.headers.get('origin', 'http://localhost:5173')}/reset-password?uid={uid}&token={token}"
            
            # Send notification email
            send_mail(
                subject="Brightloop — Password Reset Request",
                message=f"Hello {user.first_name or 'there'},\n\nClick the link below to reset your password:\n{reset_url}\n\nIf you did not request this, please ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )

        # Always return generic message to prevent user enumeration
        return Response({
            'message': 'If an account exists with that email, a password reset link has been dispatched.'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(views.APIView):
    """
    Verifies reset token and assigns new password.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, summary="Confirm Password Reset")
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid reset token or user id.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Reset token is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password has been reset successfully. You may now log in.'}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only endpoint for managing staff and admin users.
    Staff users have read-only access (403 on writes).
    Customers have no access (403).
    Hard DELETE returns 405 Method Not Allowed; deactivation/reactivation is enforced.
    Self-demotion, self-deactivation, and removing the last active admin are strictly disallowed.
    """
    queryset = User.objects.filter(role__in=[Role.ADMIN, Role.STAFF]).order_by('-date_joined')
    serializer_class = UserSerializer
    # Admin only: staff have no screen that needs the account list (least privilege).
    permission_classes = [IsAdminUserOnly]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone']

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffCreateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Method "DELETE" not allowed. Use deactivate instead.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def perform_create(self, serializer):
        user = serializer.save()
        AuditEvent.log_event(
            action='STAFF_CREATED',
            entity_type='User',
            entity_id=user.id,
            description=f"Staff user {user.email} created with role {user.role}.",
            user=self.request.user,
            metadata={'role': user.role}
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        target = self.get_object()

        # Reject modifying customer accounts through staff management
        if target.role == Role.CUSTOMER:
            raise ValidationError({'role': 'Customer accounts cannot be modified via staff management.'})

        requested_role = request.data.get('role')
        requested_active = request.data.get('is_active')
        wants_deactivate = requested_active is not None and (
            requested_active is False or str(requested_active).lower() in ['false', '0']
        )

        # Self-checks
        if target.id == request.user.id:
            if requested_role and requested_role != Role.ADMIN:
                raise ValidationError({'role': 'Administrators cannot demote themselves.'})
            if wants_deactivate:
                raise ValidationError({'is_active': 'Administrators cannot deactivate their own account.'})

        # Last active administrator safeguard
        if target.role == Role.ADMIN and target.is_active:
            will_demote = requested_role and requested_role != Role.ADMIN
            will_deactivate = wants_deactivate
            if will_demote or will_deactivate:
                with transaction.atomic():
                    active_admins = User.objects.select_for_update().filter(role=Role.ADMIN, is_active=True)
                    if active_admins.count() <= 1 and active_admins.first().id == target.id:
                        raise ValidationError({'detail': 'Cannot deactivate or demote the last remaining active Administrator.'})

        old_role = target.role
        old_active = target.is_active

        response = super().update(request, *args, partial=partial, **kwargs)

        target.refresh_from_db()

        # Role change synchronization & audit
        if target.role != old_role:
            target.is_staff = True
            target.is_superuser = (target.role == Role.ADMIN)
            target.save(update_fields=['is_staff', 'is_superuser'])
            AuditEvent.log_event(
                action='USER_ROLE_CHANGED',
                entity_type='User',
                entity_id=target.id,
                description=f"User {target.email} role changed from {old_role} to {target.role}.",
                user=request.user,
                metadata={'old_role': old_role, 'new_role': target.role}
            )

        # Active state change synchronization & audit
        if old_active and not target.is_active:
            _invalidate_user_sessions(target)
            AuditEvent.log_event(
                action='USER_DEACTIVATED',
                entity_type='User',
                entity_id=target.id,
                description=f"User {target.email} was deactivated.",
                user=request.user
            )
        elif not old_active and target.is_active:
            AuditEvent.log_event(
                action='USER_REACTIVATED',
                entity_type='User',
                entity_id=target.id,
                description=f"User {target.email} was reactivated.",
                user=request.user
            )

        return response

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOnly])
    def deactivate(self, request, pk=None):
        target = self.get_object()
        if target.id == request.user.id:
            raise ValidationError({'is_active': 'Administrators cannot deactivate their own account.'})

        if target.role == Role.ADMIN and target.is_active:
            with transaction.atomic():
                active_admins = User.objects.select_for_update().filter(role=Role.ADMIN, is_active=True)
                if active_admins.count() <= 1 and active_admins.first().id == target.id:
                    raise ValidationError({'detail': 'Cannot deactivate or demote the last remaining active Administrator.'})

        target.is_active = False
        target.save(update_fields=['is_active'])
        _invalidate_user_sessions(target)
        AuditEvent.log_event(
            action='USER_DEACTIVATED',
            entity_type='User',
            entity_id=target.id,
            description=f"User {target.email} was deactivated.",
            user=request.user
        )
        return Response(UserSerializer(target).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOnly])
    def reactivate(self, request, pk=None):
        target = self.get_object()
        target.is_active = True
        target.save(update_fields=['is_active'])
        AuditEvent.log_event(
            action='USER_REACTIVATED',
            entity_type='User',
            entity_id=target.id,
            description=f"User {target.email} was reactivated.",
            user=request.user
        )
        return Response(UserSerializer(target).data)
