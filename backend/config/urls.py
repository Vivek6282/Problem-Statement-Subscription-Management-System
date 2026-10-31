from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.accounts.views import UserViewSet

users_router = DefaultRouter()
users_router.register(r'', UserViewSet, basename='users')

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI 3 Schema & Interactive Documentation
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Domain API endpoints
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/users/', include(users_router.urls)),
    path('api/v1/customers/', include('apps.customers.urls')),
    path('api/v1/products/', include('apps.products.urls')),
    path('api/v1/plans/', include('apps.plans.urls')),
    path('api/v1/quotations/', include('apps.quotations.urls')),
    path('api/v1/subscriptions/', include('apps.subscriptions.urls')),
    path('api/v1/invoices/', include('apps.invoices.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/discounts/', include('apps.discounts.urls')),
    path('api/v1/taxes/', include('apps.taxes.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
]
