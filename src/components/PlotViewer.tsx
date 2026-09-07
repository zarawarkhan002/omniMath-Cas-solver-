import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { PlotData } from '../types';
import { LineChart, Maximize2 } from 'lucide-react';

interface PlotViewerProps {
  plotData?: PlotData | null;
}

export const PlotViewer: React.FC<PlotViewerProps> = ({ plotData }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!plotData) {
      containerRef.current.innerHTML = `
        <div class="flex items-center justify-center h-full text-slate-500 text-xs text-center p-6">
          Interactive 2D/3D visualizations will render automatically upon computation
        </div>`;
      return;
    }

    const darkLayout: any = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#94a3b8', family: 'monospace', size: 11 },
      margin: { l: 45, r: 25, t: 30, b: 40 },
      xaxis: { gridcolor: '#1e293b', zerolinecolor: '#475569' },
      yaxis: { gridcolor: '#1e293b', zerolinecolor: '#475569' },
      autosize: true,
    };

    if (plotData.type === 'scatter2d' && plotData.x && plotData.y) {
      const traces: any[] = [
        {
          x: plotData.x,
          y: plotData.y,
          mode: 'lines',
          name: plotData.name || 'f(x)',
          line: { color: '#6366f1', width: 2.5 },
        },
      ];

      if (plotData.fill_area) {
        const { a, b } = plotData.fill_area;
        const fillX: number[] = [];
        const fillY: number[] = [];
        for (let i = 0; i < plotData.x.length; i++) {
          const xi = plotData.x[i];
          if (xi >= a && xi <= b) {
            fillX.push(xi);
            fillY.push(plotData.y[i]);
          }
        }
        if (fillX.length > 0) {
          traces.push({
            x: fillX,
            y: fillY,
            fill: 'tozeroy',
            fillcolor: 'rgba(99, 102, 241, 0.25)',
            mode: 'none',
            name: `Area [${a}, ${b}]`,
          });
        }
      }

      Plotly.newPlot(containerRef.current, traces, darkLayout, {
        responsive: true,
        displayModeBar: false,
      });
    } else if (plotData.type === 'surface3d' && plotData.z) {
      const trace: any = {
        z: plotData.z,
        x: plotData.x,
        y: plotData.y,
        type: 'surface',
        colorscale: 'Viridis',
        contours: {
          z: { show: true, usecolormap: true, highlightcolor: '#fff', project: { z: true } },
        },
      };

      const layout3d: any = {
        ...darkLayout,
        margin: { l: 0, r: 0, t: 0, b: 0 },
        scene: {
          xaxis: { title: plotData.xaxis_title || 'x', gridcolor: '#334155' },
          yaxis: { title: plotData.yaxis_title || 'y', gridcolor: '#334155' },
          zaxis: { title: plotData.zaxis_title || 'z', gridcolor: '#334155' },
          camera: { eye: { x: 1.4, y: 1.4, z: 1.2 } },
        },
      };

      Plotly.newPlot(containerRef.current, [trace], layout3d, { responsive: true });
    } else if (plotData.type === 'parametric2d' && plotData.x && plotData.y) {
      const trace = {
        x: plotData.x,
        y: plotData.y,
        mode: 'lines',
        line: { color: '#ec4899', width: 2.5 },
        name: 'Trajectory',
      };
      Plotly.newPlot(containerRef.current, [trace], darkLayout, {
        responsive: true,
        displayModeBar: false,
      });
    } else if (plotData.type === 'complex_plane') {
      const traces: any[] = [];
      if (plotData.circle_radius) {
        const circleX: number[] = [];
        const circleY: number[] = [];
        for (let i = 0; i <= 100; i++) {
          const th = (2 * Math.PI * i) / 100;
          circleX.push(plotData.circle_radius * Math.cos(th));
          circleY.push(plotData.circle_radius * Math.sin(th));
        }
        traces.push({
          x: circleX,
          y: circleY,
          mode: 'lines',
          line: { color: '#334155', dash: 'dash', width: 1 },
          name: `|z| = ${plotData.circle_radius.toFixed(2)}`,
        });
      }

      (plotData.vectors || []).forEach((vec, idx) => {
        traces.push({
          x: [0, vec.x],
          y: [0, vec.y],
          mode: 'lines+markers',
          line: { color: vec.color || '#6366f1', width: 2 },
          name: `Vector ${idx + 1}`,
        });
      });

      const complexLayout = {
        ...darkLayout,
        xaxis: { title: 'Real Axis (Re)', gridcolor: '#1e293b', zerolinecolor: '#475569' },
        yaxis: {
          title: 'Imaginary Axis (Im)',
          scaleanchor: 'x',
          scaleratio: 1,
          gridcolor: '#1e293b',
          zerolinecolor: '#475569',
        },
      };

      Plotly.newPlot(containerRef.current, traces, complexLayout, {
        responsive: true,
        displayModeBar: false,
      });
    } else if (plotData.type === 'bar' && plotData.x && plotData.y) {
      const trace: any = {
        x: plotData.x,
        y: plotData.y,
        type: 'bar',
        marker: { color: '#6366f1' },
      };
      Plotly.newPlot(containerRef.current, [trace], darkLayout, {
        responsive: true,
        displayModeBar: false,
      });
    }
  }, [plotData]);

  const getBadgeTitle = () => {
    if (!plotData) return 'Plotly 2D/3D';
    switch (plotData.type) {
      case 'scatter2d':
        return '2D Function Curve';
      case 'surface3d':
        return '3D Surface Mesh';
      case 'parametric2d':
        return 'Parametric Trajectory';
      case 'complex_plane':
        return 'Argand Complex Plane';
      case 'bar':
        return 'Distribution';
      default:
        return 'Visualization';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl min-h-[320px]">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <LineChart className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Interactive Visualization
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">
          {getBadgeTitle()}
        </span>
      </div>

      <div
        ref={containerRef}
        className="w-full h-64 sm:h-72 rounded-lg overflow-hidden flex items-center justify-center"
      />
    </div>
  );
};
