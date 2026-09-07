"""
OmniMath Views
Handles API requests for mathematical calculations and renders template views.
"""

import json
from typing import Any, Dict

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView

from apps.solver.services.math_engine import MathEngine, MathEngineError, MathEngineTimeoutError


class IndexView(TemplateView):
    """Renders the main OmniMath interactive CAS interface."""
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["app_title"] = "OmniMath CAS & Solver"
        return context


@method_decorator(csrf_exempt, name="dispatch")
class SolveAPIView(View):
    """
    Class-Based View handling asynchronous JSON calculations.
    Accepts payload:
    {
        "domain": "calculus" | "linear_algebra" | "algebra" | "complex" | "discrete" | "graphing",
        "operation": str,
        "expression": str,
        "parameters": dict (optional)
    }
    """

    def post(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        try:
            # Parse JSON body
            try:
                body = json.loads(request.body.decode("utf-8") if request.body else "{}")
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse(
                    {
                        "latex_input": "",
                        "latex_result": "",
                        "numerical_approx": "",
                        "steps": None,
                        "plot_data": None,
                        "domain": "unknown",
                        "error": "Malformed JSON payload in request body.",
                    },
                    status=400,
                )

            domain = body.get("domain", "algebra")
            operation = body.get("operation", "simplify")
            expression = body.get("expression", "")
            parameters = body.get("parameters", {})

            if not isinstance(expression, str) and not (domain == "linear_algebra" and "matrix" in parameters):
                return JsonResponse(
                    {
                        "latex_input": str(expression),
                        "latex_result": "",
                        "numerical_approx": "",
                        "steps": None,
                        "plot_data": None,
                        "domain": domain,
                        "error": "Expression parameter must be a string.",
                    },
                    status=400,
                )

            # Delegate to decoupled MathEngine sandbox
            result = MathEngine.solve(
                domain=domain,
                operation=operation,
                expression=expression,
                parameters=parameters,
            )

            # Check if an error occurred during execution
            if result.get("error"):
                # Return 200 with structured error or appropriate status so frontend KaTeX displays cleanly
                return JsonResponse(result, status=200)

            return JsonResponse(result, status=200)

        except Exception as unhandled_exc:
            return JsonResponse(
                {
                    "latex_input": "",
                    "latex_result": "",
                    "numerical_approx": "",
                    "steps": None,
                    "plot_data": None,
                    "domain": "unknown",
                    "error": f"Internal Server Error: {str(unhandled_exc)}",
                },
                status=500,
            )

    def get(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        """Informational endpoint describing supported capabilities."""
        return JsonResponse(
            {
                "status": "online",
                "engine": "OmniMath CAS",
                "version": "1.0.0",
                "domains": [
                    "calculus",
                    "linear_algebra",
                    "algebra",
                    "complex",
                    "discrete",
                    "graphing",
                ],
                "security": "Sandbox active (max 5.0s timeout, token filtering, ast validation)",
            }
        )


class HealthCheckView(View):
    """Health check endpoint for monitoring."""
    def get(self, request: HttpRequest) -> JsonResponse:
        return JsonResponse({"status": "healthy", "service": "omnimath-django"})
