import React, { useState } from 'react';
import { PlanRun, Stop } from '../../types/api';
import { RouteMap } from '../../components/map/RouteMap';
import { StopDrawer } from '../../components/stops/StopDrawer';
import { DataBadge } from '../../components/ui/DataBadge';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Layers,
  ChevronRight,
  TrendingDown,
  Lock
} from 'lucide-react';

interface CommandCenterViewProps {
  plan: PlanRun;
  onPlanUpdate?: (updated: PlanRun) => void;
  onTriggerReplan: (stopId: string, vehicleId: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  plan,
  onPlanUpdate,
  onTriggerReplan
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    plan.vehicles[0]?.id || null
  );
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Active vehicle and route
  const activeVehicle = plan.vehicles.find((v) => v.id === selectedVehicleId) || plan.vehicles[0];
  const activeRoute = plan.routes.find((r) => r.vehicle_id === activeVehicle?.id);
  const selectedStop = activeRoute?.stops.find((s) => s.id === selectedStopId) || null;

  // Key operational totals
  const totalStops = plan.total_stops;
  const completedStops = plan.completed_stops;
  const progressPct = Math.round((completedStops / totalStops) * 100);
  const delayedVehiclesCount = plan.vehicles.filter((v) => v.status === 'delayed' || v.status === 'at_risk').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Top Operational Metrics Bar */}
      <div className="px-6 py-3 border-b border-black/5 bg-white/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-base font-extrabold text-[#15211D] tracking-tight">
              {plan.scenario_name}
            </h1>
            <div className="flex items-center space-x-2 mt-0.5 text-xs text-[#68756F]">
              <DataBadge badge={plan.provenance_badge} size="sm" />
              <span>·</span>
              <span className="tabular-nums font-medium">Created: {plan.created_at.split('T')[1].slice(0, 5)} IST</span>
              <span>·</span>
              <span className="flex items-center text-[#205A46] font-medium gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                validator.py Passed
              </span>
            </div>
          </div>
        </div>

        {/* High-level KPI Summary Chips */}
        <div className="flex items-center space-x-3">
          {/* Active Fleet */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 text-xs">
            <Truck className="w-4 h-4 text-[#205A46]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#929E99]">Fleet In-Field</div>
              <div className="font-extrabold text-[#15211D] tabular-nums">
                {plan.vehicles.length} Units Active
              </div>
            </div>
          </div>

          {/* Stops Progress */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#2F5BEA]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#929E99]">Completion</div>
              <div className="font-extrabold text-[#15211D] tabular-nums">
                {completedStops}/{totalStops} ({progressPct}%)
              </div>
            </div>
          </div>

          {/* SLA Financial Exposure */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 text-xs">
            <TrendingDown className="w-4 h-4 text-[#C6534C]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#929E99]">SLA Exposure</div>
              <div className="font-extrabold text-[#C6534C] tabular-nums">
                ₹{plan.total_sla_exposure_inr.toLocaleString('en-IN')}
                <span className="text-[9px] font-normal text-[#68756F] ml-1">
                  ({plan.assumed_rate_label.split(' ')[2]})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Command Surface: Hero Map (Left/Center) + Operations Rail (Right) */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Geospatial Map Canvas */}
        <div className="flex-1 relative flex flex-col h-full rounded-3xl overflow-hidden shadow-sm border border-black/5">
          <RouteMap
            plan={plan}
            selectedVehicleId={selectedVehicleId}
            selectedStopId={selectedStopId}
            onSelectVehicle={(vId) => {
              setSelectedVehicleId(vId);
              setSelectedStopId(null);
            }}
            onSelectStop={(sId) => setSelectedStopId(sId)}
            className="flex-1 w-full h-full"
          />
        </div>

        {/* Right Operations Panel */}
        <div className="w-96 flex flex-col gap-3 shrink-0 h-full overflow-hidden">
          {/* Selected Stop Drawer if active */}
          {selectedStop ? (
            <StopDrawer
              stop={selectedStop}
              vehicle={activeVehicle}
              onClose={() => setSelectedStopId(null)}
              onTriggerReplan={onTriggerReplan}
            />
          ) : (
            /* Selected Vehicle Itinerary & Ordered Stops */
            <div className="flex-1 glass-panel-strong rounded-3xl p-4 flex flex-col overflow-hidden border border-white/70 shadow-lg text-xs">
              {/* Vehicle Header Card */}
              <div className="pb-3 border-b border-black/5 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-[#15211D]">
                      {activeVehicle.callsign}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeVehicle.status === 'active'
                          ? 'bg-[#E2F4EE] text-[#205A46]'
                          : activeVehicle.status === 'at_risk'
                          ? 'bg-[#FDF4EB] text-[#D78A45]'
                          : 'bg-[#FBECEB] text-[#C6534C]'
                      }`}
                    >
                      {activeVehicle.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#68756F] mt-0.5">
                    {activeVehicle.driver_name} · {activeVehicle.vehicle_type}
                  </div>
                </div>

                {/* Battery / Fuel & Capacity */}
                <div className="text-right">
                  <div className="font-extrabold text-xs text-[#205A46] tabular-nums">
                    {activeVehicle.battery_or_fuel_pct}% Batt
                  </div>
                  <div className="text-[10px] text-[#929E99] tabular-nums">
                    {activeVehicle.used_capacity_kg}/{activeVehicle.capacity_kg} kg
                  </div>
                </div>
              </div>

              {/* Stop Sequence Timeline Header */}
              <div className="py-2.5 flex items-center justify-between text-[#68756F] font-semibold text-[11px]">
                <span>Ordered Stops ({activeRoute?.stops.length || 0})</span>
                <span className="text-[10px] font-normal">Click stop to inspect SLA</span>
              </div>

              {/* Ordered Stops List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {activeRoute?.stops.map((stop) => {
                  const isLate = (stop.predicted_late_prob_max || 0) > 0.4 || stop.status === 'at_risk';
                  const isSelected = selectedStopId === stop.id;

                  return (
                    <div
                      key={stop.id}
                      onClick={() => setSelectedStopId(stop.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#17231F] text-white border-transparent shadow-md'
                          : stop.is_completed
                          ? 'bg-white/40 border-black/5 opacity-75 hover:bg-white/70'
                          : isLate
                          ? 'bg-[#FDF4EB] border-[#FBD6B0] hover:bg-white'
                          : 'bg-white/80 border-black/5 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] tabular-nums ${
                              isSelected
                                ? 'bg-[#A8DBC9] text-[#17231F]'
                                : stop.is_completed
                                ? 'bg-[#205A46] text-white'
                                : 'bg-black/10 text-[#15211D]'
                            }`}
                          >
                            {stop.sequence_idx}
                          </span>
                          <span
                            className={`font-semibold text-xs truncate max-w-[170px] ${
                              isSelected ? 'text-white' : 'text-[#15211D]'
                            }`}
                          >
                            {stop.customer_name}
                          </span>
                        </div>

                        {/* Status Icon */}
                        {stop.is_locked ? (
                          <Lock className={`w-3.5 h-3.5 ${isSelected ? 'text-[#A8DBC9]' : 'text-[#68756F]'}`} />
                        ) : stop.is_completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#205A46]" />
                        ) : isLate ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#C6534C]" />
                        ) : null}
                      </div>

                      <div
                        className={`mt-1.5 flex items-center justify-between text-[11px] tabular-nums ${
                          isSelected ? 'text-white/80' : 'text-[#68756F]'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {stop.window_start} – {stop.window_end}
                        </span>

                        {stop.penalty_exposure_inr > 0 ? (
                          <span
                            className={`font-bold ${
                              isSelected ? 'text-[#FBD6B0]' : 'text-[#C6534C]'
                            }`}
                          >
                            ₹{stop.penalty_exposure_inr}
                          </span>
                        ) : (
                          <span className="text-[#205A46] font-medium">On-Time</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-3 border-t border-black/5 mt-auto">
                <button
                  onClick={() => {
                    const firstPending = activeRoute?.stops.find((s) => !s.is_completed);
                    if (firstPending) onTriggerReplan(firstPending.id, activeVehicle.id);
                  }}
                  className="w-full py-2 bg-[#17231F] hover:bg-[#205A46] text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Evaluate Route Re-plan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
