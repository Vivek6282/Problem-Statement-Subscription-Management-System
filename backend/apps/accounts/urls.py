from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CSRFView,
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    PasswordChangeView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    path('csrf/', CSRFView.as_view(), name='csrf'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('password-change/', PasswordChangeView.as_view(), name='password_change'),
    path('password-reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('', include(router.urls)),
]

