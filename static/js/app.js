/**
 * OmniMath Frontend Application Logic
 * Integrates Virtual Keyboard, KaTeX rendering, Plotly 2D/3D charts, and AJAX solver API.
 */

// Configuration of operations and problem domains
const DOMAIN_CONFIG = {
  calculus: {
    name: "Calculus",
    operations: [
      { id: "diff", name: "Derivative (d/dx)", defaultExpr: "x^3 + sin(x)", params: ["variable", "order"] },
      { id: "integrate", name: "Integral (Definite / Indefinite)", defaultExpr: "x^2 * exp(x)", params: ["variable", "bounds"] },
      { id: "limit", name: "Limit", defaultExpr: "sin(x) / x", params: ["variable", "point", "direction"] },
      { id: "series", name: "Taylor Series Expansion", defaultExpr: "cos(x)", params: ["variable", "point", "order"] },
      { id: "ode", name: "Ordinary Differential Equation (ODE)", defaultExpr: "diff(y(x), x, 2) + 4*y(x)", params: ["variable"] },
      { id: "double_integral", name: "Double Integral", defaultExpr: "x^2 + y^2", params: ["variable", "variable2"] },
    ],
    presets: [
      { label: "d/dx(x³ sin x)", op: "diff", expr: "x^3 * sin(x)" },
      { label: "∫ x² eˣ dx", op: "integrate", expr: "x^2 * exp(x)" },
      { label: "∫₀³ x² dx", op: "integrate", expr: "x^2", params: { lower_bound: "0", upper_bound: "3" } },
      { label: "lim x→0 sin(x)/x", op: "limit", expr: "sin(x)/x", params: { point: "0" } },
      { label: "y'' + 4y = 0", op: "ode", expr: "diff(y(x), x, 2) + 4*y(x)" },
    ],
  },
  linear_algebra: {
    name: "Linear Algebra",
    operations: [
      { id: "det", name: "Determinant det(A)", defaultExpr: "[[1, 2], [3, 4]]", params: [] },
      { id: "inv", name: "Matrix Inverse A⁻¹", defaultExpr: "[[4, 7], [2, 6]]", params: [] },
      { id: "eigen", name: "Eigenvalues & Eigenvectors", defaultExpr: "[[2, 1], [1, 2]]", params: [] },
      { id: "rank", name: "Matrix Rank & RREF", defaultExpr: "[[1, 2, 3], [4, 5, 6], [7, 8, 9]]", params: [] },
      { id: "lu", name: "LU Decomposition (P·A = L·U)", defaultExpr: "[[2, -1, -2], [-4, 6, 3], [-4, -2, 8]]", params: [] },
      { id: "qr", name: "QR Decomposition (A = Q·R)", defaultExpr: "[[12, -51], [6, 167]]", params: [] },
      { id: "multiply", name: "Matrix Multiplication A × B", defaultExpr: "[[1, 2], [3, 4]]", params: ["matrix_b"] },
      { id: "solve_system", name: "Solve System Ax = B", defaultExpr: "[[2, 1], [1, -1]]", params: ["vector_b"] },
    ],
    presets: [
      { label: "2×2 Determinant", op: "det", expr: "[[1, 2], [3, 4]]" },
      { label: "Eigenvalues [[2,1],[1,2]]", op: "eigen", expr: "[[2, 1], [1, 2]]" },
      { label: "3×3 Inverse", op: "inv", expr: "[[1, 0, 2], [2, -1, 3], [4, 1, 8]]" },
      { label: "Solve Ax = B", op: "solve_system", expr: "[[3, 2], [1, 4]]", params: { vector_b: "[[18], [16]]" } },
    ],
  },
  algebra: {
    name: "Algebra & Polynomials",
    operations: [
      { id: "solve", name: "Find Roots / Solve Equation", defaultExpr: "x^3 - 6*x^2 + 11*x - 6 = 0", params: ["variable"] },
      { id: "factor", name: "Factor Polynomial", defaultExpr: "x^4 - 16", params: [] },
      { id: "apart", name: "Partial Fractions Decomposition", defaultExpr: "1 / (x^2 - 5*x + 6)", params: ["variable"] },
      { id: "simplify", name: "Simplify Canonical Expression", defaultExpr: "(x^2 - 1)/(x - 1)", params: [] },
      { id: "expand", name: "Expand Expression", defaultExpr: "(x + 2)^4", params: [] },
      { id: "trigsimp", name: "Trigonometric Simplification", defaultExpr: "sin(x)^4 - cos(x)^4", params: [] },
    ],
    presets: [
      { label: "Solve x³-6x²+11x-6=0", op: "solve", expr: "x^3 - 6*x^2 + 11*x - 6 = 0" },
      { label: "Factor x⁴ - 16", op: "factor", expr: "x^4 - 16" },
      { label: "Partial Fractions 1/(x²-1)", op: "apart", expr: "1 / (x^2 - 1)" },
      { label: "Trig sin⁴x - cos⁴x", op: "trigsimp", expr: "sin(x)^4 - cos(x)^4" },
    ],
  },
  complex: {
    name: "Complex Analysis",
    operations: [
      { id: "euler", name: "Cartesian to Polar / Euler Form", defaultExpr: "3 + 4*I", params: [] },
      { id: "roots", name: "N-th Roots of Complex Number", defaultExpr: "-8", params: ["nth_roots"] },
    ],
    presets: [
      { label: "3 + 4i Euler Form", op: "euler", expr: "3 + 4*I" },
      { label: "Cube Roots of -8", op: "roots", expr: "-8", params: { n: "3" } },
      { label: "4th Roots of 1 (Roots of Unity)", op: "roots", expr: "1", params: { n: "4" } },
    ],
  },
  discrete: {
    name: "Discrete & Stats",
    operations: [
      { id: "combinatorics", name: "Combinatorics C(n, k) & P(n, k)", defaultExpr: "", params: ["n_k"] },
      { id: "modular", name: "Modular Arithmetic & Inverse", defaultExpr: "", params: ["a_m"] },
      { id: "stats", name: "Descriptive Statistics & Summary", defaultExpr: "12, 15, 14, 10, 18, 19, 22, 16, 17, 15", params: [] },
      { id: "binomial_dist", name: "Binomial Distribution PMF", defaultExpr: "", params: ["binomial_params"] },
    ],
    presets: [
      { label: "C(10, 3) & P(10, 3)", op: "combinatorics", expr: "", params: { n: "10", k: "3" } },
      { label: "3⁻¹ mod 11", op: "modular", expr: "", params: { a: "3", m: "11" } },
      { label: "Dataset Stats", op: "stats", expr: "4, 8, 6, 5, 3, 2, 8, 9, 2, 5" },
      { label: "Binomial (n=20, p=0.4)", op: "binomial_dist", expr: "", params: { n: "20", p: "0.4", k: "8" } },
    ],
  },
  graphing: {
    name: "2D / 3D Graphing",
    operations: [
      { id: "plot2d", name: "2D Cartesian Function y = f(x)", defaultExpr: "sin(x) * exp(-0.1*x^2)", params: ["x_bounds"] },
      { id: "surface", name: "3D Surface z = f(x, y)", defaultExpr: "sin(sqrt(x^2 + y^2))", params: ["surface_bounds"] },
      { id: "parametric", name: "2D Parametric x(t), y(t)", defaultExpr: "sin(3*t)", params: ["parametric_y"] },
    ],
    presets: [
      { label: "Damped Wave", op: "plot2d", expr: "sin(x) * exp(-0.1*x^2)" },
      { label: "3D Ripple Surface", op: "surface", expr: "sin(sqrt(x^2 + y^2))" },
      { label: "3D Saddle Surface", op: "surface", expr: "x^2 - y^2" },
      { label: "Parametric Lissajous", op: "parametric", expr: "sin(3*t)", params: { y_expr: "cos(2*t)", t_min: "0", t_max: "6.28" } },
    ],
  },
};

