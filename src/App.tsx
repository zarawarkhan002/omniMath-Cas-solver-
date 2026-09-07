import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import { ProblemDomain, SolveResponse, CalculationHistoryItem } from './types';
import { DOMAIN_DATA } from './domainData';
import { Header } from './components/Header';
import { DomainTabs } from './components/DomainTabs';
import { VirtualKeypad } from './components/VirtualKeypad';
import { DynamicParams } from './components/DynamicParams';
import { SolutionCard } from './components/SolutionCard';
import { StepBreakdown } from './components/StepBreakdown';
import { PlotViewer } from './components/PlotViewer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { Play, RotateCcw, HelpCircle } from 'lucide-react';

export function App() {
  const [currentDomain, setCurrentDomain] = useState<ProblemDomain>('calculus');
  const [currentOperation, setCurrentOperation] = useState<string>('diff');
  const [expression, setExpression] = useState<string>('x^3 + sin(x)');
  const [params, setParams] = useState<Record<string, any>>({ variable: 'x', order: 1 });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [solution, setSolution] = useState<SolveResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const livePreviewRef = useRef<HTMLDivElement>(null);

  // When domain changes, reset operation and expression to first operation of domain
  const handleDomainChange = (domain: ProblemDomain) => {
    setCurrentDomain(domain);
    const domainCfg = DOMAIN_DATA[domain];
    if (domainCfg && domainCfg.operations.length > 0) {
      const firstOp = domainCfg.operations[0];
      setCurrentOperation(firstOp.id);
      setExpression(firstOp.defaultExpr);
      setParams({});
    }
  };

  // When operation changes, set default expression
  const handleOperationChange = (opId: string) => {
    setCurrentOperation(opId);
    const domainCfg = DOMAIN_DATA[currentDomain];
    const op = domainCfg.operations.find((o) => o.id === opId);
    if (op) {
      setExpression(op.defaultExpr);
      setParams({});
    }
  };

  // Apply a preset problem
  const handleApplyPreset = (preset: { op: string; expr: string; params?: Record<string, any> }) => {
    setCurrentOperation(preset.op);
    setExpression(preset.expr);
    setParams(preset.params || {});
    // Trigger compute shortly after state updates
    setTimeout(() => {
      triggerSolve(preset.op, preset.expr, preset.params || {});
    }, 50);
  };

  // Update live preview with KaTeX
  useEffect(() => {
    if (livePreviewRef.current) {
      if (!expression.trim()) {
        livePreviewRef.current.innerHTML = '<span class="text-slate-600 text-xs">Waiting for expression input...</span>';
        return;
      }
      try {
        katex.render(expression, livePreviewRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        livePreviewRef.current.innerText = expression;
      }
    }
  }, [expression]);

  // Insert text from virtual keypad at cursor position
  const handleKeypadInsert = (text: string) => {
    if (!inputRef.current) {
      setExpression((prev) => prev + text);
      return;
    }
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const nextExpr = expression.substring(0, start) + text + expression.substring(end);
    setExpression(nextExpr);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.selectionEnd = start + text.length;
      }
    }, 10);
  };

  // Compute solution via backend API
  const triggerSolve = async (
    op = currentOperation,
    expr = expression,
    p = params
  ) => {
    setLoading(true);
    const startTime = performance.now();

    const payload = {
      domain: currentDomain,
      operation: op,
      expression: expr.trim(),
      parameters: p,
    };

    try {
      const res = await fetch('/api/solve/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);

      const data: SolveResponse = await res.json();
      setSolution(data);

      if (!data.error) {
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            timestamp: Date.now(),
            domain: currentDomain,
            operation: op,
            expression: expr,
            latex_result: data.latex_result,
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (err: any) {
      setSolution({
        latex_input: expr,
        latex_result: '',
        numerical_approx: '',
        steps: null,
        plot_data: null,
        domain: currentDomain,
        error: `Network / Request Error: ${err.message || 'Failed to reach backend API.'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setExpression('');
    setSolution(null);
    setLatencyMs(undefined);
  };

  const handleBackspace = () => {
    if (!inputRef.current) {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    if (start === end && start > 0) {
      const nextExpr = expression.substring(0, start - 1) + expression.substring(end);
      setExpression(nextExpr);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.selectionEnd = start - 1;
        }
      }, 10);
    } else if (start !== end) {
      const nextExpr = expression.substring(0, start) + expression.substring(end);
      setExpression(nextExpr);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.selectionEnd = start;
        }
      }, 10);
    }
  };

  // Find active operation config
  const activeDomainConfig = DOMAIN_DATA[currentDomain];
  const activeOpConfig = activeDomainConfig.operations.find(
    (o) => o.id === currentOperation
  );

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-6 gap-6 text-slate-100">
      {/* Header */}
      <Header latencyMs={latencyMs} />

      {/* Domain Navigation Tabs */}
      <DomainTabs
        currentDomain={currentDomain}
        onSelectDomain={handleDomainChange}
      />

      {/* Main Workspace Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Input, Controls & Keypad */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Operation Selector & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="op-select"
                className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                Operation:
              </label>
              <select
                id="op-select"
                value={currentOperation}
                onChange={(e) => handleOperationChange(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {activeDomainConfig.operations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[340px]">
              <span className="text-[11px] text-slate-500">Presets:</span>
              <div className="flex items-center gap-1">
                {activeDomainConfig.presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-medium whitespace-nowrap transition-colors border border-slate-700/60"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Symbolic Expression Input Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                Symbolic Mathematical Input
              </span>
              <span className="text-xs text-slate-500 font-mono">
                SymPy Engine
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={inputRef}
                rows={2}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    triggerSolve();
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-none"
                placeholder="Enter mathematical function, matrix, or expression..."
              />
            </div>

            {/* Dynamic Parameter Fields */}
            {activeOpConfig && (
              <DynamicParams
                paramTypes={activeOpConfig.params}
                values={params}
                onChange={(key, val) => setParams((prev) => ({ ...prev, [key]: val }))}
              />
            )}

            {/* Live KaTeX Math Preview */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 min-h-[42px] flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                LaTeX Live:
              </span>
              <div
                ref={livePreviewRef}
                className="text-slate-200 text-xs overflow-x-auto"
              />
            </div>

            {/* Virtual Scientific Keypad */}
            <VirtualKeypad
              onInsert={handleKeypadInsert}
              onClear={handleClear}
              onBackspace={handleBackspace}
              onEvaluate={() => triggerSolve()}
              domain={currentDomain}
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                <span>Tip: Press Ctrl+Enter to solve</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => triggerSolve()}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{loading ? 'Evaluating...' : 'Compute Solution'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Calculations History */}
          <HistoryDrawer
            history={history}
            onSelect={(item) => {
              setCurrentDomain(item.domain);
              setCurrentOperation(item.operation);
              setExpression(item.expression);
              triggerSolve(item.operation, item.expression);
            }}
            onClear={() => setHistory([])}
          />
        </div>

        {/* Right Column: Analytical Results, Steps & Visualization */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Solution Output Card */}
          <SolutionCard
            latexInput={solution?.latex_input}
            latexResult={solution?.latex_result}
            numericalApprox={solution?.numerical_approx}
            error={solution?.error}
            loading={loading}
          />

          {/* Interactive Plot Viewer */}
          <PlotViewer plotData={solution?.plot_data} />

          {/* Analytical Step-by-Step Breakdown */}
          <StepBreakdown steps={solution?.steps} />
        </div>
      </main>
    </div>
  );
}

export default App;
