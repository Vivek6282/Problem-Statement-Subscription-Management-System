import time
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from apps.accounts.models import User
from apps.accounts.views import UserViewSet
from apps.reports.views import DashboardMetricsView, MRRBreakdownView, DrillDownView
from apps.products.views import ProductViewSet
from apps.plans.views import PlanViewSet
from apps.taxes.views import TaxRuleViewSet
from apps.discounts.views import DiscountViewSet
from apps.subscriptions.views import SubscriptionViewSet
from apps.customers.views import CustomerViewSet
from apps.invoices.views import InvoiceViewSet

admin = User.objects.filter(role='ADMIN').first()
if not admin:
    admin = User.objects.create_superuser('bench_admin@brightloop.io', 'AdminBench!2026')

factory = RequestFactory()

def benchmark_endpoint(name, view_func, path):
    request = factory.get(path)
    request.user = admin

    # Warm up
    try:
        view_func(request)
    except Exception as e:
        print(f"[BENCHMARK] {name:32}: WARMUP ERROR: {e}")
        return None

    # Measure 5 runs
    times = []
    for _ in range(5):
        t0 = time.perf_counter()
        response = view_func(request)
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000)

    avg_ms = sum(times) / len(times)
    min_ms = min(times)
    max_ms = max(times)
    target_ms = 200.0
    status = "PASS" if avg_ms < target_ms else "FAIL"
    print(f"[BENCHMARK] {name:32}: Avg: {avg_ms:6.2f} ms | Min: {min_ms:6.2f} ms | Max: {max_ms:6.2f} ms | Target: <{target_ms}ms | {status}")
    return avg_ms

if __name__ == '__main__':
    print("=== BRIGHTLOOP ADMIN MODULE API PERFORMANCE BENCHMARK ===")
    benchmark_endpoint("Dashboard Metrics API", DashboardMetricsView.as_view(), "/api/v1/reports/dashboard/")
    benchmark_endpoint("MRR Breakdown API", MRRBreakdownView.as_view(), "/api/v1/reports/mrr-breakdown/")
    benchmark_endpoint("Reports Drilldown (MRR) API", DrillDownView.as_view(), "/api/v1/reports/drilldown/?metric=mrr")
    benchmark_endpoint("Products List API", ProductViewSet.as_view({'get': 'list'}), "/api/v1/products/")
    benchmark_endpoint("Plans List API", PlanViewSet.as_view({'get': 'list'}), "/api/v1/plans/")
    benchmark_endpoint("Taxes List API", TaxRuleViewSet.as_view({'get': 'list'}), "/api/v1/taxes/")
    benchmark_endpoint("Discounts List API", DiscountViewSet.as_view({'get': 'list'}), "/api/v1/discounts/")
    benchmark_endpoint("Staff Users List API", UserViewSet.as_view({'get': 'list'}), "/api/v1/users/")
    benchmark_endpoint("Subscriptions List API", SubscriptionViewSet.as_view({'get': 'list'}), "/api/v1/subscriptions/")
    benchmark_endpoint("Customers List API", CustomerViewSet.as_view({'get': 'list'}), "/api/v1/customers/")
    benchmark_endpoint("Invoices List API", InvoiceViewSet.as_view({'get': 'list'}), "/api/v1/invoices/")
    print("=========================================================")
