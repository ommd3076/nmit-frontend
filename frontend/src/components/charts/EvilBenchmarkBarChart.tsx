import React, { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export interface BenchmarkChartItem {
  solver: string;
  regret_score: number;
  runtime_ms: number;
}

interface EvilBenchmarkBarChartProps {
  data: BenchmarkChartItem[];
}

const MetricTooltip = ({ active, payload, metric }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as BenchmarkChartItem;
  const value = metric === 'regret' ? `${item.regret_score.toFixed(2)}%` : `${item.runtime_ms} ms`;
  return (
    <div className="rounded-lg border border-[#dce6df] bg-white px-3 py-2 shadow-sm text-[13px] text-[#20352b]">
      <p className="font-medium">{item.solver}</p>
      <p className="tabular-nums">{metric === 'regret' ? 'Gap to optimum' : 'Runtime'}: <strong>{value}</strong></p>
    </div>
  );
};

export const EvilBenchmarkBarChart: React.FC<EvilBenchmarkBarChartProps> = ({ data }) => {
  const chartId = useId().replace(/:/g, '');
  const chartData = data.filter((item) =>
    Number.isFinite(item.regret_score) && Number.isFinite(item.runtime_ms)
  );

  if (!chartData.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[#cbd8d0] bg-[#f7f9f7] px-5 text-center">
        <div>
          <p className="text-[13px] font-medium text-[#25392f]">No benchmark results supplied</p>
          <p className="mt-1 text-[13px] text-[#596a60]">A comparison needs recorded solver results on the same evaluation set.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="group" aria-label="Solver benchmark charts">
      <section className="min-w-0 rounded-xl border border-[#dce6df] bg-[#fbfcfb] p-3">
        <h4 className="px-2 text-[13px] font-medium text-[#25392f]">Gap to optimum (%)</h4>
        <p className="px-2 pt-1 text-[13px] text-[#596a60]">Lower is better. No speed-up claimed.</p>
        <div className="mt-2 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id={`${chartId}-regret`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#326c50" stopOpacity={0.92} />
                  <stop offset="100%" stopColor="#7c9b83" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e9e4" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#596a60', fontSize: 13 }} tickFormatter={(value: number) => `${value}%`} />
              <YAxis type="category" dataKey="solver" width={124} tick={{ fill: '#42574b', fontSize: 13 }} />
              <Tooltip content={<MetricTooltip metric="regret" />} />
              <Bar dataKey="regret_score" fill={`url(#${chartId}-regret)`} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-[#dce6df] bg-[#fbfcfb] p-3">
        <h4 className="px-2 text-[13px] font-medium text-[#25392f]">Runtime (ms)</h4>
        <p className="px-2 pt-1 text-[13px] text-[#596a60]">Measured wall time from the run record.</p>
        <div className="mt-2 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id={`${chartId}-runtime`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#667f6e" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a7b6a7" stopOpacity={0.74} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e9e4" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#596a60', fontSize: 13 }} tickFormatter={(value: number) => `${value}`} />
              <YAxis type="category" dataKey="solver" width={124} tick={{ fill: '#42574b', fontSize: 13 }} />
              <Tooltip content={<MetricTooltip metric="runtime" />} />
              <Bar dataKey="runtime_ms" fill={`url(#${chartId}-runtime)`} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
