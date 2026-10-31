from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlanViewSet

router = DefaultRouter()
router.register(r'', PlanViewSet, basename='plans')

urlpatterns = [
    path('', include(router.urls)),
]