// Virtual Keypad Definitions
const KEYPAD_CATEGORIES = {
  ops: [
    { label: "+", insert: " + " },
    { label: "-", insert: " - " },
    { label: "*", insert: "*" },
    { label: "/", insert: "/" },
    { label: "^", insert: "^" },
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
    { label: "x", insert: "x" },
    { label: "y", insert: "y" },
    { label: "z", insert: "z" },
    { label: "t", insert: "t" },
    { label: "π", insert: "pi" },
    { label: "e", insert: "E" },
    { label: "i", insert: "I" },
    { label: "√x", insert: "sqrt(" },
    { label: "x²", insert: "^2" },
  ],
  calc: [
    { label: "d/dx", insert: "diff(f, x)" },
    { label: "∫", insert: "integrate(f, x)" },
    { label: "lim", insert: "limit(f, x, 0)" },
    { label: "y''", insert: "diff(y(x), x, 2)" },
    { label: "y'", insert: "diff(y(x), x)" },
    { label: "y(x)", insert: "y(x)" },
    { label: "ln", insert: "log(" },
    { label: "exp", insert: "exp(" },
  ],
  trig: [
    { label: "sin", insert: "sin(" },
    { label: "cos", insert: "cos(" },
    { label: "tan", insert: "tan(" },
    { label: "asin", insert: "asin(" },
    { label: "acos", insert: "acos(" },
    { label: "atan", insert: "atan(" },
    { label: "sinh", insert: "sinh(" },
    { label: "cosh", insert: "cosh(" },
  ],
  matrix: [
    { label: "[ [ ] ]", insert: "[[1, 0], [0, 1]]" },
    { label: "3x3 I", insert: "[[1, 0, 0], [0, 1, 0], [0, 0, 1]]" },
    { label: "det()", insert: "det(" },
    { label: "inv()", insert: "inv(" },
    { label: "col [ ]", insert: "[[1], [2]]" },
    { label: ",", insert: ", " },
    { label: "[", insert: "[" },
    { label: "]", insert: "]" },
  ],
};

