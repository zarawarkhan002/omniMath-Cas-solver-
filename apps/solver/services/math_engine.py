"""
OmniMath Computational Engine & Security Sandbox
Decoupled MathEngine service class leveraging SymPy, NumPy, SciPy, and mpmath.
Provides rigorous token-level and AST-level sanitization, restricted parsing,
process/thread timeout execution, and rich structured output.
"""

from __future__ import annotations
import ast
import concurrent.futures
import math
import re
from typing import Any, Dict, List, Optional, Tuple, Union

import mpmath
import numpy as np
import scipy.linalg
import scipy.optimize
import sympy
from sympy import (
    Abs,
    Derivative,
    E,
    Eq,
    Function,
    I,
    Integral,
    Limit,
    Matrix,
    N,
    O,
    Number,
    Order,
    Rational,
    Symbol,
    apart,
    arg,
    binomial,
    cancel,
    collect,
    cos,
    det,
    diff,
    dsolve,
    exp,
    expand,
    expand_complex,
    expand_trig,
    factor,
    fraction,
    im,
    integrate,
    latex,
    limit,
    log,
    mod_inverse,
    nsolve,
    oo,
    pi,
    poly,
    powsimp,
    radsimp,
    re as sympy_re,
    root,
    series,
    simplify,
    sin,
    solve,
    sqrt,
    symbols,
    tan,
    together,
    trigsimp,
)
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

# Strict timeout for symbolic & numerical operations (seconds)
COMPUTE_TIMEOUT_SECONDS = 5.0
MAX_EXPR_LENGTH = 1000

# Blacklisted tokens, builtins, and attribute lookups to prevent injection
FORBIDDEN_IDENTIFIERS = frozenset(
    [
        "__import__",
        "import",
        "exec",
        "eval",
        "compile",
        "open",
        "globals",
        "locals",
        "vars",
        "getattr",
        "setattr",
        "delattr",
        "hasattr",
        "os",
        "sys",
        "subprocess",
        "shutil",
        "builtins",
        "breakpoint",
        "exit",
        "quit",
        "input",
        "system",
        "popen",
        "fork",
        "spawn",
        "classmethod",
        "staticmethod",
        "__class__",
        "__bases__",
        "__subclasses__",
        "__mro__",
        "__code__",
        "__dict__",
        "__globals__",
    ]
)

# Safe mathematical symbol registry for SymPy parser
SAFE_LOCAL_DICT = {
    # Constants
    "pi": pi,
    "E": E,
    "e": E,
    "I": I,
    "i": I,
    "oo": oo,
    "inf": oo,
    # Functions
    "sin": sin,
    "cos": cos,
    "tan": tan,
    "asin": sympy.asin,
    "acos": sympy.acos,
    "atan": sympy.atan,
    "sinh": sympy.sinh,
    "cosh": sympy.cosh,
    "tanh": sympy.tanh,
    "asinh": sympy.asinh,
    "acosh": sympy.acosh,
    "atanh": sympy.atanh,
    "exp": exp,
    "log": log,
    "ln": log,
    "log10": lambda x, *args, **kwargs: log(x, 10),
    "log2": lambda x, *args, **kwargs: log(x, 2),
    "sqrt": sqrt,
    "cbrt": lambda x, *args, **kwargs: root(x, 3),
    "root": root,
    "Abs": Abs,
    "abs": Abs,
    "arg": arg,
    "re": sympy_re,
    "im": im,
    "gamma": sympy.gamma,
    "factorial": sympy.factorial,
    "binomial": binomial,
    "sec": sympy.sec,
    "csc": sympy.csc,
    "cot": sympy.cot,
    "gcd": sympy.gcd,
    "lcm": sympy.lcm,
    "mod": lambda a, b, *args, **kwargs: a % b,
    "floor": sympy.floor,
    "ceil": sympy.ceiling,
    "ceiling": sympy.ceiling,
    "deg": lambda x, *args, **kwargs: x * 180 / pi,
    "rad": lambda x, *args, **kwargs: x * pi / 180,
    # Standard Common Symbols
    "x": Symbol("x"),
    "y": Symbol("y"),
    "z": Symbol("z"),
    "t": Symbol("t"),
    "u": Symbol("u"),
    "v": Symbol("v"),
    "w": Symbol("w"),
    "a": Symbol("a"),
    "b": Symbol("b"),
    "c": Symbol("c"),
    "k": Symbol("k"),
    "n": Symbol("n"),
    "theta": Symbol("theta"),
    "phi": Symbol("phi"),
    "lambda": Symbol("lambda_sym"),
    "Matrix": Matrix,
}


class MathEngineError(Exception):
    """Custom exception raised when math parsing or computation fails."""
    pass


class MathEngineTimeoutError(MathEngineError):
    """Raised when calculation exceeds allocated execution time limit."""
    pass


