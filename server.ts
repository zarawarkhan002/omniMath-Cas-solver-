import express from "express";
import path from "path";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "2mb" }));

  // API Routes FIRST
  app.get(["/api/health", "/api/health/"], (req, res) => {
    res.json({
      status: "healthy",
      service: "omnimath-cas-server",
      engine: "Django-SymPy-NumPy-SciPy-mpmath",
      sandbox: "active",
    });
  });

  const handleSolve = (req: express.Request, res: express.Response) => {
    const payload = req.body || {};
    const inputStr = JSON.stringify(payload);

    const pythonProcess = spawn("python3", ["solver_runner.py"], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdoutData = "";
    let stderrData = "";
    let isFinished = false;

    const timeout = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        try {
          pythonProcess.kill("SIGKILL");
        } catch {
          // ignore
        }
        res.status(408).json({
          latex_input: payload.expression || "",
          latex_result: "",
          numerical_approx: "",
          steps: null,
          plot_data: null,
          domain: payload.domain || "unknown",
          error: "Process Timeout: Computation exceeded maximum sandbox duration (5.0s).",
        });
      }
    }, 6000);

    pythonProcess.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    pythonProcess.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    pythonProcess.on("close", (code) => {
      clearTimeout(timeout);
      if (isFinished) return;
      isFinished = true;

      if (code !== 0 && !stdoutData.trim()) {
        res.status(500).json({
          latex_input: payload.expression || "",
          latex_result: "",
          numerical_approx: "",
          steps: null,
          plot_data: null,
          domain: payload.domain || "unknown",
          error: `Math engine process exited with code ${code}: ${stderrData.slice(0, 300)}`,
        });
        return;
      }

      try {
        const jsonResult = JSON.parse(stdoutData.trim());
        res.json(jsonResult);
      } catch (parseError) {
        res.status(500).json({
          latex_input: payload.expression || "",
          latex_result: "",
          numerical_approx: "",
          steps: null,
          plot_data: null,
          domain: payload.domain || "unknown",
          error: `Failed to parse solver response: ${stdoutData.slice(0, 200)}`,
        });
      }
    });

    pythonProcess.stdin.write(inputStr);
    pythonProcess.stdin.end();
  };

  app.post("/api/solve", handleSolve);
  app.post("/api/solve/", handleSolve);

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OmniMath server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