// Application State
let currentDomain = "calculus";
let currentOperation = "diff";
let currentParams = {};
let lastSolutionLatex = "";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  setupDomainTabs();
  setupKeypadTabs();
  setupEventListeners();
  loadDomain("calculus");
});

function setupDomainTabs() {
  const tabs = document.querySelectorAll(".domain-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const domain = tab.getAttribute("data-domain");
      if (domain && domain !== currentDomain) {
        tabs.forEach((t) => {
          t.classList.remove("active", "bg-indigo-600", "text-white", "shadow-sm");
          t.classList.add("text-slate-400", "hover:text-slate-200", "hover:bg-slate-900");
        });
        tab.classList.add("active", "bg-indigo-600", "text-white", "shadow-sm");
        tab.classList.remove("text-slate-400", "hover:text-slate-200", "hover:bg-slate-900");
        loadDomain(domain);
      }
    });
  });
}

function setupKeypadTabs() {
  const tabs = document.querySelectorAll(".keypad-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const cat = tab.getAttribute("data-cat");
      tabs.forEach((t) => {
        t.classList.remove("active", "bg-slate-800", "text-slate-300");
        t.classList.add("text-slate-400");
      });
      tab.classList.add("active", "bg-slate-800", "text-slate-300");
      renderKeypad(cat);
    });
  });
  renderKeypad("ops");
}

function renderKeypad(category) {
  const container = document.getElementById("virtualKeypad");
  if (!container) return;
  container.innerHTML = "";
  const keys = KEYPAD_CATEGORIES[category] || KEYPAD_CATEGORIES.ops;
  keys.forEach((key) => {
    const btn = document.createElement("button");
    btn.className =
      "px-2 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors border border-slate-700/50 flex items-center justify-center";
    btn.innerText = key.label;
    btn.addEventListener("click", () => insertAtCursor(key.insert));
    container.appendChild(btn);
  });
}

function insertAtCursor(text) {
  const input = document.getElementById("expressionInput");
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);
  input.value = before + text + after;
  input.focus();
  input.selectionStart = input.selectionEnd = start + text.length;
  updateLiveMathPreview();
}

