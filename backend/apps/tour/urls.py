from django.urls import path

from .views import TourView

urlpatterns = [path('', TourView.as_view(), name='tour')]
