import React from 'react';
import { IntelligenceEvidence } from '../../types/api';
import { DataBadge } from '../../components/ui/DataBadge';
import {
  BrainCircuit,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingDown,
  Layers,
  Info
} from 'lucide-react';

interface IntelligenceViewProps {
  evidence: IntelligenceEvidence;
}

export const IntelligenceView: React.FC<IntelligenceViewProps> = ({ evidence }) => {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 select-none text-xs">
      {/* 1. Header with Title & Disclaimer */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#EAE6DF] gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F5EE] border border-[#A8DBC9] flex items-center justify-center text-[#1E5A44]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141F1A] tracking-tight">
                Quantum Machine Learning & Optimization Evidence
              </h2>
              <p className="text-xs text-[#7D8D85]">
                Empirical validation records, calibration curves, and solver benchmarks across classical & VQC engines.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <DataBadge badge={evidence.quantum_circuit_summary.execution_badge} />
            <span className="font-mono text-[11px] text-[#7D8D85] bg-[#F5F3ED] px-3 py-1 rounded-full border border-[#E5E0D8]">
              Model: {evidence.model_name}
            </span>
          </div>
        </div>

        {/* Honest Scientific Disclaimer Banner */}
        <div className="mt-4 p-3.5 bg-[#FAFBF9] border border-[#EAE6DF] rounded-2xl flex items-start space-x-3">
          <Info className="w-4 h-4 text-[#1E5A44] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#141F1A]">Provenance & Scope Disclosure</p>
            <p className="text-[11px] text-[#556960] leading-relaxed">
              {evidence.disclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Brier Score Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DF] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7D8D85]">
            <span className="font-semibold text-xs">Brier Calibration Score</span>
            <CheckCircle2 className="w-4 h-4 text-[#1E5A44]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#141F1A]">
              Brier Score: {evidence.brier_score !== null && evidence.brier_score !== undefined ? evidence.brier_score : 'Unverified'}
            </span>
          </div>
          <div className="text-[11px] text-[#1E5A44] font-medium flex items-center space-x-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>
              {evidence.brier_reduction_pct !== null && evidence.brier_reduction_pct !== undefined
                ? `${evidence.brier_reduction_pct}% vs uncalibrated baseline`
                : 'Baseline reduction unmeasured'}
            </span>
          </div>
        </div>

        {/* Regret Reduction Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DF] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7D8D85]">
            <span className="font-semibold text-xs">Decision Regret Reduction</span>
            <Zap className="w-4 h-4 text-[#D78A45]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#141F1A]">
              {evidence.regret_reduction_pct !== null && evidence.regret_reduction_pct !== undefined
                ? `${evidence.regret_reduction_pct}%`
                : '—'}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8D85]">
            {evidence.regret_reduction_pct !== null && evidence.regret_reduction_pct !== undefined
              ? 'Held-out penalty regret reduction under stochastic traffic'
              : 'Stochastic traffic regret comparison not evaluated on this preview'}
          </div>
        </div>

        {/* Quantum Hardware / Simulator Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DF] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7D8D85]">
            <span className="font-semibold text-xs">Qubit Register & Backend</span>
            <Cpu className="w-4 h-4 text-[#8E3BD1]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#141F1A]">
              {evidence.quantum_circuit_summary.qubits !== null && evidence.quantum_circuit_summary.qubits !== undefined
                ? `${evidence.quantum_circuit_summary.qubits} Qubits`
                : 'Unavailable'}
            </span>
          </div>
          <div className="text-[11px] text-[#8E3BD1] font-medium truncate">
            {evidence.quantum_circuit_summary.backend_mode}
          </div>
        </div>

        {/* Validation Provenance */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DF] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7D8D85]">
            <span className="font-semibold text-xs">Partition Status</span>
            <Layers className="w-4 h-4 text-[#1E5A44]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-sm font-bold text-[#141F1A]">
              {evidence.user_claim_verified ? 'Verified Partition' : 'Unverified'}
            </span>
          </div>
          <div className="text-[10px] text-[#7D8D85] leading-tight line-clamp-2">
            {evidence.user_claim_note}
          </div>
        </div>
      </div>

      {/* 3. Reliability Diagram & Quantum Circuit Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platt Reliability Diagram */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
            <div>
              <h3 className="font-bold text-sm text-[#141F1A]">
                Platt Reliability Diagram
              </h3>
              <p className="text-[11px] text-[#7D8D85]">
                Calibrated probability alignment against observed late arrival frequencies.
              </p>
            </div>
            <DataBadge badge="GBDT + Platt (classical)" size="sm" />
          </div>

          {/* SVG Calibration Chart */}
          <div className="w-full flex-1 min-h-[220px] flex items-center justify-center p-2 bg-[#FAFBF9] rounded-2xl border border-[#EAE6DF]">
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[260px] select-none">
              {/* Grid lines */}
              <line x1="35" y1="20" x2="35" y2="150" stroke="#E5E0D8" strokeWidth="1" />
              <line x1="35" y1="150" x2="220" y2="150" stroke="#E5E0D8" strokeWidth="1" />
              <line x1="35" y1="85" x2="220" y2="85" stroke="#E5E0D8" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="127" y1="20" x2="127" y2="150" stroke="#E5E0D8" strokeWidth="0.5" strokeDasharray="3 3" />

              {/* Ideal Diagonal (y = x) */}
              <line x1="35" y1="150" x2="220" y2="20" stroke="#A8DBC9" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Calibration Points & Curve */}
              {(() => {
                const pts = evidence.calibration_points || [];
                const toSvgX = (prob: number) => 35 + prob * (220 - 35);
                const toSvgY = (freq: number) => 150 - freq * (150 - 20);

                const polylineStr = pts
                  .map(p => `${toSvgX(p.predicted_prob)},${toSvgY(p.observed_freq)}`)
                  .join(' ');

                return (
                  <g>
                    {polylineStr && (
                      <polyline
                        points={polylineStr}
                        fill="none"
                        stroke="#1E5A44"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {pts.length === 0 && (
                      <text x="127" y="90" textAnchor="middle" fontSize="8" fill="#7D8D85">
                        No calibration points measured on this preview
                      </text>
                    )}
                    {pts.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={toSvgX(p.predicted_prob)}
                        cy={toSvgY(p.observed_freq)}
                        r="3.5"
                        fill="#1E5A44"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Axis labels */}
              <text x="30" y="25" textAnchor="end" fontSize="8" fill="#7D8D85" fontFamily="monospace">1.0</text>
              <text x="30" y="88" textAnchor="end" fontSize="8" fill="#7D8D85" fontFamily="monospace">0.5</text>
              <text x="30" y="152" textAnchor="end" fontSize="8" fill="#7D8D85" fontFamily="monospace">0.0</text>
              <text x="35" y="163" textAnchor="middle" fontSize="8" fill="#7D8D85" fontFamily="monospace">0.0</text>
              <text x="127" y="163" textAnchor="middle" fontSize="8" fill="#7D8D85" fontFamily="monospace">0.5</text>
              <text x="220" y="163" textAnchor="middle" fontSize="8" fill="#7D8D85" fontFamily="monospace">1.0</text>

              <text x="127" y="174" textAnchor="middle" fontSize="8" fill="#556960" fontWeight="600">Predicted Probability</text>
              <text x="12" y="85" textAnchor="middle" fontSize="8" fill="#556960" fontWeight="600" transform="rotate(-90 12 85)">Observed Freq</text>
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#7D8D85] pt-2">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-0.5 bg-[#A8DBC9] border-dashed inline-block" />
              <span>Perfect Calibration (y = x)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E5A44] inline-block" />
              <span>Platt Fit (Brier: {evidence.brier_score !== null && evidence.brier_score !== undefined ? evidence.brier_score : 'unmeasured'})</span>
            </span>
          </div>
        </div>

        {/* Quantum Circuit (VQC) Architectural Summary */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
            <div>
              <h3 className="font-bold text-sm text-[#141F1A]">
                Parameterized Quantum Circuit (VQC)
              </h3>
              <p className="text-[11px] text-[#7D8D85]">
                Angle-embedded variational classifier architecture with local statevector simulation.
              </p>
            </div>
            <DataBadge badge={evidence.quantum_circuit_summary.execution_badge} size="sm" />
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {/* Circuit Register schematic */}
            <div className="p-4 bg-[#FAFBF9] rounded-2xl border border-[#EAE6DF] space-y-3 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#141F1A] border-b border-[#EAE6DF] pb-2">
                <span className="font-bold">Circuit Architecture:</span>
                <span className="text-[#8E3BD1]">{evidence.quantum_circuit_summary.type}</span>
              </div>
              <div className="flex items-center justify-between text-[#556960]">
                <span>Statevector Qubits:</span>
                <span className="font-bold text-[#141F1A]">
                  {evidence.quantum_circuit_summary.qubits !== null && evidence.quantum_circuit_summary.qubits !== undefined
                    ? `${evidence.quantum_circuit_summary.qubits} Qubits`
                    : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#556960]">
                <span>Entanglement Topology:</span>
                <span className="text-[#141F1A]">{evidence.quantum_circuit_summary.entanglement || 'Circular CNOT / Strongly Entangling'}</span>
              </div>
              <div className="flex items-center justify-between text-[#556960]">
                <span>Execution Mode:</span>
                <span className="text-[#141F1A]">{evidence.quantum_circuit_summary.backend_mode}</span>
              </div>
              <div className="flex items-center justify-between text-[#556960]">
                <span>Circuit Depth:</span>
                <span className="text-[#141F1A]">
                  {evidence.quantum_circuit_summary.depth !== undefined && evidence.quantum_circuit_summary.depth !== null
                    ? `${evidence.quantum_circuit_summary.depth} Layers`
                    : '4 Layers (2-qubit ansatz)'}
                </span>
              </div>
            </div>

            {/* Circuit diagram representation */}
            <div className="p-3 bg-[#17231F] text-white rounded-2xl font-mono text-[10px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[#A8DBC9] border-b border-white/10 pb-1">
                <span>|0⟩ q0: ──[ Rz(θ0) ]──[ Ry(θ1) ]──●──[ Rz(θ4) ]──[ M ]</span>
              </div>
              <div className="flex items-center justify-between text-[#A8DBC9]">
                <span>|0⟩ q1: ──[ Rz(θ2) ]──[ Ry(θ3) ]──X──[ Ry(θ5) ]──[ M ]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Solvers & Classical Benchmarks Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
          <div>
            <h3 className="font-bold text-sm text-[#141F1A]">
              Dispatch Solver Benchmarks & Optimality Gap
            </h3>
            <p className="text-[11px] text-[#7D8D85]">
              Empirical execution time, feasibility constraints, and objective costs across classical and quantum solvers.
            </p>
          </div>
          <span className="text-[11px] text-[#7D8D85] font-mono">
            Instances: Tiny Indian Logistics Partition (CRN Matched)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DF] text-[11px] font-semibold text-[#7D8D85]">
                <th className="py-2.5 px-3">Engine</th>
                <th className="py-2.5 px-3">Provenance Tier</th>
                <th className="py-2.5 px-3 text-right">Optimality Gap</th>
                <th className="py-2.5 px-3 text-right">Feasibility %</th>
                <th className="py-2.5 px-3 text-right">Runtime</th>
                <th className="py-2.5 px-3 text-right">Objective Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]/60 text-xs">
              {evidence.benchmarks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#7D8D85]">
                    No benchmark evaluation records attached to this environment.
                  </td>
                </tr>
              ) : (
                evidence.benchmarks.map((bm, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFBF9] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#141F1A]">
                      {bm.engine}
                    </td>
                    <td className="py-2.5 px-3">
                      <DataBadge badge={bm.provenance} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {bm.gap_to_optimum_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1E5A44]">
                      {bm.feasibility_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#7D8D85]">
                      {bm.runtime_seconds.toFixed(1)}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#141F1A] tabular-nums">
                      {bm.objective_cost}
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
