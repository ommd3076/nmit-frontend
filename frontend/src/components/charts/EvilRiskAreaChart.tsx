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

export interface RouteRiskItem {
  name: string;
  exposureInr: number;
  atRiskCount: number;
  totalStops: number;
  color: string;
}

interface EvilRiskAreaChartProps {
  data: RouteRiskItem[];
}

const RouteTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as RouteRiskItem;
  return (
    <div className="rounded-lg border border-[#dce6df] bg-white px-3 py-2 shadow-sm text-[13px] text-[#20352b]">
      <p className="font-medium">{item.name}</p>
      <p className="tabular-nums">Exposure: <strong>₹{item.exposureInr.toLocaleString('en-IN')}</strong></p>
      <p className="tabular-nums">At-risk stops: <strong>{item.atRiskCount} of {item.totalStops}</strong></p>
    </div>
  );
};

export const EvilRiskAreaChart: React.FC<EvilRiskAreaChartProps> = ({ data }) => {
  const chartId = useId().replace(/:/g, '');
  const chartData = data.filter((item) =>
    Number.isFinite(item.exposureInr) && Number.isFinite(item.atRiskCount) && Number.isFinite(item.totalStops)
  );

  if (!chartData.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[#cbd8d0] bg-[#f7f9f7] px-5 text-center">
        <div>
          <p className="text-[13px] font-medium text-[#25392f]">No route exposure data supplied</p>
          <p className="mt-1 text-[13px] text-[#596a60]">A validated plan with route-level exposure is needed for this breakdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-[#dce6df] bg-[#fbfcfb] p-3" role="img" aria-label="Route-level contractual exposure by route. Bar length shows the supplied exposure amount in rupees.">
      <div className="mb-2 flex items-center gap-2 px-2 text-[13px] text-[#42574b]">
        <span className="h-2.5 w-2.5 rounded-sm bg-[#326c50]" aria-hidden="true" />
        <span>Exposure by route (₹, assumed rate)</span>
      </div>
      <div className="min-h-48 w-full" style={{ height: Math.max(192, Math.min(chartData.length * 48 + 24, 480)) }} id={chartId}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id={`${chartId}-exposure`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#326c50" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#7c9b83" stopOpacity={0.72} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e9e4" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#596a60', fontSize: 13 }} tickFormatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
            <YAxis type="category" dataKey="name" width={104} tick={{ fill: '#42574b', fontSize: 13 }} />
            <Tooltip content={<RouteTooltip />} />
            <Bar dataKey="exposureInr" fill={`url(#${chartId}-exposure)`} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
