import React, { useState } from 'react';
import { PlanRun } from '../../types/api';
import { DataBadge } from '../../components/ui/DataBadge';
import {
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface SlaRiskViewProps {
  plan: PlanRun;
  onInspectStop?: (stopId: string, vehicleId: string) => void;
}

export const SlaRiskView: React.FC<SlaRiskViewProps> = ({ plan, onInspectStop }) => {
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
      vehicleId: route.vehicle_id,
      callsign: v?.callsign || route.id,
      color: route.color_token,
      exposureInr,
      atRiskCount,
      totalStops: route.stops.length
    };
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 select-none text-xs">
      {/* Top Exposure Summary Header */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#EAE6DF] gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
              <h2 className="text-xl font-extrabold text-[#141F1A] tracking-tight">
                SLA Violation Risk & Contractual Exposure
              </h2>
            </div>
            <p className="text-xs text-[#7D8D85] mt-1">
              Probabilistic late distributions derived from VQC and Platt calibration models
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <DataBadge badge="Simulated · held-out run" size="md" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-[#7D8D85]">Total Financial Exposure</div>
              <div className="text-2xl font-black text-[#DC2626] tabular-nums mt-0.5">
                ₹{plan.total_sla_exposure_inr.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-[#7D8D85] ml-1.5">
                  ({plan.assumed_rate_label})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution Segmented Bar (Fieldnotes & RouteIQ style) */}
        <div className="mt-4 p-4 bg-[#F5F3ED]/60 border border-[#E5E0D8] rounded-2xl">
          <div className="flex justify-between items-center text-[10px] uppercase font-mono text-[#7D8D85] mb-2 font-bold">
            <span>Commitment Risk Exposure Spectrum</span>
            <span>{displayedStops.length} Monitored Stops</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#E5E0D8] overflow-hidden flex">
            <div className="h-full bg-[#1E5A44]" style={{ width: '74%' }} title="On-Schedule: 74%" />
            <div className="h-full bg-[#D97706]" style={{ width: '16%' }} title="Window Risk: 16%" />
            <div className="h-full bg-[#DC2626]" style={{ width: '10%' }} title="Critical Violation Risk: 10%" />
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#7D8D85] mt-2.5 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1E5A44]" /> Within SLA (&lt;15% P_late)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D97706]" /> Impending Risk (15–40% P_late)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#DC2626]" /> High Penalty Risk (&gt;40% P_late)</span>
          </div>
        </div>

        {/* Route Exposure Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {routeExposure.map((re) => (
            <div
              key={re.routeId}
              onClick={() => setSelectedRouteFilter(selectedRouteFilter === re.routeId ? 'all' : re.routeId)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedRouteFilter === re.routeId
                  ? 'bg-[#141F1A] text-white border-transparent shadow-xs'
                  : 'bg-[#F5F3ED]/70 border-[#E5E0D8] text-[#141F1A] hover:bg-[#F5F3ED]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: re.color }} />
                  <span className="font-extrabold text-xs">{re.callsign}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  re.atRiskCount > 0 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#E8F5EE] text-[#1E5A44]'
                }`}>
                  {re.atRiskCount} At Risk
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between tabular-nums">
                <span className="text-[11px] opacity-70">Penalty Exposure:</span>
                <span className="font-extrabold text-sm">₹{re.exposureInr.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* At-Risk Service Commitments Table */}
      <div className="flex-1 bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
          <div className="font-extrabold text-sm text-[#141F1A]">
            At-Risk Customer Delivery Commitments ({displayedStops.length})
          </div>
          <span className="text-[#7D8D85] text-[11px]">
            Filtering by: {selectedRouteFilter === 'all' ? 'All Active Routes' : selectedRouteFilter}
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DF] text-[#7D8D85] text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 font-bold">Stop & Customer</th>
                <th className="pb-3 font-bold">Assigned Van</th>
                <th className="pb-3 font-bold">Commitment Window</th>
                <th className="pb-3 font-bold">Predicted ETA (simulated)</th>
                <th className="pb-3 font-bold">P(late) Interval</th>
                <th className="pb-3 font-bold">Penalty Exposure (₹83/$)</th>
                <th className="pb-3 font-bold">Operational Context</th>
                <th className="pb-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {displayedStops.map((stop) => {
                const v = plan.vehicles.find((veh) => veh.id === stop.vehicle_id);

                return (
                  <tr
                    key={stop.id}
                    className="hover:bg-[#F5F3ED]/40 transition-colors cursor-pointer"
                    onClick={() => {
                      if (onInspectStop) onInspectStop(stop.id, stop.vehicle_id);
                    }}
                  >
                    {/* Customer */}
                    <td className="py-4 pr-3">
                      <div className="font-bold text-[#141F1A]">{stop.customer_name}</div>
                      <div className="text-[11px] text-[#7D8D85] truncate max-w-[200px]">{stop.address}</div>
                    </td>

                    {/* Van */}
                    <td className="py-4 pr-3 font-semibold text-[#141F1A]">
                      {v?.callsign}
                    </td>

                    {/* Window */}
                    <td className="py-4 pr-3 tabular-nums font-medium text-[#141F1A]">
                      {stop.window_start} – {stop.window_end}
                    </td>

                    {/* Predicted ETA */}
                    <td className="py-4 pr-3 tabular-nums font-bold text-[#2563EB]">
                      {stop.eta_min} – {stop.eta_max}
                    </td>

                    {/* P(late) */}
                    <td className="py-4 pr-3 tabular-nums font-extrabold text-[#DC2626]">
                      [{Math.round(stop.predicted_late_prob_min * 100)}%, {Math.round(stop.predicted_late_prob_max * 100)}%]
                    </td>

                    {/* Penalty */}
                    <td className="py-4 pr-3 tabular-nums font-black text-[#DC2626]">
                      ₹{stop.penalty_exposure_inr.toLocaleString('en-IN')}
                    </td>

                    {/* Operational Notes */}
                    <td className="py-4 pr-3 text-[11px] text-[#7D8D85]">
                      {stop.notes || 'Normal delivery window'}
                    </td>

                    {/* Inspect CTA */}
                    <td className="py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onInspectStop) onInspectStop(stop.id, stop.vehicle_id);
                        }}
                        className="px-3 py-1.5 bg-[#141F1A] hover:bg-[#1E5A44] text-white rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
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
