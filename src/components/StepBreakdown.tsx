import React from 'react';
import katex from 'katex';
import { ListOrdered } from 'lucide-react';

interface StepBreakdownProps {
  steps?: string[] | null;
}

export const StepBreakdown: React.FC<StepBreakdownProps> = ({ steps }) => {
  const formatStepMath = (text: string) => {
    // Replace $$...$$ with block KaTeX and $...$ with inline KaTeX
    let rendered = text.replace(/\$\$(.+?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch {
        return `$$${math}$$`;
      }
    });

    rendered = rendered.replace(/\$(.+?)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch {
        return `$${math}$`;
      }
    });

    return rendered;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Step-by-Step Analytical Breakdown
          </span>
        </div>
        <span className="text-xs text-indigo-400 font-mono">
          {steps && steps.length > 0 ? `${steps.length} steps` : '0 steps'}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 text-sm text-slate-300">
        {steps && steps.length > 0 ? (
          steps.map((step, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 flex flex-col gap-1"
            >
              <div
                dangerouslySetInnerHTML={{ __html: formatStepMath(step) }}
                className="leading-relaxed overflow-x-auto"
              />
            </div>
          ))
        ) : (
          <p className="text-slate-500 text-xs italic py-2">
            Intermediate analytical deduction steps will appear here when applicable.
          </p>
        )}
      </div>
    </div>
  );
};
