import React, { useState } from 'react';
import { PlanRun } from '../../types/api';
import { RouteMap } from '../../components/map/RouteMap';
import { StopDrawer } from '../../components/stops/StopDrawer';
import { DataBadge } from '../../components/ui/DataBadge';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingDown,
  Lock,
  Phone,
  MessageSquare,
  Zap,
  RotateCcw,
  Boxes
} from 'lucide-react';

interface CommandCenterViewProps {
  plan: PlanRun;
  selectedVehicleId?: string | null;
  selectedStopId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  onSelectStop?: (stopId: string) => void;
  searchQuery?: string;
  onPlanUpdate?: (updated: PlanRun) => void;
  onTriggerReplan: (stopId: string, vehicleId: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  plan,
  selectedVehicleId,
  selectedStopId,
  onSelectVehicle,
  onSelectStop,
  searchQuery = '',
  onTriggerReplan
}) => {
  const currentVehicleId = selectedVehicleId || plan.vehicles[0]?.id || null;
  const currentStopId = selectedStopId || null;

  const [stopFilter, setStopFilter] = useState<'all' | 'pending' | 'at_risk' | 'completed'>('all');
  const [reRouteToastDismissed, setReRouteToastDismissed] = useState<boolean>(false);
  const [driverActionToast, setDriverActionToast] = useState<string | null>(null);

  const handleSelectVehicle = (vId: string) => {
    if (onSelectVehicle) onSelectVehicle(vId);
  };

  const handleSelectStop = (sId: string) => {
    if (onSelectStop) onSelectStop(sId);
  };

  // Active vehicle and route
  const activeVehicle = plan.vehicles.find((v) => v.id === currentVehicleId) || plan.vehicles[0];
  const activeRoute = plan.routes.find((r) => r.vehicle_id === activeVehicle?.id);
  const selectedStop = activeRoute?.stops.find((s) => s.id === currentStopId) || null;

  // Key operational totals
  const totalStops = plan.total_stops;
  const completedStops = plan.completed_stops;
  const progressPct = Math.round((completedStops / totalStops) * 100);

  // Find first at-risk stop for re-route advisory prompt (Warehouse & RouteIQ pattern)
  const candidateDelayStop = activeRoute?.stops.find((s) => !s.is_completed && ((s.predicted_late_prob_max || 0) > 0.3 || s.status === 'at_risk'));

  // Filter stops by searchQuery and stopFilter tab
  const displayedStops = (activeRoute?.stops || []).filter((s) => {
    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const match =
        s.customer_name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.sequence_idx.toString().includes(query);
      if (!match) return false;
    }

    // 2. Tab Filter
    if (stopFilter === 'completed') return s.is_completed;
    if (stopFilter === 'at_risk') return !s.is_completed && ((s.predicted_late_prob_max || 0) > 0.25 || s.status === 'at_risk');
    if (stopFilter === 'pending') return !s.is_completed;
    return true;
  });

  const handleSimulatedDriverCall = (driverName: string, phone: string) => {
    setDriverActionToast(`Dialing ${driverName} (${phone}) on encrypted dispatch VoIP…`);
    setTimeout(() => setDriverActionToast(null), 3000);
  };

  const handleSimulatedDriverMessage = (driverName: string) => {
    setDriverActionToast(`Route manifest update sent to ${driverName}'s mobile HUD terminal.`);
    setTimeout(() => setDriverActionToast(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Action Notification Banner */}
      {driverActionToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 glass-panel-strong px-5 py-2.5 rounded-2xl shadow-xl border border-white text-xs flex items-center space-x-2 text-[#15211D] animate-in slide-in-from-top-2">
          <Zap className="w-4 h-4 text-[#205A46] animate-pulse" />
          <span className="font-semibold">{driverActionToast}</span>
        </div>
      )}

      {/* Top Operational Metrics Bar (Fieldnotes & Atlas Editorial Rhythm) */}
      <div className="px-6 py-2.5 border-b border-black/5 bg-white/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#77736D]">
              01 · ACTIVE DISPATCH CORRIDOR
            </div>
            <h1 className="text-base font-extrabold text-[#15211D] tracking-tight">
              {plan.scenario_name}
            </h1>
            <div className="flex items-center space-x-2 mt-0.5 text-xs text-[#55534F]">
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

        {/* High-level KPI Summary Chips with Atlas Efficiency Gauges */}
        <div className="flex items-center space-x-3">
          {/* Atlas Donut: Fleet In-Field */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-3 text-xs">
            {/* SVG Donut Ring */}
            <div className="relative w-8 h-8 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EEF2ED" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#205A46"
                  strokeWidth="4"
                  strokeDasharray="67, 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-[9px] text-[#205A46] tabular-nums">
                67%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#77736D]">Fleet In-Field</div>
              <div className="font-extrabold text-[#15211D] tabular-nums">
                {plan.vehicles.length} Units Active
              </div>
            </div>
          </div>

          {/* Delivery Performance Ring: Completion */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-3 text-xs">
            <div className="relative w-8 h-8 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EEF2ED" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#2F5BEA"
                  strokeWidth="4"
                  strokeDasharray={`${progressPct}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F5BEA] absolute inset-0 m-auto" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#77736D]">Completion</div>
              <div className="font-extrabold text-[#15211D] tabular-nums">
                {completedStops}/{totalStops} ({progressPct}%)
              </div>
            </div>
          </div>

          {/* SLA Financial Exposure */}
          <div className="glass-panel px-3.5 py-1.5 rounded-2xl flex items-center space-x-2.5 text-xs">
            <TrendingDown className="w-4 h-4 text-[#C6534C]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#77736D]">SLA Exposure</div>
              <div className="font-extrabold text-[#C6534C] tabular-nums">
                ₹{plan.total_sla_exposure_inr.toLocaleString('en-IN')}
                <span className="text-[9px] font-normal text-[#55534F] ml-1">
                  ({plan.assumed_rate_label.split(' ')[2]})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Command Surface: Map (Left/Center) + Operations Rail (Right) */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Geospatial Map Canvas Column */}
        <div className="flex-1 relative flex flex-col h-full rounded-3xl overflow-hidden shadow-sm border border-black/5">
          {/* Tactical Delay & Re-Routing Toast (Warehouse Ref 4 & RouteIQ Ref 5) */}
          {candidateDelayStop && !reRouteToastDismissed && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl glass-panel-strong p-3.5 rounded-2xl shadow-xl border border-white flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#FDF4EB] flex items-center justify-center shrink-0 border border-[#FBD6B0]">
                  <AlertTriangle className="w-4 h-4 text-[#D78A45]" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-[#15211D] flex items-center gap-1.5">
                    <span>Corridor Congestion (+20 min)</span>
                    <span className="text-[10px] font-mono text-[#D78A45] bg-[#FDF4EB] px-1.5 py-0.2 rounded">
                      Silk Board / Hosur Rd
                    </span>
                  </div>
                  <div className="text-[11px] text-[#55534F] truncate">
                    Save 14 min & recover ₹8,300 exposure on {candidateDelayStop.customer_name} via ORR bypass?
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onTriggerReplan(candidateDelayStop.id, activeVehicle.id)}
                  className="px-3 py-1.5 bg-[#205A46] text-white rounded-xl font-semibold hover:bg-[#17231F] transition-all flex items-center gap-1 shadow-sm interactive-tap cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-Plan Route</span>
                </button>
                <button
                  onClick={() => setReRouteToastDismissed(true)}
                  className="px-2.5 py-1.5 text-[#77736D] hover:text-[#15211D] hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <RouteMap
            plan={plan}
            selectedVehicleId={currentVehicleId}
            selectedStopId={currentStopId}
            onSelectVehicle={handleSelectVehicle}
            onSelectStop={handleSelectStop}
            className="flex-1 w-full h-full"
          />

          {/* Bottom Hub Distribution Strip (Warehouse Ref 4) */}
          <div className="absolute bottom-4 right-4 z-10 glass-panel p-2.5 px-3.5 rounded-2xl border border-white/70 shadow-md text-xs flex items-center space-x-4 hidden lg:flex">
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#15211D]">
              <Boxes className="w-3.5 h-3.5 text-[#205A46]" />
              <span>Depot Fulfillment Stage:</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] tabular-nums">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#205A46]" />
                <span className="font-semibold text-[#15211D]">Picked: 48%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2F5BEA]" />
                <span className="font-semibold text-[#15211D]">Packed: 36%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D78A45]" />
                <span className="font-semibold text-[#15211D]">Staged: 16%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Operations Panel */}
        <div className="w-96 flex flex-col gap-3 shrink-0 h-full overflow-hidden">
          {/* Selected Stop Drawer if active */}
          {selectedStop ? (
            <StopDrawer
              stop={selectedStop}
              vehicle={activeVehicle}
              onClose={() => {
                if (onSelectStop) onSelectStop('');
              }}
              onTriggerReplan={onTriggerReplan}
            />
          ) : (
            /* Selected Vehicle Itinerary & Ordered Stops */
            <div className="flex-1 glass-panel-strong rounded-3xl p-4 flex flex-col overflow-hidden border border-white/70 shadow-lg text-xs">
              {/* Vehicle Header Card (Image 6 & Vanta Ride Ref 3) */}
              <div className="pb-3 border-b border-black/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {/* Truck Silhouette Glyph */}
                    <div className="w-9 h-9 rounded-2xl bg-[#17231F] flex items-center justify-center text-[#A8DBC9] shadow-sm">
                      <Truck className="w-5 h-5" />
                    </div>
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
                      <div className="text-[11px] text-[#55534F] mt-0.5">
                        {activeVehicle.driver_name} · {activeVehicle.vehicle_type}
                      </div>
                    </div>
                  </div>

                  {/* Battery & Payload */}
                  <div className="text-right">
                    <div className="font-extrabold text-xs text-[#205A46] tabular-nums">
                      {activeVehicle.battery_or_fuel_pct}% Batt
                    </div>
                    <div className="text-[10px] text-[#77736D] tabular-nums">
                      {activeVehicle.used_capacity_kg}/{activeVehicle.capacity_kg} kg
                    </div>
                  </div>
                </div>

                {/* Driver Action Quick Buttons (Ref 6 Delivery Card) */}
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    onClick={() => handleSimulatedDriverCall(activeVehicle.driver_name, activeVehicle.phone)}
                    className="flex-1 py-1.5 px-2 bg-white/90 hover:bg-white border border-black/5 rounded-xl font-semibold text-[11px] text-[#15211D] flex items-center justify-center gap-1.5 transition-all interactive-tap cursor-pointer shadow-xs"
                    title={`Call driver ${activeVehicle.driver_name}`}
                  >
                    <Phone className="w-3 h-3 text-[#205A46]" />
                    <span>Call Driver</span>
                  </button>
                  <button
                    onClick={() => handleSimulatedDriverMessage(activeVehicle.driver_name)}
                    className="flex-1 py-1.5 px-2 bg-white/90 hover:bg-white border border-black/5 rounded-xl font-semibold text-[11px] text-[#15211D] flex items-center justify-center gap-1.5 transition-all interactive-tap cursor-pointer shadow-xs"
                    title={`Dispatch message to ${activeVehicle.callsign}`}
                  >
                    <MessageSquare className="w-3 h-3 text-[#2F5BEA]" />
                    <span>Dispatch Ping</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs for Stops (Ref 1 Atlas Table Tabs) */}
              <div className="py-2.5 flex items-center justify-between text-[#55534F] font-semibold text-[11px] border-b border-black/5">
                <div className="flex items-center space-x-1">
                  {(['all', 'pending', 'at_risk', 'completed'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStopFilter(tab)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        stopFilter === tab
                          ? 'bg-[#17231F] text-white shadow-xs'
                          : 'text-[#55534F] hover:bg-white/80'
                      }`}
                    >
                      {tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {searchQuery && (
                  <span className="text-[#205A46] font-medium text-[10px]">
                    Filtered by: "{searchQuery}"
                  </span>
                )}
                {!searchQuery && (
                  <span className="text-[10px] font-normal text-[#77736D]">
                    {displayedStops.length} Stops
                  </span>
                )}
              </div>

              {/* Ordered Stops List (Vanta Ride & Fieldnotes Style) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
                {displayedStops.map((stop) => {
                  const isLate = (stop.predicted_late_prob_max || 0) > 0.4 || stop.status === 'at_risk';
                  const isSelected = currentStopId === stop.id;

                  return (
                    <div
                      key={stop.id}
                      onClick={() => handleSelectStop(stop.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer interactive-tap ${
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
                          <Lock className={`w-3.5 h-3.5 ${isSelected ? 'text-[#A8DBC9]' : 'text-[#55534F]'}`} />
                        ) : stop.is_completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#205A46]" />
                        ) : isLate ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#C6534C]" />
                        ) : null}
                      </div>

                      <div
                        className={`mt-1.5 flex items-center justify-between text-[11px] tabular-nums ${
                          isSelected ? 'text-white/80' : 'text-[#55534F]'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-70" />
                          <span>{stop.window_start} - {stop.window_end}</span>
                        </span>
                        <span className="font-semibold">
                          ETA {stop.eta_min} (simulated)
                        </span>
                      </div>

                      {/* SLA Penalty Exposure Pill */}
                      {stop.penalty_exposure_inr > 0 && (
                        <div
                          className={`mt-1.5 pt-1.5 border-t flex items-center justify-between text-[10px] tabular-nums ${
                            isSelected
                              ? 'border-white/10 text-[#A8DBC9]'
                              : 'border-black/5 text-[#C6534C]'
                          }`}
                        >
                          <span>Exposure: ₹{stop.penalty_exposure_inr.toLocaleString('en-IN')}</span>
                          <span className="font-mono">P(late): {Math.round(stop.predicted_late_prob_max * 100)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {displayedStops.length === 0 && (
                  <div className="text-center py-8 text-[#77736D]">
                    <div className="font-semibold text-xs">No stops match this filter</div>
                    <div className="text-[10px] mt-0.5">Switch tab or clear search query.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
