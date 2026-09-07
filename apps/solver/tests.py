"""
Unit and Integration Tests for OmniMath Solver Engine and API Views.
Run with: python manage.py test apps.solver
"""

import json
from django.test import TestCase, Client
from django.urls import reverse

from apps.solver.services.math_engine import MathEngine, MathEngineError


class MathEngineTestCase(TestCase):
    """Test cases for the core MathEngine computation and sandbox."""

    def test_calculus_derivative(self):
        res = MathEngine.solve("calculus", "diff", "x^3 + 2*x", {"variable": "x", "order": 1})
        self.assertIsNone(res["error"])
        self.assertIn("3 x^{2} + 2", res["latex_result"])
        self.assertIsNotNone(res["steps"])

    def test_calculus_indefinite_integral(self):
        res = MathEngine.solve("calculus", "integrate", "cos(x)", {"variable": "x"})
        self.assertIsNone(res["error"])
        self.assertIn("\\sin", res["latex_result"])

    def test_calculus_definite_integral(self):
        res = MathEngine.solve("calculus", "integrate", "x^2", {"variable": "x", "lower_bound": "0", "upper_bound": "3"})
        self.assertIsNone(res["error"])
        self.assertEqual(res["latex_result"], "9")

    def test_calculus_limit(self):
        res = MathEngine.solve("calculus", "limit", "sin(x)/x", {"variable": "x", "point": "0"})
        self.assertIsNone(res["error"])
        self.assertEqual(res["latex_result"], "1")

    def test_calculus_taylor(self):
        res = MathEngine.solve("calculus", "series", "exp(x)", {"variable": "x", "point": "0", "order": 4})
        self.assertIsNone(res["error"])
        self.assertIn("1 + x + \\frac{x^{2}}{2}", res["latex_result"])

    def test_calculus_ode(self):
        res = MathEngine.solve("calculus", "ode", "diff(y(x), x, 2) + 4*y(x)", {"variable": "x"})
        self.assertIsNone(res["error"])
        self.assertIn("\\sin{\\left(2 x \\right)}", res["latex_result"])

    def test_linear_algebra_det(self):
        res = MathEngine.solve("linear_algebra", "det", "[[1, 2], [3, 4]]")
        self.assertIsNone(res["error"])
        self.assertEqual(res["latex_result"], "-2")

    def test_linear_algebra_inv(self):
        res = MathEngine.solve("linear_algebra", "inv", "[[4, 7], [2, 6]]")
        self.assertIsNone(res["error"])
        self.assertIn("matrix", res["latex_result"])

    def test_linear_algebra_eigen(self):
        res = MathEngine.solve("linear_algebra", "eigen", "[[2, 1], [1, 2]]")
        self.assertIsNone(res["error"])
        self.assertIn("\\lambda = 1", res["latex_result"])
        self.assertIn("\\lambda = 3", res["latex_result"])

    def test_algebra_factor(self):
        res = MathEngine.solve("algebra", "factor", "x^2 - 5*x + 6")
        self.assertIsNone(res["error"])
        self.assertIn("x - 3", res["latex_result"])
        self.assertIn("x - 2", res["latex_result"])

    def test_algebra_apart(self):
        res = MathEngine.solve("algebra", "apart", "1/(x^2 - 1)")
        self.assertIsNone(res["error"])
        self.assertIn("x - 1", res["latex_result"])

    def test_complex_euler(self):
        res = MathEngine.solve("complex", "euler", "3 + 4*I")
        self.assertIsNone(res["error"])
        self.assertIn("3 + 4i", res["latex_result"])

    def test_discrete_combinatorics(self):
        res = MathEngine.solve("discrete", "combinatorics", "", {"n": 5, "k": 2})
        self.assertIsNone(res["error"])
        self.assertIn("C(5, 2) = 10", res["latex_result"])

    def test_discrete_mod_inverse(self):
        res = MathEngine.solve("discrete", "modular", "", {"a": 3, "m": 11})
        self.assertIsNone(res["error"])
        self.assertIn("4", res["latex_result"])

    def test_security_sandbox_forbidden_import(self):
        res = MathEngine.solve("algebra", "simplify", "__import__('os').system('ls')")
        self.assertIsNotNone(res["error"])
        self.assertIn("Security violation", res["error"])

    def test_security_sandbox_forbidden_eval(self):
        res = MathEngine.solve("algebra", "simplify", "eval('2+2')")
        self.assertIsNotNone(res["error"])
        self.assertIn("Security violation", res["error"])


class SolverAPITestCase(TestCase):
    """Test cases for the HTTP API endpoint."""

    def setUp(self):
        self.client = Client()

    def test_solve_api_endpoint(self):
        response = self.client.post(
            "/api/solve/",
            data=json.dumps({
                "domain": "calculus",
                "operation": "diff",
                "expression": "x^4 + 3*x^2",
                "parameters": {"variable": "x", "order": 1}
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("4 x^{3} + 6 x", payload["latex_result"])
        self.assertIsNone(payload["error"])

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")
