import React, { useState, useEffect } from 'react';
import { KEYPAD_DATA } from '../domainData';
import { Delete, RotateCcw, Equal } from 'lucide-react';

interface VirtualKeypadProps {
  onInsert: (text: string) => void;
  onClear?: () => void;
  onBackspace?: () => void;
  onEvaluate?: () => void;
  domain?: string;
}

type KeypadCategory = 'calculator' | 'basic' | 'calculus' | 'trig' | 'matrix';

export const VirtualKeypad: React.FC<VirtualKeypadProps> = ({
  onInsert,
  onClear,
  onBackspace,
  onEvaluate,
  domain,
}) => {
  const [activeCategory, setActiveCategory] = useState<KeypadCategory>(
    domain === 'calculator' ? 'calculator' : 'basic'
  );

  useEffect(() => {
    if (domain === 'calculator') {
      setActiveCategory('calculator');
    }
  }, [domain]);

  const categories: { id: KeypadCategory; label: string }[] = [
    { id: 'calculator', label: 'Calc' },
    { id: 'basic', label: 'Basic' },
    { id: 'calculus', label: 'Calculus' },
    { id: 'trig', label: 'Trig' },
    { id: 'matrix', label: 'Matrices' },
  ];

  const currentKeys = KEYPAD_DATA[activeCategory] || KEYPAD_DATA.basic;

  return (
    <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            Virtual Keypad
          </span>
          {/* Quick action utility buttons */}
          <div className="flex items-center gap-1">
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                title="All Clear (AC)"
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 flex items-center gap-0.5 transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>AC</span>
              </button>
            )}
            {onBackspace && (
              <button
                type="button"
                onClick={onBackspace}
                title="Backspace"
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/50 flex items-center gap-0.5 transition-colors"
              >
                <Delete className="w-2.5 h-2.5" />
                <span>⌫</span>
              </button>
            )}
            {onEvaluate && (
              <button
                type="button"
                onClick={onEvaluate}
                title="Evaluate (=)"
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-0.5 transition-colors"
              >
                <Equal className="w-2.5 h-2.5" />
                <span>=</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                activeCategory === cat.id
                  ? 'bg-slate-800 text-indigo-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
        {currentKeys.map((k, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(k.insert)}
            className="px-2 py-1.5 rounded bg-slate-800/70 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors border border-slate-700/50 flex items-center justify-center active:scale-95"
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
};
