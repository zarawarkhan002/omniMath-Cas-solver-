from django.urls import path
from apps.solver.views import IndexView, SolveAPIView, HealthCheckView

app_name = "solver"

urlpatterns = [
    path("", IndexView.as_view(), name="index"),
    path("api/solve/", SolveAPIView.as_view(), name="solve_api"),
    path("api/health/", HealthCheckView.as_view(), name="health_check"),
]
