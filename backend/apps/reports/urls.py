from django.urls import path
from .views import (
    DashboardMetricsView,
    PublicSummaryView,
    RevenueByProductReportView,
    RevenueByPlanReportView,
    PaymentMethodDistributionView,
    ExportReportCSVView,
)

urlpatterns = [
    path('public-summary/', PublicSummaryView.as_view(), name='reports_public_summary'),
    path('dashboard/', DashboardMetricsView.as_view(), name='reports_dashboard'),
    path('revenue-by-product/', RevenueByProductReportView.as_view(), name='reports_revenue_by_product'),
    path('revenue-by-plan/', RevenueByPlanReportView.as_view(), name='reports_revenue_by_plan'),
    path('payment-methods/', PaymentMethodDistributionView.as_view(), name='reports_payment_methods'),
    path('export-csv/', ExportReportCSVView.as_view(), name='reports_export_csv'),
]