function loadDomain(domain) {
  currentDomain = domain;
  const config = DOMAIN_CONFIG[domain];
  if (!config) return;

  // Populate operation dropdown
  const opSelect = document.getElementById("operationSelect");
  opSelect.innerHTML = "";
  config.operations.forEach((op) => {
    const opt = document.createElement("option");
    opt.value = op.id;
    opt.innerText = op.name;
    opSelect.appendChild(opt);
  });

  // Load first operation
  currentOperation = config.operations[0].id;
  opSelect.value = currentOperation;
  document.getElementById("expressionInput").value = config.operations[0].defaultExpr;

  // Populate Presets
  renderPresets(config.presets);
  renderDynamicParams();
  updateLiveMathPreview();
}

function renderPresets(presets) {
  const container = document.getElementById("presetsContainer");
  container.innerHTML = "";
  presets.forEach((p) => {
    const chip = document.createElement("button");
    chip.className =
      "px-2 py-0.5 rounded text-xs bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-medium whitespace-nowrap transition-colors border border-slate-700/60";
    chip.innerText = p.label;
    chip.addEventListener("click", () => {
      document.getElementById("operationSelect").value = p.op;
      currentOperation = p.op;
      document.getElementById("expressionInput").value = p.expr;
      currentParams = p.params || {};
      renderDynamicParams();
      updateLiveMathPreview();
      computeSolution();
    });
    container.appendChild(chip);
  });
}

