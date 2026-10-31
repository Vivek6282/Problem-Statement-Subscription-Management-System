import time
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from apps.accounts.models import User
from apps.reports.views import DashboardMetricsView
from apps.subscriptions.views import SubscriptionViewSet
from apps.customers.views import CustomerViewSet
from apps.invoices.views import InvoiceViewSet

admin = User.objects.filter(role='ADMIN').first()
factory = RequestFactory()

def benchmark_endpoint(name, view_func, path):
    request = factory.get(path)
    request.user = admin
    
    # Warm up
    view_func(request)
    
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
    print(f"[BENCHMARK] {name:30}: Avg: {avg_ms:6.2f} ms | Min: {min_ms:6.2f} ms | Max: {max_ms:6.2f} ms")

print("=== BRIGHTLOOP REAL-TIME API PERFORMANCE BENCHMARK ===")
benchmark_endpoint("Dashboard Metrics API", DashboardMetricsView.as_view(), "/api/v1/reports/dashboard/")
benchmark_endpoint("Customers List API", CustomerViewSet.as_view({'get': 'list'}), "/api/v1/customers/")
benchmark_endpoint("Subscriptions List API", SubscriptionViewSet.as_view({'get': 'list'}), "/api/v1/subscriptions/")
benchmark_endpoint("Invoices List API", InvoiceViewSet.as_view({'get': 'list'}), "/api/v1/invoices/")

