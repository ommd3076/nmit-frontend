import React, { useState } from 'react';
import { PlanRun, Stop } from '../../types/api';
import { DataBadge } from '../../components/ui/DataBadge';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  Clock,
  DollarSign,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

interface SlaRiskViewProps {
  plan: PlanRun;
}

export const SlaRiskView: React.FC<SlaRiskViewProps> = ({ plan }) => {
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');

  // Extract all stops and filter at-risk ones
  const allStops = plan.routes.flatMap((r) => r.stops);
  const atRiskStops = allStops.filter(
    (s) => !s.is_completed && ((s.predicted_late_prob_max || 0) > 0.25 || s.status === 'at_risk')
  );

  const displayedStops =
    selectedRouteFilter === 'all'
      ? atRiskStops
      : atRiskStops.filter((s) => s.route_id === selectedRouteFilter);

  // Group financial exposure by route
  const routeExposure = plan.routes.map((route) => {
    const v = plan.vehicles.find((veh) => veh.id === route.vehicle_id);
    const exposureInr = route.stops.reduce((acc, s) => acc + s.penalty_exposure_inr, 0);
    const atRiskCount = route.stops.filter((s) => !s.is_completed && (s.predicted_late_prob_max || 0) > 0.25).length;

    return {
      routeId: route.id,
      callsign: v?.callsign || route.id,
      driverName: v?.driver_name || 'Driver',
      color: route.color_token,
      exposureInr,
      atRiskCount,
      totalStops: route.stops.length
    };
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 select-none text-xs">
      {/* Top Exposure Summary Header */}
      <div className="glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-black/5 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#C6534C]" />
              <h2 className="text-lg font-extrabold text-[#15211D] tracking-tight">
                SLA Violation Risk & Contractual Exposure
              </h2>
            </div>
            <p className="text-xs text-[#68756F] mt-1">
              Probabilistic late distributions derived from VQC and Platt calibration models
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <DataBadge badge="Simulated · held-out run" size="md" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-[#929E99]">Total Financial Exposure</div>
              <div className="text-xl font-black text-[#C6534C] tabular-nums">
                ₹{plan.total_sla_exposure_inr.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-[#68756F] ml-1.5">
                  ({plan.assumed_rate_label})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Route Exposure Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {routeExposure.map((re) => (
            <div
              key={re.routeId}
              onClick={() => setSelectedRouteFilter(selectedRouteFilter === re.routeId ? 'all' : re.routeId)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedRouteFilter === re.routeId
                  ? 'bg-[#17231F] text-white border-transparent shadow-sm'
                  : 'bg-white/80 border-black/5 text-[#15211D] hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: re.color }} />
                  <span className="font-extrabold text-xs">{re.callsign}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  re.atRiskCount > 0 ? 'bg-[#FBECEB] text-[#C6534C]' : 'bg-[#E2F4EE] text-[#205A46]'
                }`}>
                  {re.atRiskCount} At Risk
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between tabular-nums">
                <span className="text-[11px] opacity-70">Penalty Exposure:</span>
                <span className="font-extrabold text-sm">₹{re.exposureInr.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* At-Risk Service Commitments Table */}
      <div className="flex-1 glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <div className="font-extrabold text-sm text-[#15211D]">
            At-Risk Customer Delivery Commitments ({displayedStops.length})
          </div>
          <span className="text-[#68756F] text-[11px]">
            Filtering by: {selectedRouteFilter === 'all' ? 'All Active Routes' : selectedRouteFilter}
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/5 text-[#929E99] text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-2.5 font-bold">Stop & Customer</th>
                <th className="pb-2.5 font-bold">Assigned Van</th>
                <th className="pb-2.5 font-bold">Commitment Window</th>
                <th className="pb-2.5 font-bold">Predicted ETA (simulated)</th>
                <th className="pb-2.5 font-bold">P(late) Interval</th>
                <th className="pb-2.5 font-bold">Penalty Exposure (₹83/$)</th>
                <th className="pb-2.5 font-bold">Operational Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {displayedStops.map((stop) => {
                const v = plan.vehicles.find((veh) => veh.id === stop.vehicle_id);

                return (
                  <tr key={stop.id} className="hover:bg-white/80 transition-colors">
                    {/* Customer */}
                    <td className="py-3 pr-3">
                      <div className="font-bold text-[#15211D]">{stop.customer_name}</div>
                      <div className="text-[11px] text-[#68756F] truncate max-w-[200px]">{stop.address}</div>
                    </td>

                    {/* Van */}
                    <td className="py-3 pr-3 font-semibold text-[#15211D]">
                      {v?.callsign}
                    </td>

                    {/* Window */}
                    <td className="py-3 pr-3 tabular-nums font-medium text-[#15211D]">
                      {stop.window_start} – {stop.window_end}
                    </td>

                    {/* Predicted ETA */}
                    <td className="py-3 pr-3 tabular-nums font-bold text-[#2F5BEA]">
                      {stop.eta_min} – {stop.eta_max}
                    </td>

                    {/* P(late) */}
                    <td className="py-3 pr-3 tabular-nums font-extrabold text-[#C6534C]">
                      [{Math.round(stop.predicted_late_prob_min * 100)}%, {Math.round(stop.predicted_late_prob_max * 100)}%]
                    </td>

                    {/* Penalty */}
                    <td className="py-3 pr-3 tabular-nums font-black text-[#C6534C]">
                      ₹{stop.penalty_exposure_inr.toLocaleString('en-IN')}
                    </td>

                    {/* Operational Notes */}
                    <td className="py-3 pr-3 text-[11px] text-[#68756F]">
                      {stop.notes || 'Normal delivery window'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