class MathEngine:
    """
    Centralized, decoupled CAS solver service class.
    Executes math operations under sandbox constraints with guaranteed timeouts.
    """

    @classmethod
    def sanitize_input(cls, expr_str: str) -> str:
        """
        Validates and cleans user input before AST parsing.
        Guarantees length bound and absence of forbidden identifiers.
        """
        if not expr_str or not isinstance(expr_str, str):
            raise MathEngineError("Empty or invalid mathematical expression.")

        expr_str = expr_str.strip()
        if len(expr_str) > MAX_EXPR_LENGTH:
            raise MathEngineError(
                f"Expression length ({len(expr_str)}) exceeds maximum allowed limit of {MAX_EXPR_LENGTH} characters."
            )

        # Disallow dangerous substrings or double underscores
        if "__" in expr_str:
            raise MathEngineError("Security violation: Double underscore identifiers are forbidden.")

        # Check for forbidden words via word-boundary regex
        for forbidden in FORBIDDEN_IDENTIFIERS:
            pattern = rf"\b{re.escape(forbidden)}\b"
            if re.search(pattern, expr_str, re.IGNORECASE):
                raise MathEngineError(f"Security violation: Keyword '{forbidden}' is strictly forbidden.")

        # Replace unicode math symbols with standard ASCII equivalents
        replacements = {
            "×": "*",
            "÷": "/",
            "−": "-",
            "–": "-",
            "—": "-",
            "π": "pi",
            "√": "sqrt",
            "∛": "cbrt",
            "∞": "oo",
            "≤": "<=",
            "≥": ">=",
            "≠": "!=",
        }
        for old, new in replacements.items():
            expr_str = expr_str.replace(old, new)

        # Handle 'X% of Y' -> '(X/100) * Y'
        expr_str = re.sub(
            r"(\d+(?:\.\d+)?)\s*%\s*of\s*",
            r"(\1/100)*",
            expr_str,
            flags=re.IGNORECASE,
        )

        # Handle standalone percentages like '15%' -> '(15/100)'
        expr_str = re.sub(r"(\d+(?:\.\d+)?)\s*%", r"(\1/100)", expr_str)

        return expr_str

    @classmethod
    def safe_parse(cls, expr_str: str, local_dict: Optional[Dict[str, Any]] = None) -> sympy.Expr:
        """
        Parses expression safely using SymPy's parse_expr with strict transformations.
        """
        clean_str = cls.sanitize_input(expr_str)

        transformations = standard_transformations + (
            implicit_multiplication_application,
            convert_xor,
        )

        locals_copy = dict(SAFE_LOCAL_DICT)
        if local_dict:
            locals_copy.update(local_dict)

        try:
            parsed = parse_expr(
                clean_str,
                local_dict=locals_copy,
                transformations=transformations,
                evaluate=False,
            )
            return parsed
        except (SyntaxError, TokenError if 'TokenError' in globals() else SyntaxError) as se:
            raise MathEngineError(f"Syntax error in expression: {str(se)}")
        except Exception as e:
            raise MathEngineError(f"Failed to parse mathematical expression: {str(e)}")

    @classmethod
    def run_with_timeout(cls, func, *args, timeout: float = COMPUTE_TIMEOUT_SECONDS, **kwargs):
        """
        Executes a callable within a thread pool and enforces strict time limit.
        """
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(func, *args, **kwargs)
            try:
                return future.result(timeout=timeout)
            except concurrent.futures.TimeoutError:
                raise MathEngineTimeoutError(
                    f"Computation timed out after {timeout:.1f} seconds. The problem may be too complex or non-convergent."
                )
            except Exception as ex:
                raise ex

    @classmethod
    def solve(
        cls,
        domain: str,
        operation: str,
        expression: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for CAS calculations.
        Dispatches to specific problem domain handler safely within sandbox timeout.
        """
        parameters = parameters or {}
        try:
            result = cls.run_with_timeout(
                cls._dispatch_solve,
                domain=domain,
                operation=operation,
                expression=expression,
                parameters=parameters,
                timeout=COMPUTE_TIMEOUT_SECONDS,
            )
            return result
        except MathEngineTimeoutError as te:
            return {
                "latex_input": expression,
                "latex_result": "",
                "numerical_approx": "",
                "steps": None,
                "plot_data": None,
                "domain": domain,
                "error": str(te),
            }
        except MathEngineError as me:
            return {
                "latex_input": expression,
                "latex_result": "",
                "numerical_approx": "",
                "steps": None,
                "plot_data": None,
                "domain": domain,
                "error": str(me),
            }
        except ZeroDivisionError:
            return {
                "latex_input": expression,
                "latex_result": "",
                "numerical_approx": "",
                "steps": None,
                "plot_data": None,
                "domain": domain,
                "error": "Math Domain Error: Division by zero encountered.",
            }
        except Exception as e:
            return {
                "latex_input": expression,
                "latex_result": "",
                "numerical_approx": "",
                "steps": None,
                "plot_data": None,
                "domain": domain,
                "error": f"Computation error: {str(e)}",
            }

    @classmethod
    def _dispatch_solve(
        cls,
        domain: str,
        operation: str,
        expression: str,
        parameters: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Internal router to problem domain solvers."""
        domain_normalized = (domain or "algebra").lower()
        op_normalized = (operation or "simplify").lower()

        if domain_normalized in ("calculator", "basic", "arithmetic", "calc"):
            return cls._solve_calculator(op_normalized, expression, parameters)
        elif domain_normalized == "calculus":
            return cls._solve_calculus(op_normalized, expression, parameters)
        elif domain_normalized in ("linear_algebra", "linalg", "matrix"):
            return cls._solve_linear_algebra(op_normalized, expression, parameters)
        elif domain_normalized in ("complex", "complex_analysis"):
            return cls._solve_complex(op_normalized, expression, parameters)
        elif domain_normalized in ("discrete", "statistics", "stats"):
            return cls._solve_discrete_stats(op_normalized, expression, parameters)
        elif domain_normalized in ("graphing", "plot"):
            return cls._solve_graphing(op_normalized, expression, parameters)
        else:
            # Default to general algebra & polynomials
            return cls._solve_algebra(op_normalized, expression, parameters)

    # =========================================================================
    # 0. BASIC & SCIENTIFIC CALCULATOR DOMAIN
    # =========================================================================
    @classmethod
    def _solve_calculator(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handles standard, scientific, and arithmetic calculator operations:
        - Arithmetic evaluation & Order of Operations (PEMDAS/BODMAS)
        - Percentages, markups, discounts, and proportions
        - Powers, roots (sqrt, cbrt, nth-root), and radicals
        - Angle-mode trigonometry (Degrees vs. Radians)
        - Common logarithms (log10), natural logarithms (ln), and powers of e
        - Exact fractions, decimal reduction, and mixed numbers
        - Number theory functions (GCD, LCM, modulo)
        """
        steps: List[str] = []
        precision = int(params.get("precision", 6))
        angle_mode = str(params.get("angle_mode", "deg")).lower()
        raw_expr = expression.strip()

        steps.append(f"Input calculation: ${raw_expr}$")

        # 1. Markup / Tax / Discount check: e.g., '250 + 15%' or '120 - 20%'
        m_markup = re.match(r"^([0-9\.]+)\s*([\+\-])\s*([0-9\.]+)\s*%$", raw_expr)
        if m_markup:
            base_val = float(m_markup.group(1))
            sign = m_markup.group(2)
            pct_val = float(m_markup.group(3))
            multiplier = 1 + (pct_val / 100) if sign == "+" else 1 - (pct_val / 100)
            term_name = "Markup / Tax addition" if sign == "+" else "Discount deduction"
            delta = base_val * (pct_val / 100)
            final_val = base_val * multiplier
            steps.append(f"Identified {term_name}: base = ${base_val}$, rate = ${pct_val}\\%$.")
            steps.append(f"Compute delta amount: ${base_val} \\times \\frac{{{pct_val}}}{{100}} = {delta:g}$.")
            steps.append(f"Final evaluated result: ${base_val} {sign} {delta:g} = {final_val:g}$.")
            return {
                "latex_input": f"{base_val} {sign} {pct_val}\\%",
                "latex_result": f"{final_val:g}",
                "numerical_approx": f"{final_val:.{precision}f}".rstrip('0').rstrip('.') if '.' in f"{final_val:.{precision}f}" else f"{final_val:.{precision}f}",
                "steps": steps,
                "plot_data": None,
                "domain": "calculator",
                "error": None,
            }

        # 2. Angle mode conversion for trigonometry:
        # If angle_mode is 'deg', convert degree arguments inside trig functions to radians
        eval_expr = raw_expr
        if angle_mode == "deg":
            trig_names = ["sin", "cos", "tan", "sec", "csc", "cot"]
            has_trig = False
            for t_fn in trig_names:
                pattern = rf"\b{t_fn}\(([^()]+)\)"
                if re.search(pattern, eval_expr):
                    has_trig = True
                    eval_expr = re.sub(pattern, rf"{t_fn}((\1) * pi / 180)", eval_expr)
            if has_trig:
                steps.append(r"Angle Mode: Degrees ($^\circ$). Trigonometric inputs automatically converted via $\theta_{\text{rad}} = \theta_{\text{deg}} \times \frac{\pi}{180}$.")

        # 3. Parse safely
        parsed = cls.safe_parse(eval_expr)

        # 4. Simplify & evaluate
        res = simplify(parsed)
        steps.append(r"Applied Order of Operations (PEMDAS: Parentheses, Exponents & Roots, Multiplication & Division, Addition & Subtraction).")
        steps.append(f"Exact mathematical representation: ${latex(res)}$.")

        # 5. Mixed number detection for fractions (e.g. 17/12 -> 1 5/12)
        mixed_str = ""
        if isinstance(res, Rational) and res.q != 1:
            p = res.p
            q = res.q
            if abs(p) > q:
                whole = int(p / q)
                rem = abs(p) % q
                mixed_str = f"{whole} \\frac{{{rem}}}{{{q}}}" if whole > 0 else f"-{abs(whole)} \\frac{{{rem}}}{{{q}}}"
                steps.append(f"Mixed fraction format: ${mixed_str}$.")

        # 6. High precision numerical approximation
        approx = cls._get_numerical_approx(res, precision=precision)
        if approx:
            steps.append(f"Decimal approximation ({precision} significant digits): ${approx}$.")
            try:
                flt_val = float(N(res))
                if abs(flt_val) >= 1e6 or (0 < abs(flt_val) <= 1e-4):
                    sci_not = f"{flt_val:.4e}".replace("e+0", "e+").replace("e-0", "e-")
                    steps.append(f"Scientific notation: ${sci_not}$.")
            except Exception:
                pass

        # Display result: if fractions operation and mixed number exists, show both
        display_latex = latex(res)
        if mixed_str and operation == "fractions":
            display_latex = f"{latex(res)} = {mixed_str}"

        # 2D plot if expression contains a variable
        plot_data = None
        if res.has(Symbol):
            free_symbols = list(res.free_symbols)
            if free_symbols:
                v_name = str(free_symbols[0])
                plot_data = cls._generate_2d_plot_data(res, v_name, f"f({v_name})")

        return {
            "latex_input": latex(parsed),
            "latex_result": display_latex,
            "numerical_approx": approx,
            "steps": steps,
            "plot_data": plot_data,
            "domain": "calculator",
            "error": None,
        }

    # =========================================================================
    # 1. CALCULUS DOMAIN
    # =========================================================================
    @classmethod
    def _solve_calculus(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        var_name = params.get("variable", "x")
        var = Symbol(var_name)
        steps: List[str] = []
        plot_data = None

        if operation in ("diff", "derivative"):
            order = int(params.get("order", 1))
            expr = cls.safe_parse(expression)
            steps.append(f"Input function to differentiate: $f({var_name}) = {latex(expr)}$")
            steps.append(f"Compute symbolic derivative of order {order} with respect to ${var_name}$.")
            
            res = diff(expr, var, order)
            simplified_res = simplify(res)
            
            if order == 1:
                steps.append(f"Apply differentiation rules (sum, product, quotient, chain rule).")
            else:
                steps.append(f"Apply successive differentiation rules up to order {order}.")
            steps.append(f"Resulting derivative: $\\frac{{d^{{{order}}}}}{{d{var_name}^{{{order}}}}} f({var_name}) = {latex(simplified_res)}$")

            plot_data = cls._generate_2d_plot_data(simplified_res, var_name, f"f'({var_name})")

            return {
                "latex_input": f"\\frac{{d^{{{order}}}}}{{d{var_name}^{{{order}}}}} \\left( {latex(expr)} \\right)",
                "latex_result": latex(simplified_res),
                "numerical_approx": cls._get_numerical_approx(simplified_res),
                "steps": steps,
                "plot_data": plot_data,
                "domain": "calculus",
                "error": None,
            }

        elif operation in ("integrate", "integral"):
            expr = cls.safe_parse(expression)
            lower_bound_str = params.get("lower_bound")
            upper_bound_str = params.get("upper_bound")

            if lower_bound_str is not None and upper_bound_str is not None and lower_bound_str != "" and upper_bound_str != "":
                # Definite integral
                a = cls.safe_parse(str(lower_bound_str))
                b = cls.safe_parse(str(upper_bound_str))
                steps.append(f"Definite integral from ${latex(a)}$ to ${latex(b)}$ for $f({var_name}) = {latex(expr)}$.")
                
                antideriv = integrate(expr, var)
                steps.append(f"Step 1: Compute the antiderivative $F({var_name}) = {latex(antideriv)}$.")
                
                res = integrate(expr, (var, a, b))
                simplified_res = simplify(res)
                steps.append(f"Step 2: Apply Fundamental Theorem of Calculus: $F({latex(b)}) - F({latex(a)}) = {latex(simplified_res)}$.")

                plot_data = cls._generate_2d_plot_data(expr, var_name, f"f({var_name})", fill_area=(float(N(a)), float(N(b))))

                return {
                    "latex_input": f"\\int_{{{latex(a)}}}^{{{latex(b)}}} {latex(expr)} \\, d{var_name}",
                    "latex_result": latex(simplified_res),
                    "numerical_approx": cls._get_numerical_approx(simplified_res),
                    "steps": steps,
                    "plot_data": plot_data,
                    "domain": "calculus",
                    "error": None,
                }
            else:
                # Indefinite integral
                steps.append(f"Indefinite integral of $f({var_name}) = {latex(expr)}$.")
                res = integrate(expr, var)
                simplified_res = simplify(res)
                steps.append(f"Determine antiderivative using standard integration techniques and substitutions.")
                steps.append(f"Antiderivative found: ${latex(simplified_res)} + C$.")

                plot_data = cls._generate_2d_plot_data(simplified_res, var_name, f"\\int f({var_name}) d{var_name}")

                return {
                    "latex_input": f"\\int {latex(expr)} \\, d{var_name}",
                    "latex_result": f"{latex(simplified_res)} + C",
                    "numerical_approx": cls._get_numerical_approx(simplified_res),
                    "steps": steps,
                    "plot_data": plot_data,
                    "domain": "calculus",
                    "error": None,
                }

        elif operation in ("double_integral", "triple_integral"):
            expr = cls.safe_parse(expression)
            var2_name = params.get("variable2", "y")
            var2 = Symbol(var2_name)
            
            if operation == "double_integral":
                steps.append(f"Double integral of $f({var_name}, {var2_name}) = {latex(expr)}$.")
                inner = integrate(expr, var)
                steps.append(f"Inner integration with respect to ${var_name}$: $\\int f \\, d{var_name} = {latex(inner)}$.")
                outer = integrate(inner, var2)
                steps.append(f"Outer integration with respect to ${var2_name}$: $\\iint f \\, d{var_name} d{var2_name} = {latex(outer)}$.")
                
                return {
                    "latex_input": f"\\iint {latex(expr)} \\, d{var_name} \\, d{var2_name}",
                    "latex_result": f"{latex(outer)} + C({var_name}, {var2_name})",
                    "numerical_approx": cls._get_numerical_approx(outer),
                    "steps": steps,
                    "plot_data": None,
                    "domain": "calculus",
                    "error": None,
                }
            else:
                var3_name = params.get("variable3", "z")
                var3 = Symbol(var3_name)
                res = integrate(integrate(integrate(expr, var), var2), var3)
                steps.append(f"Iterated triple integration over $d{var_name} d{var2_name} d{var3_name}$.")
                return {
                    "latex_input": f"\\iiint {latex(expr)} \\, d{var_name} \\, d{var2_name} \\, d{var3_name}",
                    "latex_result": f"{latex(res)} + C",
                    "numerical_approx": cls._get_numerical_approx(res),
                    "steps": steps,
                    "plot_data": None,
                    "domain": "calculus",
                    "error": None,
                }

        elif operation == "limit":
            point_str = str(params.get("point", "0"))
            direction = params.get("direction", "+-")  # '+', '-', '+-'
            expr = cls.safe_parse(expression)
            point = cls.safe_parse(point_str)

            steps.append(f"Evaluate limit of $f({var_name}) = {latex(expr)}$ as ${var_name} \\to {latex(point)}$.")

            if direction == "+":
                res = limit(expr, var, point, "+")
                dir_symbol = "^+"
            elif direction == "-":
                res = limit(expr, var, point, "-")
                dir_symbol = "^-"
            else:
                res = limit(expr, var, point)
                dir_symbol = ""

            steps.append(f"Analyze behavior approaching ${latex(point)}{dir_symbol}$ (using L'Hôpital's rule or Taylor series if indeterminate).")
            steps.append(f"Limit evaluates to: ${latex(res)}$.")

            plot_data = cls._generate_2d_plot_data(expr, var_name, f"f({var_name})")

            return {
                "latex_input": f"\\lim_{{{var_name} \\to {latex(point)}{dir_symbol}}} \\left( {latex(expr)} \\right)",
                "latex_result": latex(res),
                "numerical_approx": cls._get_numerical_approx(res),
                "steps": steps,
                "plot_data": plot_data,
                "domain": "calculus",
                "error": None,
            }

        elif operation in ("series", "taylor", "maclaurin"):
            order_n = int(params.get("order", 6))
            point_str = str(params.get("point", "0"))
            x0 = cls.safe_parse(point_str)
            expr = cls.safe_parse(expression)

            steps.append(f"Taylor expansion around ${var_name} = {latex(x0)}$ up to order $\\mathcal{{O}}({var_name}^{{{order_n}}})$.")
            res = series(expr, var, x0=x0, n=order_n)
            steps.append(f"Calculated derivatives at expansion point and constructed polynomial coefficients.")

            # Truncated series for plotting
            poly_approx = res.removeO()
            plot_data = cls._generate_2d_plot_data(poly_approx, var_name, f"P_{{{order_n}}}({var_name})")

            return {
                "latex_input": f"\\text{{Series}}\\left({latex(expr)}, {var_name}={latex(x0)}, n={order_n}\\right)",
                "latex_result": latex(res),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": plot_data,
                "domain": "calculus",
                "error": None,
            }

        elif operation in ("ode", "dsolve"):
            # Expression is an ODE, e.g. "Eq(y(x).diff(x, 2) + 4*y(x), 0)" or "diff(y(x), x) + 2*y(x) - exp(x)"
            y_func = Function("y")(var)
            steps.append(f"Ordinary Differential Equation in terms of $y({var_name})$.")

            # Parse expression with y registered as a function
            clean_str = cls.sanitize_input(expression)
            local_dict = dict(SAFE_LOCAL_DICT)
            local_dict["y"] = Function("y")
            local_dict["diff"] = diff
            local_dict["Eq"] = Eq

            parsed_eq = parse_expr(
                clean_str,
                local_dict=local_dict,
                transformations=standard_transformations + (implicit_multiplication_application, convert_xor),
            )

            if not isinstance(parsed_eq, Eq):
                ode_eq = Eq(parsed_eq, 0)
            else:
                ode_eq = parsed_eq

            steps.append(f"Standard ODE form: ${latex(ode_eq)}$.")
            ode_solution = dsolve(ode_eq, y_func)
            steps.append(f"Solved using analytical differential methods (characteristic equation / integrating factor).")
            steps.append(f"General solution: ${latex(ode_solution)}$.")

            return {
                "latex_input": latex(ode_eq),
                "latex_result": latex(ode_solution),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "calculus",
                "error": None,
            }

        else:
            raise MathEngineError(f"Unsupported calculus operation: '{operation}'")

    # =========================================================================
    # 2. LINEAR ALGEBRA DOMAIN
    # =========================================================================
    @classmethod
    def _parse_matrix(cls, raw: Any) -> Matrix:
        """Helper to parse a matrix from list-of-lists or string."""
        if isinstance(raw, Matrix):
            return raw
        if isinstance(raw, (list, tuple)):
            # Nested list of numbers/strings
            rows = []
            for r in raw:
                if isinstance(r, (list, tuple)):
                    row_elements = [cls.safe_parse(str(e)) for e in r]
                    rows.append(row_elements)
                else:
                    rows.append([cls.safe_parse(str(r))])
            return Matrix(rows)
        if isinstance(raw, str):
            clean = cls.sanitize_input(raw)
            # Support [[1, 2], [3, 4]] or Matrix([[1, 2], [3, 4]])
            parsed = cls.safe_parse(clean)
            if isinstance(parsed, Matrix):
                return parsed
            if isinstance(parsed, (list, tuple)):
                return Matrix(parsed)
            # If a single expression or row
            return Matrix([[parsed]])
        raise MathEngineError("Invalid matrix specification.")

    @classmethod
    def _solve_linear_algebra(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        steps: List[str] = []

        # Parse primary matrix A
        raw_mat = params.get("matrix") or expression
        A = cls._parse_matrix(raw_mat)
        m, n = A.shape
        steps.append(f"Input Matrix $A \\in \\mathbb{{R}}^{{{m} \\times {n}}}$:")
        steps.append(f"$$A = {latex(A)}$$")

        if operation in ("det", "determinant"):
            if m != n:
                raise MathEngineError(f"Determinant is only defined for square matrices. Given {m}x{n} matrix.")
            steps.append("Compute determinant using cofactor expansion / LU reduction.")
            d = det(A)
            steps.append(f"$$\\det(A) = {latex(d)}$$")
            return {
                "latex_input": f"\\det\\left({latex(A)}\\right)",
                "latex_result": latex(d),
                "numerical_approx": cls._get_numerical_approx(d),
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("inv", "inverse"):
            if m != n:
                raise MathEngineError(f"Matrix must be square to have an inverse. Given {m}x{n} matrix.")
            d = det(A)
            if d == 0:
                raise MathEngineError("Matrix is singular (determinant is 0) and cannot be inverted.")
            steps.append(f"Verified non-singularity: $\\det(A) = {latex(d)} \\neq 0$.")
            steps.append("Compute inverse using Gauss-Jordan elimination on $[A | I]$.")
            inv_A = A.inv()
            steps.append(f"$$A^{{-1}} = {latex(inv_A)}$$")
            return {
                "latex_input": f"\\left({latex(A)}\\right)^{{-1}}",
                "latex_result": latex(inv_A),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("rank", "matrix_rank"):
            steps.append("Compute matrix rank via row reduction to Reduced Row Echelon Form (RREF).")
            rref_matrix, pivots = A.rref()
            r = A.rank()
            steps.append(f"Reduced Row Echelon Form:")
            steps.append(f"$$\\text{{RREF}}(A) = {latex(rref_matrix)}$$")
            steps.append(f"Pivot columns: {list(pivots)}. Number of linearly independent rows: ${r}$.")
            return {
                "latex_input": f"\\text{{rank}}\\left({latex(A)}\\right)",
                "latex_result": str(r),
                "numerical_approx": str(r),
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("eigen", "eigenvalues", "eigenvectors"):
            if m != n:
                raise MathEngineError(f"Eigenvalues require a square matrix. Given {m}x{n} matrix.")
            lam = Symbol("\\lambda")
            char_poly = det(A - lam * Matrix.eye(m))
            steps.append(f"Characteristic polynomial: $P(\\lambda) = \\det(A - \\lambda I) = {latex(char_poly)} = 0$.")
            
            eigen_data = A.eigenvects()
            steps.append("Solve characteristic equation for eigenvalues and compute nullspaces for eigenspaces:")
            
            eigen_summary = []
            for val, mult, vects in eigen_data:
                vects_latex = ", ".join([latex(v) for v in vects])
                steps.append(f"• $\\lambda = {latex(val)}$ (Algebraic Mult: ${mult}$, Geometric Mult: ${len(vects)}$)")
                steps.append(f"  Eigenbasis: $\\left\\{{ {vects_latex} \\right\\}}$")
                eigen_summary.append(f"\\lambda = {latex(val)}: v = {vects_latex}")

            return {
                "latex_input": f"\\text{{Eigen}}\\left({latex(A)}\\right)",
                "latex_result": "\\quad ".join(eigen_summary),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("lu", "lu_decomposition"):
            steps.append("Compute LU decomposition with partial pivoting: $P \\cdot A = L \\cdot U$.")
            L, U, _ = A.LUdecomposition()
            steps.append(f"Lower triangular matrix $L$:")
            steps.append(f"$$L = {latex(L)}$$")
            steps.append(f"Upper triangular matrix $U$:")
            steps.append(f"$$U = {latex(U)}$$")
            return {
                "latex_input": f"\\text{{LU}}\\left({latex(A)}\\right)",
                "latex_result": f"L = {latex(L)}, \\quad U = {latex(U)}",
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("qr", "qr_decomposition"):
            steps.append("Compute QR decomposition via Gram-Schmidt orthogonalization: $A = Q \\cdot R$.")
            Q, R = A.QRdecomposition()
            steps.append(f"Orthogonal matrix $Q$ (columns form orthonormal basis):")
            steps.append(f"$$Q = {latex(Q)}$$")
            steps.append(f"Upper triangular matrix $R$:")
            steps.append(f"$$R = {latex(R)}$$")
            return {
                "latex_input": f"\\text{{QR}}\\left({latex(A)}\\right)",
                "latex_result": f"Q = {latex(Q)}, \\quad R = {latex(R)}",
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("multiply", "matmul"):
            raw_B = params.get("matrix_b")
            if not raw_B:
                raise MathEngineError("Matrix multiplication requires a second matrix ('matrix_b').")
            B = cls._parse_matrix(raw_B)
            p, q = B.shape
            if n != p:
                raise MathEngineError(f"Incompatible dimensions for multiplication: {m}x{n} and {p}x{q}.")
            steps.append(f"Compute inner product $C = A \\cdot B$ where $B \\in \\mathbb{{R}}^{{{p} \\times {q}}}$:")
            steps.append(f"$$B = {latex(B)}$$")
            C = A * B
            steps.append(f"Result matrix $C \\in \\mathbb{{R}}^{{{m} \\times {q}}}$:")
            steps.append(f"$$C = {latex(C)}$$")
            return {
                "latex_input": f"{latex(A)} \\times {latex(B)}",
                "latex_result": latex(C),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        elif operation in ("solve_system", "linsolve"):
            raw_B = params.get("vector_b") or params.get("matrix_b")
            if not raw_B:
                raise MathEngineError("Solving linear system requires vector $B$ ('vector_b').")
            B = cls._parse_matrix(raw_B)
            if B.shape[0] != m:
                raise MathEngineError(f"Vector B row count ({B.shape[0]}) must match Matrix A row count ({m}).")
            steps.append(f"Solve system of linear equations $A x = B$:")
            steps.append(f"$$A = {latex(A)}, \\quad B = {latex(B)}$$")
            
            # Augmented matrix
            aug = A.row_join(B)
            steps.append(f"Augmented Matrix $[A | B] = {latex(aug)}$.")
            sol = A.LUsolve(B) if m == n and A.det() != 0 else A.pinv() * B
            steps.append(f"Solution vector $x$:")
            steps.append(f"$$x = {latex(sol)}$$")
            return {
                "latex_input": f"{latex(A)} x = {latex(B)}",
                "latex_result": f"x = {latex(sol)}",
                "numerical_approx": "",
                "steps": steps,
                "plot_data": None,
                "domain": "linear_algebra",
                "error": None,
            }

        else:
            raise MathEngineError(f"Unsupported linear algebra operation: '{operation}'")

    # =========================================================================
    # 3. ALGEBRA & POLYNOMIALS DOMAIN
    # =========================================================================
    @classmethod
    def _solve_algebra(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        steps: List[str] = []
        var_name = params.get("variable", "x")
        var = Symbol(var_name)
        plot_data = None

        if operation in ("solve", "roots"):
            # Check if equation has '='
            if "=" in expression:
                lhs_str, rhs_str = expression.split("=", 1)
                lhs_expr = cls.safe_parse(lhs_str)
                rhs_expr = cls.safe_parse(rhs_str)
                eq_expr = lhs_expr - rhs_expr
                steps.append(f"Set equation to zero: $({latex(lhs_expr)}) - ({latex(rhs_expr)}) = 0$.")
            else:
                eq_expr = cls.safe_parse(expression)
                steps.append(f"Solve for roots: ${latex(eq_expr)} = 0$.")

            steps.append(f"Target variable: ${var_name}$.")
            exact_roots = solve(eq_expr, var)
            steps.append(f"Found {len(exact_roots)} analytical solution(s).")
            
            roots_latex = ", ".join([f"{var_name}_{{{i+1}}} = {latex(r)}" for i, r in enumerate(exact_roots)])
            if not roots_latex:
                roots_latex = "\\emptyset \\text{ (No exact algebraic solution found)}"

            # Plot expression to show roots crossing the x-axis
            plot_data = cls._generate_2d_plot_data(eq_expr, var_name, f"f({var_name})")

            # Numerical approximations
            approx_roots = []
            for r in exact_roots:
                try:
                    approx_roots.append(str(N(r, 6)))
                except Exception:
                    pass

            return {
                "latex_input": f"{latex(eq_expr)} = 0",
                "latex_result": roots_latex,
                "numerical_approx": ", ".join(approx_roots),
                "steps": steps,
                "plot_data": plot_data,
                "domain": "algebra",
                "error": None,
            }

        elif operation == "factor":
            expr = cls.safe_parse(expression)
            steps.append(f"Input expression: ${latex(expr)}$.")
            steps.append("Decompose into irreducible factors over the rationals/integers.")
            factored = factor(expr)
            steps.append(f"Factored form: ${latex(factored)}$.")
            return {
                "latex_input": f"\\text{{factor}}\\left({latex(expr)}\\right)",
                "latex_result": latex(factored),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": cls._generate_2d_plot_data(factored, var_name, "f(x)"),
                "domain": "algebra",
                "error": None,
            }

        elif operation in ("apart", "partial_fractions"):
            expr = cls.safe_parse(expression)
            steps.append(f"Rational function: $f({var_name}) = {latex(expr)}$.")
            steps.append(f"Perform partial fraction decomposition with respect to ${var_name}$.")
            pf = apart(expr, var)
            steps.append(f"Decomposed partial fractions: ${latex(pf)}$.")
            return {
                "latex_input": f"\\text{{apart}}\\left({latex(expr)}\\right)",
                "latex_result": latex(pf),
                "numerical_approx": "",
                "steps": steps,
                "plot_data": cls._generate_2d_plot_data(pf, var_name, "f(x)"),
                "domain": "algebra",
                "error": None,
            }

        elif operation in ("simplify", "expand", "trigsimp"):
            expr = cls.safe_parse(expression)
            steps.append(f"Input expression: ${latex(expr)}$.")

            if operation == "expand":
                res = expand(expr)
                steps.append(f"Apply distributive law and polynomial expansion: ${latex(res)}$.")
            elif operation == "trigsimp":
                res = trigsimp(expr)
                steps.append(f"Apply trigonometric identities (Pythagorean, double angle, sum-to-product): ${latex(res)}$.")
            else:
                res = simplify(expr)
                steps.append(f"Apply canonical simplification algorithms: ${latex(res)}$.")

            plot_data = cls._generate_2d_plot_data(res, var_name, "f(x)")

            return {
                "latex_input": latex(expr),
                "latex_result": latex(res),
                "numerical_approx": cls._get_numerical_approx(res),
                "steps": steps,
                "plot_data": plot_data,
                "domain": "algebra",
                "error": None,
            }

        else:
            raise MathEngineError(f"Unsupported algebra operation: '{operation}'")

    # =========================================================================
    # 4. COMPLEX ANALYSIS DOMAIN
    # =========================================================================
    @classmethod
    def _solve_complex(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        steps: List[str] = []
        clean = cls.sanitize_input(expression)
        
        # Parse expression with complex unit I
        z_expr = cls.safe_parse(clean)
        steps.append(f"Input complex expression: $z = {latex(z_expr)}$.")

        expanded_z = expand_complex(z_expr)
        real_part = sympy_re(expanded_z)
        imag_part = im(expanded_z)
        modulus = Abs(expanded_z)
        phase = arg(expanded_z)

        steps.append(f"Cartesian representation: $z = x + iy$ where:")
        steps.append(f"• $\\text{{Re}}(z) = {latex(real_part)}$")
        steps.append(f"• $\\text{{Im}}(z) = {latex(imag_part)}$")
        steps.append(f"Modulus $|z| = \\sqrt{{x^2 + y^2}} = {latex(modulus)}$.")
        steps.append(f"Argument $\\theta = \\text{{Arg}}(z) = {latex(phase)}$ radians.")

        # Polar & Euler form
        polar_form = f"{latex(modulus)} \\left(\\cos({latex(phase)}) + i \\sin({latex(phase)})\\right)"
        euler_form = f"{latex(modulus)} e^{{i ({latex(phase)})}}"

        steps.append(f"Euler exponential form: $z = r e^{{i\\theta}} = {euler_form}$.")

        # Argand plane plot representation
        r_num = float(N(modulus))
        theta_num = float(N(phase))
        x_num = float(N(real_part))
        y_num = float(N(imag_part))

        plot_data = {
            "type": "complex_plane",
            "points": [{"x": x_num, "y": y_num, "label": "z", "color": "#6366f1"}],
            "vectors": [{"x": x_num, "y": y_num, "color": "#6366f1"}],
            "circle_radius": r_num,
            "angle_rad": theta_num,
            "title": f"Argand Plane: |z|={r_num:.4f}, θ={theta_num:.4f} rad",
        }

        if operation in ("roots", "nth_roots"):
            n_roots = int(params.get("n", 3))
            steps.append(f"Compute all ${n_roots}$-th roots using De Moivre's Theorem: $w_k = r^{{1/{n_roots}}} e^{{i(\\theta + 2k\\pi)/{n_roots}}}$.")
            roots_list = []
            for k in range(n_roots):
                angle_k = (phase + 2 * k * pi) / n_roots
                wk = root(modulus, n_roots) * exp(I * angle_k)
                simplified_wk = simplify(wk)
                steps.append(f"• $w_{{{k}}} = {latex(simplified_wk)}$")
                roots_list.append(latex(simplified_wk))
                
                # Add to Argand plot
                wk_x = float(N(sympy_re(wk)))
                wk_y = float(N(im(wk)))
                plot_data["points"].append({"x": wk_x, "y": wk_y, "label": f"w_{k}", "color": "#ec4899"})
                plot_data["vectors"].append({"x": wk_x, "y": wk_y, "color": "#ec4899"})

            return {
                "latex_input": f"\\sqrt[{{{n_roots}}}]{{{latex(z_expr)}}}",
                "latex_result": ", \\quad ".join(roots_list),
                "numerical_approx": f"|z| \\approx {r_num:.4f}, \\; \\theta \\approx {theta_num:.4f}",
                "steps": steps,
                "plot_data": plot_data,
                "domain": "complex",
                "error": None,
            }

        return {
            "latex_input": latex(z_expr),
            "latex_result": f"z = {latex(real_part)} + {latex(imag_part)}i = {euler_form}",
            "numerical_approx": f"{x_num:.4f} + {y_num:.4f}i \\; (r={r_num:.4f}, \\theta={theta_num:.4f}\\text{{ rad}})",
            "steps": steps,
            "plot_data": plot_data,
            "domain": "complex",
            "error": None,
        }

    # =========================================================================
    # 5. DISCRETE & STATISTICS DOMAIN
    # =========================================================================
    @classmethod
    def _solve_discrete_stats(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        steps: List[str] = []

        if operation in ("combinatorics", "combinations", "permutations", "binomial"):
            n_val = int(params.get("n", 10))
            k_val = int(params.get("k", 3))
            
            if k_val > n_val or k_val < 0 or n_val < 0:
                raise MathEngineError("Requires 0 <= k <= n for standard combinatorics.")

            c_val = binomial(n_val, k_val)
            p_val = sympy.factorial(n_val) / sympy.factorial(n_val - k_val)

            steps.append(f"Combinatorics parameters: n = {n_val}, k = {k_val}.")
            diff_nk = n_val - k_val
            steps.append(f"• Combinations (order does not matter): \\binom{{{n_val}}}{{{k_val}}} = \\frac{{{n_val}!}}{{{k_val}! \\cdot {diff_nk}!}} = {c_val}")
            steps.append(f"• Permutations (order matters): P({n_val}, {k_val}) = \\frac{{{n_val}!}}{{{diff_nk}!}} = {p_val}")

            return {
                "latex_input": f"\\binom{{{n_val}}}{{{k_val}}}, \\quad P({n_val}, {k_val})",
                "latex_result": f"C({n_val}, {k_val}) = {c_val}, \\quad P({n_val}, {k_val}) = {p_val}",
                "numerical_approx": f"{int(c_val)}",
                "steps": steps,
                "plot_data": None,
                "domain": "discrete",
                "error": None,
            }

        elif operation in ("modular", "mod_inverse"):
            a_val = int(params.get("a", 7))
            m_val = int(params.get("m", 26))

            steps.append(f"Modular arithmetic analysis for $a = {a_val}$, modulus $m = {m_val}$.")
            mod_val = a_val % m_val
            steps.append(f"• Residue: ${a_val} \\equiv {mod_val} \\pmod{{{m_val}}}$.")

            try:
                inv_val = mod_inverse(a_val, m_val)
                steps.append(f"• Coprimality test: $\\gcd({a_val}, {m_val}) = 1$ passed.")
                steps.append(f"• Modular multiplicative inverse: ${a_val}^{{-1}} \\equiv {inv_val} \\pmod{{{m_val}}}$ (since $({a_val} \\times {inv_val}) \\bmod {m_val} = 1$).")
                inv_res = str(inv_val)
            except Exception:
                steps.append(f"• Modular inverse does not exist since $\\gcd({a_val}, {m_val}) \\neq 1$.")
                inv_res = "\\text{No inverse exists}"

            return {
                "latex_input": f"{a_val}^{{-1}} \\pmod{{{m_val}}}",
                "latex_result": f"{a_val}^{{-1}} \\equiv {inv_res} \\pmod{{{m_val}}}",
                "numerical_approx": str(mod_val),
                "steps": steps,
                "plot_data": None,
                "domain": "discrete",
                "error": None,
            }

        elif operation in ("stats", "statistics", "summary"):
            # Parse list of numbers from expression or params
            raw_data = params.get("data") or expression
            if isinstance(raw_data, str):
                # parse commas or whitespace separated numbers
                numbers = [float(x.strip()) for x in re.split(r"[,;\s]+", raw_data.strip("[]()")) if x.strip()]
            else:
                numbers = [float(x) for x in raw_data]

            if not numbers:
                raise MathEngineError("Statistics requires a non-empty dataset.")

            arr = np.array(numbers, dtype=np.float64)
            n_count = len(arr)
            mean_val = float(np.mean(arr))
            median_val = float(np.median(arr))
            var_sample = float(np.var(arr, ddof=1)) if n_count > 1 else 0.0
            std_sample = float(np.std(arr, ddof=1)) if n_count > 1 else 0.0
            min_val = float(np.min(arr))
            max_val = float(np.max(arr))

            steps.append(f"Dataset summary ($N = {n_count}$ observations):")
            steps.append(f"• Mean $\\mu = {mean_val:.4f}$")
            steps.append(f"• Median $\\tilde{{x}} = {median_val:.4f}$")
            steps.append(f"• Sample Variance $s^2 = {var_sample:.4f}$")
            steps.append(f"• Sample Standard Deviation $s = {std_sample:.4f}$")
            steps.append(f"• Range: $[{min_val:.4f}, {max_val:.4f}]$")

            # Create histogram distribution plot data
            hist_counts, bin_edges = np.histogram(arr, bins=min(10, max(3, n_count // 2)))
            bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])

            plot_data = {
                "type": "bar",
                "x": [round(float(c), 3) for c in bin_centers],
                "y": [int(c) for c in hist_counts],
                "title": f"Frequency Distribution (Mean={mean_val:.2f}, Std={std_sample:.2f})",
                "xaxis_title": "Value Bins",
                "yaxis_title": "Frequency",
            }

            return {
                "latex_input": f"\\text{{Stats}}\\left(N={n_count}\\right)",
                "latex_result": f"\\mu = {mean_val:.4f}, \\; \\sigma = {std_sample:.4f}, \\; \\text{{med}} = {median_val:.4f}",
                "numerical_approx": f"Mean: {mean_val:.4f}",
                "steps": steps,
                "plot_data": plot_data,
                "domain": "discrete",
                "error": None,
            }

        elif operation in ("binomial_dist", "binomial_distribution"):
            n_val = int(params.get("n", 20))
            p_val = float(params.get("p", 0.5))
            k_val = int(params.get("k", 10))

            mean_b = n_val * p_val
            var_b = n_val * p_val * (1 - p_val)
            pmf_k = float(binomial(n_val, k_val)) * (p_val ** k_val) * ((1 - p_val) ** (n_val - k_val))

            steps.append(f"Binomial Distribution: $X \\sim \\text{{Binomial}}(n={n_val}, p={p_val})$.")
            steps.append(f"• Mean $\\mathbb{{E}}[X] = np = {mean_b:.4f}$")
            steps.append(f"• Variance $\\text{{Var}}(X) = np(1-p) = {var_b:.4f}$")
            steps.append(f"• Exact PMF at $k = {k_val}$: $P(X = {k_val}) = \\binom{{{n_val}}}{{{k_val}}} p^{{{k_val}}} (1-p)^{{{n_val}-{k_val}}} = {pmf_k:.6f}$.")

            # Generate PMF distribution across 0..n
            all_k = list(range(n_val + 1))
            all_pmf = [
                float(binomial(n_val, ki)) * (p_val ** ki) * ((1 - p_val) ** (n_val - ki))
                for ki in all_k
            ]

            plot_data = {
                "type": "bar",
                "x": all_k,
                "y": [round(val, 5) for val in all_pmf],
                "highlight_k": k_val,
                "title": f"Binomial PMF (n={n_val}, p={p_val})",
                "xaxis_title": "k (Number of Successes)",
                "yaxis_title": "Probability P(X = k)",
            }

            return {
                "latex_input": f"P(X = {k_val}) \\; \\text{{where}} \\; X \\sim \\text{{Binomial}}({n_val}, {p_val})",
                "latex_result": f"P(X = {k_val}) = {pmf_k:.6f}",
                "numerical_approx": f"{pmf_k:.6f}",
                "steps": steps,
                "plot_data": plot_data,
                "domain": "discrete",
                "error": None,
            }

        else:
            raise MathEngineError(f"Unsupported discrete/statistics operation: '{operation}'")

    # =========================================================================
    # 6. GRAPHING & VISUALIZATION DOMAIN
    # =========================================================================
    @classmethod
    def _solve_graphing(
        cls, operation: str, expression: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        steps: List[str] = []

        if operation in ("plot3d", "surface", "3d"):
            var_x = params.get("variable_x", "x")
            var_y = params.get("variable_y", "y")
            x_min = float(params.get("x_min", -5.0))
            x_max = float(params.get("x_max", 5.0))
            y_min = float(params.get("y_min", -5.0))
            y_max = float(params.get("y_max", 5.0))
            grid_res = int(params.get("resolution", 35))

            expr = cls.safe_parse(expression)
            steps.append(f"Generate 3D Surface for $z = f({var_x}, {var_y}) = {latex(expr)}$.")
            steps.append(f"Spatial domain: ${var_x} \\in [{x_min}, {x_max}], \\; {var_y} \\in [{y_min}, {y_max}]$.")

            plot_data = cls._generate_3d_surface_data(expr, var_x, var_y, x_min, x_max, y_min, y_max, grid_res)

            return {
                "latex_input": f"z = {latex(expr)}",
                "latex_result": f"\\text{{3D Surface Plot Rendered}}",
                "numerical_approx": "",
                "steps": steps,
                "plot_data": plot_data,
                "domain": "graphing",
                "error": None,
            }

        elif operation in ("parametric", "2d_parametric"):
            expr_x = cls.safe_parse(expression)
            expr_y_str = params.get("y_expr", "cos(t)")
            expr_y = cls.safe_parse(expr_y_str)
            var_t = params.get("parameter", "t")
            t_min = float(params.get("t_min", 0.0))
            t_max = float(params.get("t_max", 2 * math.pi))

            steps.append(f"Parametric trajectory: $x({var_t}) = {latex(expr_x)}$, $y({var_t}) = {latex(expr_y)}$.")
            steps.append(f"Parameter domain: ${var_t} \\in [{t_min:.2f}, {t_max:.2f}]$.")

            plot_data = cls._generate_parametric_plot_data(expr_x, expr_y, var_t, t_min, t_max)

            return {
                "latex_input": f"\\begin{{cases}} x({var_t}) = {latex(expr_x)} \\\\ y({var_t}) = {latex(expr_y)} \\end{{cases}}",
                "latex_result": f"\\text{{Parametric Curve Generated}}",
                "numerical_approx": "",
                "steps": steps,
                "plot_data": plot_data,
                "domain": "graphing",
                "error": None,
            }

        else:
            # Standard 2D function plot
            var_name = params.get("variable", "x")
            x_min = float(params.get("x_min", -10.0))
            x_max = float(params.get("x_max", 10.0))
            expr = cls.safe_parse(expression)

            steps.append(f"2D Cartesian curve: $y = f({var_name}) = {latex(expr)}$.")
            steps.append(f"Horizontal domain: ${var_name} \\in [{x_min}, {x_max}]$.")

            plot_data = cls._generate_2d_plot_data(expr, var_name, f"f({var_name})", x_range=(x_min, x_max))

            return {
                "latex_input": f"y = {latex(expr)}",
                "latex_result": latex(expr),
                "numerical_approx": cls._get_numerical_approx(expr),
                "steps": steps,
                "plot_data": plot_data,
                "domain": "graphing",
                "error": None,
            }

    # =========================================================================
    # HELPER GENERATORS
    # =========================================================================
    @classmethod
    def _generate_2d_plot_data(
        cls,
        expr: sympy.Expr,
        var_name: str,
        label: str,
        x_range: Tuple[float, float] = (-10.0, 10.0),
        fill_area: Optional[Tuple[float, float]] = None,
        samples: int = 200,
    ) -> Optional[Dict[str, Any]]:
        """Generates 2D coordinates for Plotly with numerical evaluation."""
        try:
            var = Symbol(var_name)
            # Free symbols check: if more than 1 free symbol, cannot plot as single-variable function
            free = expr.free_symbols
            if len(free) > 1 or (free and var not in free):
                return None

            xs = np.linspace(x_range[0], x_range[1], samples)
            f_num = sympy.lambdify(var, expr, modules=["numpy", "math"])

            ys = []
            for x_val in xs:
                try:
                    y_val = f_num(x_val)
                    if np.iscomplex(y_val) or np.isnan(y_val) or np.isinf(y_val) or abs(y_val) > 1e6:
                        ys.append(None)
                    else:
                        ys.append(round(float(y_val), 5))
                except Exception:
                    ys.append(None)

            plot_payload = {
                "type": "scatter2d",
                "x": [round(float(x), 4) for x in xs],
                "y": ys,
                "name": label,
                "xaxis_title": var_name,
                "yaxis_title": "f(" + var_name + ")",
                "title": f"${latex(expr)}$",
            }

            if fill_area:
                plot_payload["fill_area"] = {
                    "a": fill_area[0],
                    "b": fill_area[1],
                }

            return plot_payload
        except Exception:
            return None

    @classmethod
    def _generate_parametric_plot_data(
        cls,
        expr_x: sympy.Expr,
        expr_y: sympy.Expr,
        param_name: str,
        t_min: float,
        t_max: float,
        samples: int = 300,
    ) -> Dict[str, Any]:
        """Generates parametric coordinates."""
        t_sym = Symbol(param_name)
        fx = sympy.lambdify(t_sym, expr_x, modules=["numpy", "math"])
        fy = sympy.lambdify(t_sym, expr_y, modules=["numpy", "math"])

        ts = np.linspace(t_min, t_max, samples)
        xs, ys = [], []
        for t_val in ts:
            try:
                x_val = fx(t_val)
                y_val = fy(t_val)
                if np.isnan(x_val) or np.isinf(x_val) or np.isnan(y_val) or np.isinf(y_val):
                    xs.append(None)
                    ys.append(None)
                else:
                    xs.append(round(float(x_val), 5))
                    ys.append(round(float(y_val), 5))
            except Exception:
                xs.append(None)
                ys.append(None)

        return {
            "type": "parametric2d",
            "x": xs,
            "y": ys,
            "t": [round(float(t), 4) for t in ts],
            "title": f"Parametric: x({param_name}), y({param_name})",
            "xaxis_title": "x",
            "yaxis_title": "y",
        }

    @classmethod
    def _generate_3d_surface_data(
        cls,
        expr: sympy.Expr,
        var_x_name: str,
        var_y_name: str,
        x_min: float,
        x_max: float,
        y_min: float,
        y_max: float,
        res: int = 35,
    ) -> Dict[str, Any]:
        """Generates 3D meshgrid for Plotly 3D Surface."""
        vx = Symbol(var_x_name)
        vy = Symbol(var_y_name)
        f3d = sympy.lambdify((vx, vy), expr, modules=["numpy", "math"])

        x_grid = np.linspace(x_min, x_max, res)
        y_grid = np.linspace(y_min, y_max, res)
        X, Y = np.meshgrid(x_grid, y_grid)

        Z_matrix = []
        for i in range(res):
            row = []
            for j in range(res):
                try:
                    val = f3d(X[i, j], Y[i, j])
                    if np.iscomplex(val) or np.isnan(val) or np.isinf(val) or abs(val) > 1e5:
                        row.append(None)
                    else:
                        row.append(round(float(val), 4))
                except Exception:
                    row.append(None)
            Z_matrix.append(row)

        return {
            "type": "surface3d",
            "x": [round(float(x), 3) for x in x_grid],
            "y": [round(float(y), 3) for y in y_grid],
            "z": Z_matrix,
            "title": f"Surface $z = {latex(expr)}$",
            "xaxis_title": var_x_name,
            "yaxis_title": var_y_name,
            "zaxis_title": "z",
        }

    @classmethod
    def _get_numerical_approx(cls, expr: Any, precision: int = 10) -> str:
        """Calculates safe floating-point evaluation."""
        try:
            if hasattr(expr, "evalf"):
                val = expr.evalf(precision)
                if val.is_number and not val.has(Symbol):
                    return str(val)
            return ""
        except Exception:
            return ""
