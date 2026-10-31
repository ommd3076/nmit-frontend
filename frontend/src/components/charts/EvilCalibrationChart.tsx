import React, { useId } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { CalibrationPoint } from '../../types/api';

interface EvilCalibrationChartProps {
  data: CalibrationPoint[];
}

const CalibrationTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as CalibrationPoint;
  return (
    <div className="rounded-lg border border-[#dce6df] bg-white px-3 py-2 shadow-sm text-[13px] text-[#20352b]">
      <p>Predicted late: <strong className="tabular-nums">{(point.predicted_prob * 100).toFixed(1)}%</strong></p>
      <p>Observed late: <strong className="tabular-nums">{(point.observed_freq * 100).toFixed(1)}%</strong></p>
      {point.sample_count != null && <p>Samples: <strong className="tabular-nums">{point.sample_count}</strong></p>}
    </div>
  );
};

const isProbability = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

export const EvilCalibrationChart: React.FC<EvilCalibrationChartProps> = ({ data }) => {
  const chartId = useId().replace(/:/g, '');
  const chartData = data
    .filter((point) => isProbability(point.predicted_prob) && isProbability(point.observed_freq))
    .slice()
    .sort((a, b) => a.predicted_prob - b.predicted_prob);

  if (!chartData.length) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-[#cbd8d0] bg-[#f7f9f7] px-5 text-center">
        <div>
          <p className="text-[13px] font-medium text-[#25392f]">No calibration points supplied</p>
          <p className="mt-1 text-[13px] text-[#596a60]">A held-out evaluation must provide predicted and observed rates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-[#dce6df] bg-[#fbfcfb] p-3" role="img" aria-label="Reliability diagram: predicted late probability compared with observed late frequency. The diagonal indicates perfect calibration.">
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-2 text-[13px] text-[#42574b]">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-[#789080]" />Perfect calibration</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-[#326c50]" />Observed</span>
      </div>
      <div className="h-72 min-h-64 w-full" id={chartId}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 12, left: 4 }}>
            <CartesianGrid stroke="#e2e9e4" vertical={false} />
            <XAxis
              type="number"
              dataKey="predicted_prob"
              domain={[0, 1]}
              tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              tick={{ fill: '#596a60', fontSize: 13 }}
              label={{ value: 'Predicted late probability', position: 'insideBottom', offset: -7, fill: '#42574b', fontSize: 13 }}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              tick={{ fill: '#596a60', fontSize: 13 }}
              width={48}
              label={{ value: 'Observed late frequency', angle: -90, position: 'insideLeft', fill: '#42574b', fontSize: 13 }}
            />
            <Tooltip content={<CalibrationTooltip />} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#789080" strokeDasharray="5 5" strokeWidth={1.5} />
            <Line
              type="linear"
              dataKey="observed_freq"
              stroke="#326c50"
              strokeWidth={2}
              dot={{ r: 4, fill: '#fbfcfb', stroke: '#326c50', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#326c50', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
