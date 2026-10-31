from django.urls import path

from .views import ProductDescriptionView, ReportSummaryView, SettingsView, StatusView

urlpatterns = [
    path('status/', StatusView.as_view(), name='assistant_status'),
    path('settings/', SettingsView.as_view(), name='assistant_settings'),
    path('product-description/', ProductDescriptionView.as_view(), name='assistant_product_description'),
    path('report-summary/', ReportSummaryView.as_view(), name='assistant_report_summary'),
]
