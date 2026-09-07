import React from 'react';
import { ShieldCheck, Cpu, Activity, Clock } from 'lucide-react';

interface HeaderProps {
  latencyMs?: number;
}

export const Header: React.FC<HeaderProps> = ({ latencyMs }) => {
  return (
    <header className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
          Ω
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              OmniMath
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-mono border border-indigo-500/30">
              CAS v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Computer Algebra System & Symbolic Numerical Solver
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>SymPy • NumPy • SciPy • mpmath</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sandbox Active (5s Max)</span>
        </div>

        {latencyMs !== undefined && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-indigo-300 font-semibold">{latencyMs} ms</span>
          </div>
        )}
      </div>
    </header>
  );
};
