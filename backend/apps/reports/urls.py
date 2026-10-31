from django.urls import path
from .views import (
    DashboardMetricsView,
    PublicSummaryView,
    MRRBreakdownView,
    RevenueTrendsView,
    SubscriptionsByStatusView,
    DrillDownView,
    ExportReportCSVView,
)

urlpatterns = [
    path('public-summary/', PublicSummaryView.as_view(), name='reports_public_summary'),
    path('dashboard/', DashboardMetricsView.as_view(), name='reports_dashboard'),
    path('mrr-breakdown/', MRRBreakdownView.as_view(), name='reports_mrr_breakdown'),
    path('revenue-trends/', RevenueTrendsView.as_view(), name='reports_revenue_trends'),
    path('subscriptions-by-status/', SubscriptionsByStatusView.as_view(), name='reports_subscriptions_by_status'),
    path('drilldown/', DrillDownView.as_view(), name='reports_drilldown'),
    path('export/', ExportReportCSVView.as_view(), name='reports_export'),
    path('export-csv/', ExportReportCSVView.as_view(), name='reports_export_csv'),
]
