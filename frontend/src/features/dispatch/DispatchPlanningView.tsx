import React, { useState } from 'react';
import { PlanRun } from '../../types/api';
import { apiClient } from '../../api/client';
import { DataBadge } from '../../components/ui/DataBadge';
import {
  Play,
  Sliders,
  ShieldCheck,
  Send,
  Eye
} from 'lucide-react';

interface DispatchPlanningViewProps {
  plan: PlanRun;
  onPlanUpdate?: (plan: PlanRun) => void;
  onSelectRoute?: (vehicleId: string) => void;
  onJobTriggered?: () => void;
}

export const DispatchPlanningView: React.FC<DispatchPlanningViewProps> = ({
  plan,
  onPlanUpdate,
  onSelectRoute,
  onJobTriggered
}) => {
  const [selectedEngine, setSelectedEngine] = useState<string>('qpiai_opt');
  const [delayWeight, setDelayWeight] = useState<number>(1.5);
  const [mileageWeight, setMileageWeight] = useState<number>(0.8);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solveMessage, setSolveMessage] = useState<string | null>(null);
  const [publishedPlanIds, setPublishedPlanIds] = useState<Set<string>>(new Set());

  const isPublished = plan.status === 'active' || publishedPlanIds.has(plan.id);

  const handleRunSolve = async () => {
    setIsSolving(true);
    setSolveMessage('Submitting optimization request to dispatch pipeline…');

    const res = await apiClient.submitSolve({
      scenario_id: plan.scenario_id,
      engine: selectedEngine,
      penalty_weights: { delay_weight: delayWeight, mileage_weight: mileageWeight }
    });

    if ('error' in res && res.error === 'capacity_reached') {
      setSolveMessage(
        `Capacity Reached (BoundedSemaphore 2/2). Solver slots currently occupied. Backoff retry scheduled in ${res.retry_after}s.`
      );
      setIsSolving(false);
      return;
    }

    if ('job_id' in res) {
      setSolveMessage(`Job #${res.job_id} submitted successfully! Polling execution state…`);
      if (onJobTriggered) onJobTriggered();
    }

    setTimeout(() => {
      setIsSolving(false);
    }, 2000);
  };

  const handlePublishPlan = () => {
    setPublishedPlanIds((prev) => new Set(prev).add(plan.id));
    if (onPlanUpdate) {
      onPlanUpdate({
        ...plan,
        status: 'active'
      });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 select-none text-xs">
      {/* Left: Solver Engine & Parameter Configuration */}
      <div className="w-96 glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-2 pb-3 border-b border-black/5">
            <Sliders className="w-4 h-4 text-[#205A46]" />
            <h2 className="text-sm font-extrabold text-[#15211D]">
              Optimization Solver Engine
            </h2>
          </div>

          <div className="mt-4 space-y-4">
            {/* Engine Selection */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#929E99] block mb-1.5">
                Target Solver Architecture
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'qpiai_opt', label: 'QpiAI Opt (local QUBO)', desc: 'qubo.py penalty matrix with local simulator' },
                  { id: 'qaoa', label: 'Warm-Start QAOA', desc: 'qaoa.py variational quantum optimization' },
                  { id: 'financial', label: 'Financial Exact Cover', desc: 'financial.py exact SLA penalty minimization' },
                  { id: 'exact', label: 'Exact Enumeration', desc: 'domain.py combinatorial brute force' }
                ].map((eng) => (
                  <button
                    key={eng.id}
                    onClick={() => setSelectedEngine(eng.id)}
                    className={`w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedEngine === eng.id
                        ? 'bg-[#17231F] text-white border-transparent shadow-xs'
                        : 'bg-white/80 border-black/5 text-[#15211D] hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs">{eng.label}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedEngine === eng.id ? 'text-white/70' : 'text-[#68756F]'}`}>
                      {eng.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Penalty Weights Sliders */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[#15211D]">SLA Delay Weight:</span>
                  <span className="font-mono font-bold text-[#205A46] tabular-nums">{delayWeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={delayWeight}
                  onChange={(e) => setDelayWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#205A46] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[#15211D]">Transit Mileage Weight:</span>
                  <span className="font-mono font-bold text-[#205A46] tabular-nums">{mileageWeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={mileageWeight}
                  onChange={(e) => setMileageWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#205A46] cursor-pointer"
                />
              </div>
            </div>

            {/* Status message */}
            {solveMessage && (
              <div className="p-3 bg-white/90 border border-black/10 rounded-2xl text-[11px] text-[#15211D] leading-relaxed">
                {solveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Submit Solver Run Action */}
        <div className="pt-4 border-t border-black/5">
          <button
            onClick={handleRunSolve}
            disabled={isSolving}
            className="w-full py-2.5 bg-[#205A46] hover:bg-[#17231F] text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSolving ? 'Dispatching Solver…' : 'Dispatch Optimization Run'}</span>
          </button>
        </div>
      </div>

      {/* Right: Candidate Plan Review & Manifest Publishing */}
      <div className="flex-1 glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg flex flex-col justify-between overflow-hidden">
        <div>
          {/* Top Plan Status & Publication Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-black/5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold text-[#15211D]">
                  {plan.scenario_name}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isPublished ? 'bg-[#E2F4EE] text-[#205A46]' : 'bg-[#FDF4EB] text-[#D78A45]'
                  }`}
                >
                  {isPublished ? 'PUBLISHED MANIFEST' : 'DRAFT CANDIDATE'}
                </span>
              </div>
              <div className="text-[#68756F] text-[11px] mt-0.5 flex items-center space-x-2">
                <DataBadge badge={plan.provenance_badge} size="sm" />
                <span>·</span>
                <span className="tabular-nums">Total stops: {plan.total_stops}</span>
                <span>·</span>
                <span className="tabular-nums">Assumed Rate ₹83/$</span>
              </div>
            </div>

            {/* Publish Manifest CTA */}
            {!isPublished ? (
              <button
                onClick={handlePublishPlan}
                className="px-4 py-2 bg-[#17231F] hover:bg-[#205A46] text-white rounded-2xl font-bold transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Plan to Fleet</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 text-[#205A46] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Manifest Active</span>
              </div>
            )}
          </div>

          {/* Assigned Candidate Routes Breakdown */}
          <div className="mt-4 overflow-y-auto max-h-[calc(100vh-280px)] space-y-3 pr-2">
            {plan.routes.map((route, i) => {
              const v = plan.vehicles.find((veh) => veh.id === route.vehicle_id);

              return (
                <div
                  key={route.id}
                  className="p-4 bg-white/80 border border-black/5 rounded-2xl shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: route.color_token }}
                      />
                      <span className="font-bold text-sm text-[#15211D]">
                        Route #{i + 1} — {v?.callsign}
                      </span>
                      <span className="text-[11px] text-[#68756F]">
                        ({v?.driver_name})
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right tabular-nums">
                        <span className="font-bold text-[#15211D]">
                          {route.total_distance_km} km
                        </span>
                        <span className="text-[#68756F] ml-1.5">
                          · {route.total_duration_minutes} min
                        </span>
                      </div>

                      {onSelectRoute && (
                        <button
                          onClick={() => onSelectRoute(route.vehicle_id)}
                          className="px-2.5 py-1 bg-black/5 hover:bg-[#17231F] hover:text-white rounded-xl font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View on Map</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Sequence Ribbon */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                    {route.stops.map((stop, sIdx) => (
                      <React.Fragment key={stop.id}>
                        <div
                          className={`px-2 py-1 rounded-xl font-medium shrink-0 flex items-center space-x-1 text-[11px] tabular-nums ${
                            stop.is_completed
                              ? 'bg-[#E2F4EE] text-[#205A46]'
                              : stop.status === 'at_risk'
                              ? 'bg-[#FDF4EB] text-[#C6534C] border border-[#FBD6B0]'
                              : 'bg-black/5 text-[#15211D]'
                          }`}
                        >
                          <span className="font-bold">#{stop.sequence_idx}</span>
                          <span className="truncate max-w-[100px]">{stop.customer_name}</span>
                        </div>
                        {sIdx < route.stops.length - 1 && (
                          <span className="text-[#929E99] font-bold">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