function renderDynamicParams() {
  const container = document.getElementById("dynamicParamsContainer");
  container.innerHTML = "";
  const domainConfig = DOMAIN_CONFIG[currentDomain];
  const opObj = domainConfig.operations.find((o) => o.id === currentOperation);
  if (!opObj) return;

  const params = opObj.params || [];
  params.forEach((paramType) => {
    if (paramType === "variable") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Variable</label>
          <input type="text" id="param_variable" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.variable || 'x'}">
        </div>`;
    } else if (paramType === "order") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Order (n)</label>
          <input type="number" id="param_order" min="1" max="10" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.order || 1}">
        </div>`;
    } else if (paramType === "bounds") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Lower Bound (optional)</label>
          <input type="text" id="param_lower_bound" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" placeholder="e.g. 0" value="${currentParams.lower_bound || ''}">
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Upper Bound (optional)</label>
          <input type="text" id="param_upper_bound" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" placeholder="e.g. pi" value="${currentParams.upper_bound || ''}">
        </div>`;
    } else if (paramType === "point") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Evaluation Point</label>
          <input type="text" id="param_point" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.point || '0'}">
        </div>`;
    } else if (paramType === "matrix_b") {
      container.innerHTML += `
        <div class="col-span-2">
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Matrix B (right operand)</label>
          <input type="text" id="param_matrix_b" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="[[1, 0], [0, 1]]">
        </div>`;
    } else if (paramType === "vector_b") {
      container.innerHTML += `
        <div class="col-span-2">
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Vector B</label>
          <input type="text" id="param_vector_b" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="[[4], [1]]">
        </div>`;
    } else if (paramType === "nth_roots") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Roots Count (n)</label>
          <input type="number" id="param_n" min="2" max="12" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.n || 3}">
        </div>`;
    } else if (paramType === "n_k") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Total (n)</label>
          <input type="number" id="param_n" min="0" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.n || 10}">
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Choose (k)</label>
          <input type="number" id="param_k" min="0" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.k || 3}">
        </div>`;
    } else if (paramType === "a_m") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Number (a)</label>
          <input type="number" id="param_a" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.a || 7}">
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Modulus (m)</label>
          <input type="number" id="param_m" min="2" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.m || 26}">
        </div>`;
    } else if (paramType === "binomial_params") {
      container.innerHTML += `
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Trials (n)</label>
          <input type="number" id="param_n" min="1" max="100" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.n || 20}">
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Prob (p)</label>
          <input type="number" id="param_p" step="0.05" min="0" max="1" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.p || 0.5}">
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 font-medium mb-1">Target (k)</label>
          <input type="number" id="param_k" min="0" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.k || 10}">
        </div>`;
    } else if (paramType === "parametric_y") {
      container.innerHTML += `
        <div class="col-span-2">
          <label class="block text-[11px] text-slate-400 font-medium mb-1">y(t) Function</label>
          <input type="text" id="param_y_expr" class="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500" value="${currentParams.y_expr || 'cos(2*t)'}">
        </div>`;
    }
  });
}

function setupEventListeners() {
  document.getElementById("operationSelect").addEventListener("change", (e) => {
    currentOperation = e.target.value;
    const domainConfig = DOMAIN_CONFIG[currentDomain];
    const op = domainConfig.operations.find((o) => o.id === currentOperation);
    if (op) {
      document.getElementById("expressionInput").value = op.defaultExpr;
      currentParams = {};
      renderDynamicParams();
      updateLiveMathPreview();
    }
  });

  document.getElementById("expressionInput").addEventListener("input", updateLiveMathPreview);

  document.getElementById("computeBtn").addEventListener("click", computeSolution);

  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("expressionInput").value = "";
    document.getElementById("liveMathPreview").innerHTML = "";
    document.getElementById("solutionDisplay").innerHTML = '<span class="text-slate-500 text-sm">Enter expression and click Compute</span>';
    document.getElementById("numericalDisplayWrapper").classList.add("hidden");
    document.getElementById("stepsList").innerHTML = '<p class="text-slate-500 text-xs italic">Step-by-step mathematical reasoning will appear here.</p>';
    document.getElementById("stepsCount").innerText = "0 steps";
    document.getElementById("plotlyChart").innerHTML = "Visualization will render automatically when functions or matrices are evaluated";
  });

  document.getElementById("copyLatexBtn").addEventListener("click", () => {
    if (lastSolutionLatex) {
      navigator.clipboard.writeText(lastSolutionLatex).then(() => {
        const btn = document.getElementById("copyLatexBtn");
        btn.innerText = "Copied!";
        setTimeout(() => (btn.innerText = "Copy LaTeX"), 1500);
      });
    }
  });
}

function updateLiveMathPreview() {
  const raw = document.getElementById("expressionInput").value.trim();
  const preview = document.getElementById("liveMathPreview");
  if (!raw) {
    preview.innerHTML = '<span class="text-slate-600 text-xs">Waiting for input...</span>';
    return;
  }
  try {
    if (window.katex) {
      katex.render(raw, preview, { throwOnError: false, displayMode: false });
    } else {
      preview.innerText = raw;
    }
  } catch (e) {
    preview.innerText = raw;
  }
}

function gatherParams() {
  const p = {};
  const vEl = document.getElementById("param_variable");
  if (vEl) p.variable = vEl.value;

  const oEl = document.getElementById("param_order");
  if (oEl) p.order = parseInt(oEl.value, 10);

  const lbEl = document.getElementById("param_lower_bound");
  if (lbEl && lbEl.value.trim()) p.lower_bound = lbEl.value.trim();

  const ubEl = document.getElementById("param_upper_bound");
  if (ubEl && ubEl.value.trim()) p.upper_bound = ubEl.value.trim();

  const ptEl = document.getElementById("param_point");
  if (ptEl) p.point = ptEl.value.trim();

  const mbEl = document.getElementById("param_matrix_b");
  if (mbEl) p.matrix_b = mbEl.value.trim();

  const vbEl = document.getElementById("param_vector_b");
  if (vbEl) p.vector_b = vbEl.value.trim();

  const nEl = document.getElementById("param_n");
  if (nEl) p.n = parseInt(nEl.value, 10);

  const kEl = document.getElementById("param_k");
  if (kEl) p.k = parseInt(kEl.value, 10);

  const aEl = document.getElementById("param_a");
  if (aEl) p.a = parseInt(aEl.value, 10);

  const mEl = document.getElementById("param_m");
  if (mEl) p.m = parseInt(mEl.value, 10);

  const probEl = document.getElementById("param_p");
  if (probEl) p.p = parseFloat(probEl.value);

  const yeEl = document.getElementById("param_y_expr");
  if (yeEl) p.y_expr = yeEl.value.trim();

  return p;
}

async function computeSolution() {
  const expr = document.getElementById("expressionInput").value.trim();
  const spinner = document.getElementById("computeBtnSpinner");
  const computeBtn = document.getElementById("computeBtn");
  const solDisplay = document.getElementById("solutionDisplay");
  const numDisplayWrapper = document.getElementById("numericalDisplayWrapper");
  const numDisplay = document.getElementById("numericalDisplay");
  const stepsList = document.getElementById("stepsList");
  const stepsCount = document.getElementById("stepsCount");
  const executionTimeEl = document.getElementById("executionTime");

  spinner.classList.remove("hidden");
  computeBtn.disabled = true;

  const startTime = performance.now();
  const parameters = gatherParams();

  const payload = {
    domain: currentDomain,
    operation: currentOperation,
    expression: expr,
    parameters: parameters,
  };

  try {
    const res = await fetch("/api/solve/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const elapsed = Math.round(performance.now() - startTime);
    executionTimeEl.innerText = `Latency: ${elapsed} ms`;

    const data = await res.json();

    if (data.error) {
      solDisplay.innerHTML = `<div class="text-rose-400 text-sm font-mono p-2 bg-rose-950/40 rounded border border-rose-800/60">⚠️ Error: ${escapeHtml(data.error)}</div>`;
      numDisplayWrapper.classList.add("hidden");
      stepsList.innerHTML = `<p class="text-rose-400 text-xs italic">Calculation terminated with error.</p>`;
      stepsCount.innerText = "0 steps";
      return;
    }

    lastSolutionLatex = data.latex_result || "";

    // Render LaTeX Solution
    if (window.katex && data.latex_result) {
      solDisplay.innerHTML = "";
      katex.render(data.latex_result, solDisplay, {
        throwOnError: false,
        displayMode: true,
      });
    } else {
      solDisplay.innerText = data.latex_result || "Complete";
    }

    // Numerical Approximation
    if (data.numerical_approx) {
      numDisplayWrapper.classList.remove("hidden");
      numDisplay.innerText = data.numerical_approx;
    } else {
      numDisplayWrapper.classList.add("hidden");
    }

    // Step-by-Step Breakdown
    if (data.steps && data.steps.length > 0) {
      stepsCount.innerText = `${data.steps.length} steps`;
      stepsList.innerHTML = "";
      data.steps.forEach((step, idx) => {
        const stepDiv = document.createElement("div");
        stepDiv.className = "p-2 rounded bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 flex flex-col gap-1";
        
        // Render step with KaTeX math
        stepDiv.innerHTML = formatStepMath(step);
        stepsList.appendChild(stepDiv);
      });
    } else {
      stepsCount.innerText = "0 steps";
      stepsList.innerHTML = `<p class="text-slate-500 text-xs italic">No intermediate symbolic steps required.</p>`;
    }

    // Plot Render
    renderPlot(data.plot_data);

  } catch (err) {
    solDisplay.innerHTML = `<div class="text-rose-400 text-sm font-mono">⚠️ Network or Server Error: ${escapeHtml(err.message)}</div>`;
  } finally {
    spinner.classList.add("hidden");
    computeBtn.disabled = false;
  }
}

function formatStepMath(text) {
  // Convert $$...$$ and $...$ into KaTeX HTML strings
  let formatted = text.replace(/\$\$(.+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    } catch {
      return `$$${math}$$`;
    }
  });

  formatted = formatted.replace(/\$(.+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch {
      return `$${math}$`;
    }
  });

  return formatted;
}

function renderPlot(plotData) {
  const chartEl = document.getElementById("plotlyChart");
  const titleBadge = document.getElementById("plotTypeBadge");
  if (!chartEl || !window.Plotly) return;

  if (!plotData) {
    chartEl.innerHTML = '<div class="text-slate-500 text-sm flex items-center justify-center h-full">No graphical visualization for this operation</div>';
    titleBadge.innerText = "No Plot";
    return;
  }

  const darkLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#94a3b8", family: "monospace", size: 11 },
    margin: { l: 45, r: 25, t: 30, b: 40 },
    xaxis: { gridcolor: "#1e293b", zerolinecolor: "#475569" },
    yaxis: { gridcolor: "#1e293b", zerolinecolor: "#475569" },
    autosize: true,
  };

  if (plotData.type === "scatter2d") {
    titleBadge.innerText = "2D Curve";
    const traces = [
      {
        x: plotData.x,
        y: plotData.y,
        mode: "lines",
        name: plotData.name || "f(x)",
        line: { color: "#6366f1", width: 2.5 },
      },
    ];

    if (plotData.fill_area) {
      // Add shaded area under curve between a and b
      const a = plotData.fill_area.a;
      const b = plotData.fill_area.b;
      const fillX = [];
      const fillY = [];
      for (let i = 0; i < plotData.x.length; i++) {
        if (plotData.x[i] >= a && plotData.x[i] <= b) {
          fillX.push(plotData.x[i]);
          fillY.push(plotData.y[i]);
        }
      }
      if (fillX.length > 0) {
        traces.push({
          x: fillX,
          y: fillY,
          fill: "tozeroy",
          fillcolor: "rgba(99, 102, 241, 0.25)",
          mode: "none",
          name: `Area [${a}, ${b}]`,
        });
      }
    }

    Plotly.newPlot(chartEl, traces, darkLayout, { responsive: true, displayModeBar: false });

  } else if (plotData.type === "surface3d") {
    titleBadge.innerText = "3D Surface";
    const trace = {
      z: plotData.z,
      x: plotData.x,
      y: plotData.y,
      type: "surface",
      colorscale: "Viridis",
      contours: {
        z: { show: true, usecolormap: true, highlightcolor: "#fff", project: { z: true } },
      },
    };

    const layout3d = {
      ...darkLayout,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      scene: {
        xaxis: { title: plotData.xaxis_title || "x", gridcolor: "#334155" },
        yaxis: { title: plotData.yaxis_title || "y", gridcolor: "#334155" },
        zaxis: { title: plotData.zaxis_title || "z", gridcolor: "#334155" },
        camera: { eye: { x: 1.4, y: 1.4, z: 1.2 } },
      },
    };

    Plotly.newPlot(chartEl, [trace], layout3d, { responsive: true });

  } else if (plotData.type === "parametric2d") {
    titleBadge.innerText = "2D Parametric";
    const trace = {
      x: plotData.x,
      y: plotData.y,
      mode: "lines",
      line: { color: "#ec4899", width: 2.5 },
      name: "Trajectory",
    };
    Plotly.newPlot(chartEl, [trace], darkLayout, { responsive: true, displayModeBar: false });

  } else if (plotData.type === "complex_plane") {
    titleBadge.innerText = "Argand Plane";
    const traces = [];

    // Unit or modulus circle
    if (plotData.circle_radius) {
      const circleTheta = [];
      const circleX = [];
      const circleY = [];
      for (let i = 0; i <= 100; i++) {
        const th = (2 * Math.PI * i) / 100;
        circleX.push(plotData.circle_radius * Math.cos(th));
        circleY.push(plotData.circle_radius * Math.sin(th));
      }
      traces.push({
        x: circleX,
        y: circleY,
        mode: "lines",
        line: { color: "#334155", dash: "dash", width: 1 },
        name: `|z| = ${plotData.circle_radius.toFixed(2)}`,
      });
    }

    // Vectors from origin
    (plotData.vectors || []).forEach((vec, idx) => {
      traces.push({
        x: [0, vec.x],
        y: [0, vec.y],
        mode: "lines+markers",
        line: { color: vec.color || "#6366f1", width: 2 },
        name: `Vector ${idx + 1}`,
      });
    });

    const complexLayout = {
      ...darkLayout,
      xaxis: { title: "Real Axis (Re)", gridcolor: "#1e293b", zerolinecolor: "#475569" },
      yaxis: { title: "Imaginary Axis (Im)", scaleanchor: "x", scaleratio: 1, gridcolor: "#1e293b", zerolinecolor: "#475569" },
    };

    Plotly.newPlot(chartEl, traces, complexLayout, { responsive: true, displayModeBar: false });

  } else if (plotData.type === "bar") {
    titleBadge.innerText = "Distribution";
    const trace = {
      x: plotData.x,
      y: plotData.y,
      type: "bar",
      marker: { color: "#6366f1" },
    };
    Plotly.newPlot(chartEl, [trace], darkLayout, { responsive: true, displayModeBar: false });
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
