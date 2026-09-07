import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { Copy, Check, AlertTriangle, Sparkles } from 'lucide-react';

interface SolutionCardProps {
  latexInput?: string;
  latexResult?: string;
  numericalApprox?: string;
  error?: string | null;
  loading?: boolean;
}

export const SolutionCard: React.FC<SolutionCardProps> = ({
  latexInput,
  latexResult,
  numericalApprox,
  error,
  loading,
}) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (resultRef.current && latexResult && !error) {
      try {
        katex.render(latexResult, resultRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        resultRef.current.innerText = latexResult;
      }
    }
  }, [latexResult, error]);

  const handleCopy = () => {
    if (!latexResult) return;
    navigator.clipboard.writeText(latexResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Analytical Solution
          </span>
        </div>
        {latexResult && !error && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy LaTeX</span>
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-6 min-h-[100px] flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-mono">
            Evaluating symbolic tree...
          </span>
        </div>
      ) : error ? (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-lg p-4 flex items-start gap-3 text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold font-mono tracking-wide uppercase text-rose-400">
              Evaluation Error
            </span>
            <p className="text-xs font-mono break-all leading-relaxed text-rose-200">
              {error}
            </p>
          </div>
        </div>
      ) : latexResult ? (
        <div className="flex flex-col gap-3">
          <div
            ref={resultRef}
            className="bg-slate-950 border border-slate-800 rounded-lg p-4 min-h-[90px] flex items-center justify-center overflow-x-auto text-lg text-indigo-200"
          />

          {numericalApprox && (
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-xs">
              <span className="text-slate-400 font-mono">
                Numerical Approximation:
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {numericalApprox}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 min-h-[90px] flex items-center justify-center text-slate-500 text-xs">
          Select an operation, enter an expression, and click Compute Solution
        </div>
      )}
    </div>
  );
};
