import React from 'react';

interface DynamicParamsProps {
  paramTypes: string[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export const DynamicParams: React.FC<DynamicParamsProps> = ({
  paramTypes,
  values,
  onChange,
}) => {
  if (!paramTypes || paramTypes.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/60 mt-1">
      {paramTypes.includes('variable') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Variable (with respect to)
          </label>
          <input
            type="text"
            value={values.variable || 'x'}
            onChange={(e) => onChange('variable', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('variable2') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Secondary Variable (dy)
          </label>
          <input
            type="text"
            value={values.variable2 || 'y'}
            onChange={(e) => onChange('variable2', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('order') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Derivative / Series Order (n)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={values.order || 1}
            onChange={(e) => onChange('order', parseInt(e.target.value, 10) || 1)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('bounds') && (
        <>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Lower Bound (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 0"
              value={values.lower_bound || ''}
              onChange={(e) => onChange('lower_bound', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Upper Bound (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 3 or pi"
              value={values.upper_bound || ''}
              onChange={(e) => onChange('upper_bound', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </>
      )}

      {paramTypes.includes('point') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Evaluation Point (x₀)
          </label>
          <input
            type="text"
            value={values.point || '0'}
            onChange={(e) => onChange('point', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('matrix_b') && (
        <div className="col-span-2">
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Matrix B (Right Operand)
          </label>
          <input
            type="text"
            value={values.matrix_b || '[[1, 0], [0, 1]]'}
            onChange={(e) => onChange('matrix_b', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('vector_b') && (
        <div className="col-span-2">
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Vector B (Target Column)
          </label>
          <input
            type="text"
            value={values.vector_b || '[[18], [16]]'}
            onChange={(e) => onChange('vector_b', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('nth_roots') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Root Degree (n)
          </label>
          <input
            type="number"
            min={2}
            max={12}
            value={values.n || 3}
            onChange={(e) => onChange('n', parseInt(e.target.value, 10) || 3)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('n_k') && (
        <>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Total Elements (n)
            </label>
            <input
              type="number"
              min={0}
              value={values.n !== undefined ? values.n : 10}
              onChange={(e) => onChange('n', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Subset Size (k)
            </label>
            <input
              type="number"
              min={0}
              value={values.k !== undefined ? values.k : 3}
              onChange={(e) => onChange('k', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </>
      )}

      {paramTypes.includes('a_m') && (
        <>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Base Integer (a)
            </label>
            <input
              type="number"
              value={values.a !== undefined ? values.a : 7}
              onChange={(e) => onChange('a', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Modulus (m)
            </label>
            <input
              type="number"
              min={2}
              value={values.m !== undefined ? values.m : 26}
              onChange={(e) => onChange('m', parseInt(e.target.value, 10) || 2)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </>
      )}

      {paramTypes.includes('binomial_params') && (
        <>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Number of Trials (n)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={values.n !== undefined ? values.n : 20}
              onChange={(e) => onChange('n', parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Success Probability (p)
            </label>
            <input
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={values.p !== undefined ? values.p : 0.5}
              onChange={(e) => onChange('p', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Success Target (k)
            </label>
            <input
              type="number"
              min={0}
              value={values.k !== undefined ? values.k : 10}
              onChange={(e) => onChange('k', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </>
      )}

      {paramTypes.includes('parametric_y') && (
        <div className="col-span-2">
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Parametric Function y(t)
          </label>
          <input
            type="text"
            value={values.y_expr || 'cos(2*t)'}
            onChange={(e) => onChange('y_expr', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {paramTypes.includes('angle_mode') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Angle Mode (Trig)
          </label>
          <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => onChange('angle_mode', 'deg')}
              className={`flex-1 text-xs py-1 rounded font-medium transition-colors ${
                (values.angle_mode || 'deg') === 'deg'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Degrees (°)
            </button>
            <button
              type="button"
              onClick={() => onChange('angle_mode', 'rad')}
              className={`flex-1 text-xs py-1 rounded font-medium transition-colors ${
                values.angle_mode === 'rad'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Radians (rad)
            </button>
          </div>
        </div>
      )}

      {paramTypes.includes('precision') && (
        <div>
          <label className="block text-[11px] text-slate-400 font-medium mb-1">
            Decimal Precision
          </label>
          <select
            value={values.precision || 6}
            onChange={(e) => onChange('precision', parseInt(e.target.value, 10))}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value={2}>2 Decimals (Currency / Standard)</option>
            <option value={4}>4 Decimals</option>
            <option value={6}>6 Decimals (Scientific)</option>
            <option value={10}>10 Decimals (High Precision)</option>
            <option value={16}>16 Decimals (Arbitrary mpmath)</option>
          </select>
        </div>
      )}
    </div>
  );
};
