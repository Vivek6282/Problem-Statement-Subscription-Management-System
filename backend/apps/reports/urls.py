from django.urls import path
from .views import (
    DashboardMetricsView,
    PublicSummaryView,
    ConfigView,
    MRRBreakdownView,
    RevenueTrendsView,
    SubscriptionsByStatusView,
    DrillDownView,
    ExportReportCSVView,
    PaymentMethodDistributionView,
)

urlpatterns = [
    path('config/', ConfigView.as_view(), name='reports_config'),
    path('public-summary/', PublicSummaryView.as_view(), name='reports_public_summary'),
    path('dashboard/', DashboardMetricsView.as_view(), name='reports_dashboard'),
    path('mrr-breakdown/', MRRBreakdownView.as_view(), name='reports_mrr_breakdown'),
    path('revenue-trends/', RevenueTrendsView.as_view(), name='reports_revenue_trends'),
    path('subscriptions-by-status/', SubscriptionsByStatusView.as_view(), name='reports_subscriptions_by_status'),
    path('drilldown/', DrillDownView.as_view(), name='reports_drilldown'),
    path('payment-methods/', PaymentMethodDistributionView.as_view(), name='reports_payment_methods'),
    path('export/', ExportReportCSVView.as_view(), name='reports_export'),
    path('export-csv/', ExportReportCSVView.as_view(), name='reports_export_csv'),
]
