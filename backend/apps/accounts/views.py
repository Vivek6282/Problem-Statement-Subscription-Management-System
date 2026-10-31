from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.middleware.csrf import get_token
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status, views, viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.throttling import ScopedRateThrottle
import logging
from drf_spectacular.utils import extend_schema, OpenApiResponse

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

logger = logging.getLogger(__name__)

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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'
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
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            timeout_minutes = max(1, settings.PASSWORD_RESET_TIMEOUT // 60)

            try:
                send_mail(
                    subject="Brightloop — Password Reset Request",
                    message=(
                        f"Hello {user.first_name or 'there'},\n\n"
                        f"Use the link below to reset your password. It expires in {timeout_minutes} minutes.\n"
                        f"{reset_url}\n\nIf you did not request this, you can ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                # The response stays generic (no account enumeration) but the failure is never hidden from operators.
                logger.exception("Password reset email could not be delivered to user id %s", user.pk)

        # Always return generic message to prevent user enumeration
        return Response({
            'message': 'If an account exists with that email, a password reset link has been dispatched.'
        }, status=status.HTTP_200_OK)

class PasswordResetConfirmView(views.APIView):
    """
    Verifies reset token and assigns new password.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'
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
    Admin-only endpoint for managing users and creating staff accounts.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserOnly]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone']

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffCreateSerializer
        return UserSerializer

