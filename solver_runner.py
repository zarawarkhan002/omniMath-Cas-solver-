#!/usr/bin/env python3
"""
CLI/IPC bridge for OmniMath MathEngine.
Enables high-performance direct JSON-in / JSON-out execution from Express server.
"""
import sys
import json
import os

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Set DJANGO_SETTINGS_MODULE
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from apps.solver.services.math_engine import MathEngine

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty request payload", "latex_result": "", "latex_input": ""}))
            return

        payload = json.loads(raw_input)
        domain = payload.get("domain", "algebra")
        operation = payload.get("operation", "simplify")
        expression = payload.get("expression", "")
        parameters = payload.get("parameters", {})

        result = MathEngine.solve(
            domain=domain,
            operation=operation,
            expression=expression,
            parameters=parameters,
        )
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({
            "error": f"Execution error: {str(exc)}",
            "latex_result": "",
            "latex_input": "",
            "domain": "unknown",
            "plot_data": None,
            "steps": None,
        }))

if __name__ == "__main__":
    main()
