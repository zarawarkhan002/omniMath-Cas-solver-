/**
 * OmniMath Type Definitions
 */

export type ProblemDomain =
  | 'calculator'
  | 'calculus'
  | 'linear_algebra'
  | 'algebra'
  | 'complex'
  | 'discrete'
  | 'graphing';

export interface MathOperation {
  id: string;
  name: string;
  defaultExpr: string;
  params: string[];
}

export interface PresetProblem {
  label: string;
  op: string;
  expr: string;
  params?: Record<string, any>;
}

export interface DomainConfig {
  name: string;
  description: string;
  operations: MathOperation[];
  presets: PresetProblem[];
}

export interface PlotData {
  type: 'scatter2d' | 'surface3d' | 'parametric2d' | 'complex_plane' | 'bar';
  x?: any[];
  y?: any[];
  z?: any[][];
  t?: number[];
  name?: string;
  title?: string;
  xaxis_title?: string;
  yaxis_title?: string;
  zaxis_title?: string;
  fill_area?: { a: number; b: number };
  points?: Array<{ x: number; y: number; label: string; color: string }>;
  vectors?: Array<{ x: number; y: number; color: string }>;
  circle_radius?: number;
  angle_rad?: number;
  highlight_k?: number;
}

export interface SolveResponse {
  latex_input: string;
  latex_result: string;
  numerical_approx: string;
  steps: string[] | null;
  plot_data: PlotData | null;
  domain: string;
  error: string | null;
}

export interface CalculationHistoryItem {
  id: string;
  timestamp: number;
  domain: ProblemDomain;
  operation: string;
  expression: string;
  latex_result: string;
  error?: string | null;
}
