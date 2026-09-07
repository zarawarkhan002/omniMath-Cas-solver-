import React from 'react';
import { CalculationHistoryItem } from '../types';
import { History, Trash2, ArrowRight } from 'lucide-react';

interface HistoryDrawerProps {
  history: CalculationHistoryItem[];
  onSelect: (item: CalculationHistoryItem) => void;
  onClear: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onSelect,
  onClear,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Recent Calculations ({history.length})
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
          title="Clear History"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {history.slice(0, 10).map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 text-left bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 w-48 transition-all group"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
              <span className="text-indigo-400 uppercase">{item.operation}</span>
              <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="text-xs text-slate-200 font-mono truncate font-medium">
              {item.expression || item.operation}
            </div>
            {item.latex_result && (
              <div className="text-[11px] text-indigo-300 font-mono truncate mt-0.5 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                <ArrowRight className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                <span className="truncate">{item.latex_result}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
