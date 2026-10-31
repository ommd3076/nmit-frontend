import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  Smartphone,
  KeyRound,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Clock,
  Layers,
  MapPin,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const DriverTerminalView: React.FC = () => {
  const [pairingCode, setPairingCode] = useState<string>('PAIR01');
  const [session, setSession] = useState<{
    token: string;
    driver_id: string;
    driver_name: string;
    vehicle_id: string;
  } | null>(null);

  const [driverState, setDriverState] = useState<any>(null);
  const [decisionNotice, setDecisionNotice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  // Auto-load state on mount for driver_1
  useEffect(() => {
    refreshState('driver_1');
    loadAudits();
  }, []);

  const loadAudits = async () => {
    try {
      const res = await fetch(`${apiClient.getBaseUrl()}/api/v1/demo/audits`);
      if (res.ok) {
        const data = await res.json();
        setRecentAudits(data);
      }
    } catch {
      // Ignore
    }
  };

  const refreshState = async (driverId: string = session?.driver_id || 'driver_1') => {
    try {
      const state = await apiClient.getDemoState(driverId);
      setDriverState(state);
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to connect to demo endpoint');
    }
  };

  const handlePair = async () => {
    if (!pairingCode.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiClient.getBaseUrl()}/api/v1/demo/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairingCode.trim().toUpperCase() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.error?.message || 'Pairing failed');
      }
      const data = await res.json();
      setSession(data);
      await refreshState(data.driver_id);
      await loadAudits();
    } catch (e: any) {
      setErrorMessage(e.message || 'Invalid pairing code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportCongestion = async (severity: 'moderate' | 'heavy') => {
    const driverId = session?.driver_id || driverState?.driver_id || 'driver_1';
    setIsLoading(true);
    try {
      const note = severity === 'heavy' ? 'Major bottleneck at expressway junction' : 'Moderate slowdown in outer lane';
      const result = await apiClient.reportDemoCongestion(driverId, severity, note);
      setDecisionNotice(result);
      await refreshState(driverId);
      await loadAudits();
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to submit report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    const driverId = session?.driver_id || driverState?.driver_id || 'driver_1';
    const version = driverState?.route_version || 1;
    setIsLoading(true);
    try {
      await apiClient.acknowledgeDemoRoute(driverId, version);
      await refreshState(driverId);
      await loadAudits();
      setDecisionNotice((prev: any) => ({
        ...prev,
        acknowledged: true
      }));
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to acknowledge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      await fetch(`${apiClient.getBaseUrl()}/api/v1/demo/reset`, { method: 'POST' });
      setSession(null);
      setDecisionNotice(null);
      await refreshState('driver_1');
      await loadAudits();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 select-none text-xs">
      {/* Left: Mobile Terminal Frame (Realistic Device Simulation) */}
      <div className="w-88 max-w-sm bg-white rounded-3xl p-5 border border-[#EAE6DF] shadow-md flex flex-col justify-between shrink-0 relative overflow-hidden">
        {/* Device Notch & Status Bar */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF] text-[#7D8D85] font-mono text-[10px]">
            <span className="flex items-center gap-1 font-bold text-[#141F1A]">
              <Smartphone className="w-3.5 h-3.5 text-[#1E5A44]" />
              DRIVER TERMINAL · LIVE
            </span>
            <span className="bg-[#E8F5EE] text-[#1E5A44] px-2 py-0.5 rounded-full font-bold">
              FastAPI Connected
            </span>
          </div>

          {/* Pairing Code Card */}
          <div className="mt-3.5 p-3.5 bg-[#F5F3ED]/80 border border-[#E5E0D8] rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#7D8D85] flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-[#1E5A44]" />
                Pairing Code
              </span>
              <span className="font-mono text-[10px] text-[#4D5C54]">
                {session ? 'Authenticated' : 'Available: PAIR01, PAIR02'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                placeholder="PAIR01"
                className="flex-1 font-mono uppercase font-bold px-3 py-1.5 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#141F1A] focus:outline-none focus:ring-2 focus:ring-[#1E5A44]/20"
              />
              <button
                onClick={handlePair}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#141F1A] hover:bg-[#1E5A44] text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
              >
                Pair
              </button>
            </div>

            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => setPairingCode('PAIR01')}
                className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-lg text-[10px] font-mono hover:bg-[#F5F3ED] text-[#4D5C54]"
              >
                PAIR01 (Ramesh)
              </button>
              <button
                onClick={() => setPairingCode('PAIR02')}
                className="px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-lg text-[10px] font-mono hover:bg-[#F5F3ED] text-[#4D5C54]"
              >
                PAIR02 (Suresh)
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[11px]">
              {errorMessage}
            </div>
          )}

          {/* Active Navigation & Route Card */}
          {driverState && (
            <div className="mt-3.5 space-y-3">
              <div className="p-3.5 bg-white border border-[#EAE6DF] rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#141F1A] flex items-center gap-1.5 text-xs">
                    <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
                    {driverState.corridor_id}
                  </span>
                  <span className="font-mono text-[10px] bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full font-bold">
                    v{driverState.route_version}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1 border-t border-[#F5F3ED]">
                  <div>
                    <span className="text-[#7D8D85] block text-[9px] uppercase">Vehicle</span>
                    <span className="font-bold text-[#141F1A]">{driverState.vehicle_id}</span>
                  </div>
                  <div>
                    <span className="text-[#7D8D85] block text-[9px] uppercase">Driver ID</span>
                    <span className="font-bold text-[#141F1A]">{driverState.driver_id}</span>
                  </div>
                  <div>
                    <span className="text-[#7D8D85] block text-[9px] uppercase">Duration</span>
                    <span className="font-bold text-[#1E5A44]">
                      {Math.round(driverState.current_duration_seconds / 60)} mins
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7D8D85] block text-[9px] uppercase">Last Ack</span>
                    <span className="font-bold text-[#4D5C54]">
                      {driverState.last_ack_version ? `v${driverState.last_ack_version}` : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Congestion Action Triggers */}
              <div className="p-3.5 bg-[#FDF4EB] border border-[#FBD6B0] rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#D78A45] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                  Simulate Incident / Traffic
                </span>
                <p className="text-[10px] text-[#7C502C]">
                  Reports trigger FastAPI real-time policy evaluation (auto-switching to alternate corridor if savings &ge; 2 min).
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleReportCongestion('moderate')}
                    disabled={isLoading}
                    className="py-2 bg-white hover:bg-[#FDF4EB] border border-[#FBD6B0] text-[#D78A45] rounded-xl font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                  >
                    Moderate (+3m)
                  </button>
                  <button
                    onClick={() => handleReportCongestion('heavy')}
                    disabled={isLoading}
                    className="py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
                  >
                    Heavy Gridlock (+8m)
                  </button>
                </div>
              </div>

              {/* Acknowledge Button */}
              {driverState.route_version !== driverState.last_ack_version && (
                <button
                  onClick={handleAcknowledge}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1E5A44] hover:bg-[#154231] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Acknowledge Route v{driverState.route_version}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reset Demo Footer Button */}
        <div className="pt-3 border-t border-[#EAE6DF] flex justify-between items-center text-[10px] text-[#7D8D85]">
          <button
            onClick={handleResetDemo}
            disabled={isLoading}
            className="flex items-center gap-1 hover:text-[#141F1A] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Demo State
          </button>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* Right: Live Policy Coordinator & Decision Audit Trail */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DF]">
          <div>
            <h2 className="text-xl font-bold text-[#141F1A] tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#1E5A44]" />
              FastAPI Demo Coordinator & Audit Trail
            </h2>
            <p className="text-xs text-[#7D8D85] mt-0.5">
              Live route switching decisions, candidate costs, and validator transactions
            </p>
          </div>
          <button
            onClick={() => { refreshState(); loadAudits(); }}
            className="px-3.5 py-1.5 bg-[#F5F3ED] hover:bg-black/5 border border-[#E5E0D8] rounded-full font-semibold text-[#141F1A] transition-all cursor-pointer"
          >
            Refresh Audit
          </button>
        </div>

        {/* Real-time Decision Callout */}
        {decisionNotice && (
          <div className={`mt-4 p-4 rounded-2xl border ${
            decisionNotice.published_new_route
              ? 'bg-[#E8F5EE] border-[#A8DBC9] text-[#1E5A44]'
              : 'bg-[#FDF4EB] border-[#FBD6B0] text-[#D78A45]'
          }`}>
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5">
                {decisionNotice.published_new_route ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                Decision: {decisionNotice.decision}
              </span>
              <span className="font-mono text-[11px]">
                {decisionNotice.current_route_id} (v{decisionNotice.current_route_version})
              </span>
            </div>
            <p className="text-[11px] mt-1 opacity-90">
              {decisionNotice.published_new_route
                ? `Automatic re-routing policy activated. Reassigned driver to faster corridor with valid constraints.`
                : `Current route remains faster than available bypass corridors. Route retained.`}
            </p>
          </div>
        )}

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DF] text-[#7D8D85] text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 font-bold">Timestamp</th>
                <th className="pb-3 font-bold">Action / Trigger</th>
                <th className="pb-3 font-bold">Decision</th>
                <th className="pb-3 font-bold">Route & Version</th>
                <th className="pb-3 font-bold">Candidate Costs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {recentAudits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#7D8D85] font-mono text-xs">
                    No decision events yet. Click "Moderate" or "Heavy Gridlock" on the terminal to trigger evaluation.
                  </td>
                </tr>
              ) : (
                recentAudits.map((a: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F5F3ED]/40 transition-colors">
                    <td className="py-3 pr-3 font-mono text-[#7D8D85] text-[11px]">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-[#141F1A]">
                      {a.action}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        a.decision === 'PUBLISHED_NEW_ROUTE'
                          ? 'bg-[#E8F5EE] text-[#1E5A44]'
                          : 'bg-[#F5F3ED] text-[#4D5C54]'
                      }`}>
                        {a.decision}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-[#141F1A]">
                      {a.route_id} (v{a.route_version})
                    </td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-[#7D8D85]">
                      {a.details ? JSON.stringify(a.details).slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
