import { Activity, Cpu, FlaskConical, RotateCw, ShieldCheck } from 'lucide-react';
import { DataBadge } from '../../components/ui/DataBadge';
import type { useOperations } from './useOperations';
import { Badge, EmptyState, Metric, Panel } from './primitives';

type Operations = ReturnType<typeof useOperations>;

const metrics = [
  { model: 'Classical GBDT', mae: 3.1467396494, rmse: 3.9681796720, median: 2.6860812276 },
  { model: '4-qubit residual · 60 angles', mae: 3.1472684570, rmse: 3.9695990517, median: 2.7038575901 },
  { model: '4-qubit residual · 76 angles', mae: 3.1441209390, rmse: 3.9678098550, median: 2.6895871115 },
  { model: 'Operational release · α = 0', mae: 3.1467396494, rmse: 3.9681796720, median: 2.6860812276 },
];

const qaoaJobs = (operations: Operations) => operations.jobs.filter((job) =>
  /qaoa/i.test(`${job.engine} ${job.execution_type}`),
);

export function DiagnosticsView({ operations }: { operations: Operations }) {
  const jobs = qaoaJobs(operations);
  const evidence = operations.evidence;
  return <main className="arq-page">
    <div className="arq-page-heading">
      <div><span className="arq-eyebrow">INTELLIGENCE / MODEL DIAGNOSTICS</span><h1>Diagnostics</h1><p>Frozen ETA evaluation, circuit definition, and execution provenance.</p></div>
      <button className="arq-button arq-button-secondary" onClick={() => void operations.refresh()}><RotateCw size={15}/> Refresh backend state</button>
    </div>

    <div className="arq-command-metrics">
      <Metric label="ETA operating policy" value="α = 0" note="GBDT only; VQC correction disabled" icon={<ShieldCheck size={16}/>}/>
      <Metric label="Residual circuit" value="4 qubits" note="5 upload blocks · 60 / 76 trainable angles" icon={<Cpu size={16}/>}/>
      <Metric label="Evaluation rows" value="5,941" note="176 courier groups · retrospective test" icon={<FlaskConical size={16}/>}/>
      <Metric label="Backend health" value={operations.health.status} note={operations.health.version} icon={<Activity size={16}/>}/>
    </div>

    <Panel title="ETA error comparison" action={<Badge tone="neutral">Minutes · lower is better</Badge>}>
      <p className="mb-3 text-[12px] text-[#596a60]">Saved retrospective test metrics, scored on the same 5,941-row partition. This partition had been accessed in an earlier evaluation; these results are not a pristine blind test.</p>
      <div className="arq-table-scroll"><table className="arq-table"><thead><tr><th>Model / policy</th><th>MAE</th><th>RMSE</th><th>Median absolute error</th><th>Operational use</th></tr></thead><tbody>{metrics.map((row) => <tr key={row.model}><td><b>{row.model}</b></td><td className="tabular-nums">{row.mae.toFixed(4)}</td><td className="tabular-nums">{row.rmse.toFixed(4)}</td><td className="tabular-nums">{row.median.toFixed(4)}</td><td>{row.model.includes('α = 0') ? <Badge tone="good">Frozen release</Badge> : row.model.startsWith('4-qubit') ? <Badge tone="warning">Experimental candidate</Badge> : 'Baseline'}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-[12px] text-[#596a60]">The 76-angle candidate has slightly lower MAE and RMSE in this retrospective scoring; the differences are small, the partition is not pristine, and no uncertainty estimate is reported. The operational release remains the pretest-frozen GBDT policy and makes zero VQC calls. No superiority claim.</p>
      <p className="mt-2 text-[11px] text-[#68756f]">Source: artifacts/india_eta_vqc4_run2/retrospective_test_metrics.json · acceptance: docs/RUN2_ACCEPTANCE.md</p>
    </Panel>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel title="Four-qubit residual circuit" action={<Badge tone="warning">Experimental · not operational</Badge>}>
        <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-[13px] sm:grid-cols-2">
          <div><dt className="text-[#68756f]">Input features</dt><dd>Distance, congestion, multi-delivery, preparation time</dd></div>
          <div><dt className="text-[#68756f]">Feature map</dt><dd>Five data-upload blocks; feature angles use π × x radians</dd></div>
          <div><dt className="text-[#68756f]">Entanglement</dt><dd>Four-qubit ring: 0→1→2→3→0</dd></div>
          <div><dt className="text-[#68756f]">Readout</dt><dd>Four Pauli-Z expectations + affine 4-weight, 1-bias head</dd></div>
          <div><dt className="text-[#68756f]">60-angle variant</dt><dd>Five blocks × four qubits × RX/RY/RZ</dd></div>
          <div><dt className="text-[#68756f]">76-angle variant</dt><dd>60 base angles + 16 extension RX angles</dd></div>
        </dl>
        <div className="mt-4 rounded-lg border border-[#dce6df] bg-[#f7f9f7] p-3 text-[12px] text-[#42574b]">
          Example mapping: normalized distance x=0.5 enters the feature map as π·0.5 = π/2 radians. The model predicts a residual in minutes; α=0 multiplies that correction by zero in the deployed policy.
        </div>
        <p className="mt-3 text-[11px] text-[#68756f]">Circuit metadata: artifacts/india_eta_vqc4_run2/{'baseline60_best.json, extended76_best.json'} · implementation: experiments_india_qml/torch_residual.py</p>
      </Panel>

      <Panel title="Execution provenance" action={<DataBadge badge="VQC · local statevector" size="sm"/>}>
        <ul className="space-y-3 text-[13px]">
          <li><b>Residual checkpoint parity:</b> QpiAI Quantum 0.3.0 StatevectorSimulator, exact statevector, 8 validation rows per variant; maximum residual discrepancy below 2.8×10⁻¹⁶ minutes. Local CPU simulation only.</li>
          <li><b>QpiAI warm-start QAOA:</b> QpiAI Opt 0.0.9 + Quantum 0.3.0; local statevector, 8-variable route QUBO, 128 samples and separate 2,048-shot bit-order probe. Decoded sample independently validated; no cloud solve or QPU.</li>
          <li><b>Reference API QAOA:</b> one recorded localhost job used the local Python statevector simulator (seed 7, 64 shots); raw sample passed independent validation with no fallback. This is separate from the QpiAI SDK run.</li>
        </ul>
        <p className="mt-3 text-[11px] text-[#68756f]">Sources: docs/V1-RUNBOOK.md · artifacts/india_eta_vqc4_run2/independent_frozen_acceptance.json · TERRA-CHECKPOINT.md</p>
        <div className="mt-4 border-t border-[#e2e9e4] pt-3">
          <h3 className="mb-2 text-[12px] font-semibold text-[#20352b]">QAOA jobs returned by this backend</h3>
          {jobs.length ? <div className="arq-table-scroll"><table className="arq-table"><thead><tr><th>Job</th><th>Status</th><th>Execution type</th><th>Runtime</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td>{job.id}</td><td>{job.status}</td><td>{job.execution_type}</td><td>{job.elapsed_seconds === null ? 'Unavailable' : `${job.elapsed_seconds.toFixed(2)} s`}</td></tr>)}</tbody></table></div> : <EmptyState title="No QAOA job record returned">Historical run evidence above is from the cited local reports. The current jobs endpoint supplied no QAOA records.</EmptyState>}
        </div>
      </Panel>
    </div>

    <Panel title="API evidence and limits" action={<Badge tone="neutral">Backend record</Badge>}>
      {evidence ? <div className="grid gap-2 text-[13px] sm:grid-cols-3"><div><b>Calibration Brier:</b> {evidence.brier_score ?? 'Unavailable'}</div><div><b>Calibration points:</b> {evidence.calibration_points.length || 'None returned'}</div><div><b>Dispatch benchmarks:</b> {evidence.benchmarks.length || 'None returned'}</div></div> : <EmptyState title="Backend evidence is unavailable">The intelligence evidence request did not return a valid record. Artifact-backed ETA measurements above are separate saved research evidence.</EmptyState>}
      {evidence && <p className="mt-2 text-[12px] text-[#596a60]">{evidence.disclaimer}</p>}
      <p className="mt-2 text-[11px] text-[#68756f]">Calibration, dispatch benchmark, authenticated cloud execution, and QPU evidence are unavailable here. No values are inferred from the browser or from measurement counts.</p>
    </Panel>
  </main>;
}
