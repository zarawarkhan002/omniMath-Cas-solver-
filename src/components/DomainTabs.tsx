import React from 'react';
import { ProblemDomain } from '../types';
import { DOMAIN_DATA } from '../domainData';
import {
  Calculator,
  Sigma,
  Grid,
  Divide,
  Compass,
  BarChart3,
  LineChart,
} from 'lucide-react';

interface DomainTabsProps {
  currentDomain: ProblemDomain;
  onSelectDomain: (domain: ProblemDomain) => void;
}

const DOMAIN_ICONS: Record<ProblemDomain, React.ElementType> = {
  calculator: Calculator,
  calculus: Sigma,
  linear_algebra: Grid,
  algebra: Divide,
  complex: Compass,
  discrete: BarChart3,
  graphing: LineChart,
};

export const DomainTabs: React.FC<DomainTabsProps> = ({
  currentDomain,
  onSelectDomain,
}) => {
  const domains: ProblemDomain[] = [
    'calculator',
    'calculus',
    'linear_algebra',
    'algebra',
    'complex',
    'discrete',
    'graphing',
  ];

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80 scrollbar-none">
      {domains.map((domain) => {
        const Icon = DOMAIN_ICONS[domain];
        const isActive = currentDomain === domain;
        return (
          <button
            key={domain}
            onClick={() => onSelectDomain(domain)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{DOMAIN_DATA[domain].name}</span>
          </button>
        );
      })}
    </nav>
  );
};
