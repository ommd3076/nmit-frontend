import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, ChartNoAxesCombined, IndianRupee, ShieldAlert } from 'lucide-react';
import { EvilCalibrationChart } from '../../components/charts/EvilCalibrationChart';
import { DataBadge } from '../../components/ui/DataBadge';
import type { PlanRun } from '../../types/api';
import type { useOperations } from './useOperations';
import { Badge, EmptyState, Metric, Panel } from './primitives';

type Operations = ReturnType<typeof useOperations>;
type CostPoint = { label: string; amount: number; source: string };

function objectiveCostInr(value: string | undefined): number | null {
  if (!value) return null;
  // Only chart explicitly INR/₹ values. Unlabelled amounts or other currencies
  // cannot safely be compared with the plan's INR exposure.
  if (!/(₹|\bINR\b)/i.test(value)) return null;
  const numeric = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(numeric)) return null;
  const amount = Number(numeric);
  return Number.isFinite(amount) ? amount : null;
}

function PlanTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: CostPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="rounded-lg border border-[#dce6df] bg-white px-3 py-2 text-[13px] text-[#20352b] shadow-sm">
    <p className="font-medium">{point.label}</p>
    <p className="tabular-nums">SLA exposure: <strong>₹{point.amount.toLocaleString('en-IN')}</strong></p>
    <p className="text-[11px] text-[#596a60]">{point.source}</p>
  </div>;
}

function exposureData(plans: PlanRun[]): CostPoint[] {
  return plans
    .filter((plan) => Number.isFinite(plan.total_sla_exposure_inr))
    .map((plan) => ({
      label: plan.scenario_name || plan.id,
      amount: plan.total_sla_exposure_inr,
      source: `${plan.id} · ${plan.assumed_rate_label}`,
    }));
}

function costData(plans: PlanRun[]): CostPoint[] {
  return plans.flatMap((plan) => {
    const amount = objectiveCostInr(plan.objective_cost);
    return amount === null ? [] : [{ label: plan.scenario_name || plan.id, amount, source: `${plan.id} · objective cost` }];
  });
}

function BenchmarkChart({ data }: { data: Array<{ engine: string; gap_to_optimum_pct: number }> }) {
  const points = data.filter((item) => Number.isFinite(item.gap_to_optimum_pct));
  if (!points.length) return <EmptyState title="No benchmark comparison recorded">The backend has not supplied measured optimality gaps.</EmptyState>;
  return <div className="h-64 min-h-56 w-full" role="img" aria-label="Recorded benchmark gap to optimum by engine, in percent">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={points} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 8 }}>
        <defs><linearGradient id="analytics-gap" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#326c50" stopOpacity={0.92}/><stop offset="100%" stopColor="#7c9b83" stopOpacity={0.72}/></linearGradient></defs>
        <CartesianGrid stroke="#e2e9e4" horizontal={false}/>
        <XAxis type="number" tick={{ fill: '#596a60', fontSize: 12 }} tickFormatter={(value: number) => `${value}%`}/>
        <YAxis type="category" dataKey="engine" width={112} tick={{ fill: '#42574b', fontSize: 12 }}/>
        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Gap to optimum']}/>
        <Bar dataKey="gap_to_optimum_pct" name="Gap to optimum" fill="url(#analytics-gap)" radius={[0, 4, 4, 0]} isAnimationActive={false}/>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

function PlanChart({ data, title, description }: { data: CostPoint[]; title: string; description: string }) {
  return <Panel title={title} action={<span className="arq-panel-caption">₹ INR</span>}>
    <p className="mb-3 text-[12px] text-[#596a60]">{description}</p>
    {data.length ? <div className="h-64 min-h-56 w-full" role="img" aria-label={`${title}, values in Indian rupees`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 18, bottom: 8, left: 8 }}>
          <defs><linearGradient id={`analytics-${title.includes('cost') ? 'cost' : 'exposure'}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#326c50" stopOpacity={0.92}/><stop offset="100%" stopColor="#7c9b83" stopOpacity={0.72}/></linearGradient></defs>
          <CartesianGrid stroke="#e2e9e4" vertical={false}/>
          <XAxis dataKey="label" tick={{ fill: '#596a60', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48}/>
          <YAxis tick={{ fill: '#596a60', fontSize: 11 }} tickFormatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} width={84}/>
          <Tooltip content={<PlanTooltip/>}/>
          <Bar dataKey="amount" fill={`url(#analytics-${title.includes('cost') ? 'cost' : 'exposure'})`} radius={[4, 4, 0, 0]} isAnimationActive={false}/>
        </BarChart>
      </ResponsiveContainer>
    </div> : <EmptyState title={title.includes('cost') ? 'No rupee-denominated objective costs recorded' : 'No plan exposure records'}>
      {title.includes('cost') ? 'Only objective costs explicitly labelled ₹ or INR can be charted.' : 'A backend plan record with SLA exposure is needed for this chart.'}
    </EmptyState>}
  </Panel>;
}

export function AnalyticsView({ operations }: { operations: Operations }) {
  const plans = operations.plans;
  const exposure = useMemo(() => exposureData(plans), [plans]);
  const costs = useMemo(() => costData(plans), [plans]);
  const evidence = operations.evidence;
  const measuredJobs = operations.jobs.filter((job) => job.elapsed_seconds !== null && Number.isFinite(job.elapsed_seconds));
  const totalExposure = plans.reduce((sum, plan) => sum + (Number.isFinite(plan.total_sla_exposure_inr) ? plan.total_sla_exposure_inr : 0), 0);

  return <div className="arq-page">
    <div className="arq-page-heading"><div><span className="arq-eyebrow">INTELLIGENCE / ANALYTICS</span><h1>Analytics</h1><p>Measured plan outcomes, solver runs, and model evidence from the local API.</p></div><button className="arq-button arq-button-secondary" onClick={operations.refresh}>Refresh records</button></div>

    <div className="arq-command-metrics">
      <Metric label="Plan records" value={plans.length} note="Backend run catalog" icon={<ChartNoAxesCombined size={16}/>}/>
      <Metric label="Recorded SLA exposure" value={plans.length ? `₹${totalExposure.toLocaleString('en-IN')}` : 'Unavailable'} note={plans.length ? 'Sum across returned plan records' : 'No plan records supplied'} icon={<ShieldAlert size={16}/>}/>
      <Metric label="Measured job runtimes" value={measuredJobs.length} note="Jobs with observed elapsed seconds" icon={<Activity size={16}/>}/>
      <Metric label="Benchmark engines" value={evidence?.benchmarks.length ?? 'Unavailable'} note="Measured comparison rows from API evidence" icon={<IndianRupee size={16}/>}/>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <PlanChart data={exposure} title="Recorded SLA exposure by plan" description="Reported exposure amounts from backend plan records. Each plan retains its assumed rate label."/>
      <PlanChart data={costs} title="Recorded objective cost by plan" description="Only objective costs explicitly denominated in rupees are plotted; values are not inferred from exposure."/>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel title="Solver benchmark gap" action={<Badge tone="neutral">No speed-up claimed</Badge>}>
        <p className="mb-3 text-[12px] text-[#596a60]">Measured gap to optimum (%) from the attached API model evidence.</p>
        {evidence ? <BenchmarkChart data={evidence.benchmarks}/> : <EmptyState title="Model evidence unavailable">The backend has not supplied benchmark artifacts.</EmptyState>}
      </Panel>
      <Panel title="Calibration evidence" action={evidence ? <Badge tone="neutral">{evidence.model_name}</Badge> : <Badge tone="neutral">Unavailable</Badge>}>
        <p className="mb-3 text-[12px] text-[#596a60]">Held-out reliability points and Brier score are shown only when reported by the backend.</p>
        {evidence ? <>
          <div className="mb-3 flex items-baseline justify-between rounded-lg border border-[#dce6df] bg-[#f7f9f7] px-3 py-2"><span className="text-[12px] text-[#42574b]">Brier score</span><strong className="tabular-nums text-[#20352b]">{evidence.brier_score ?? 'Unmeasured'}</strong></div>
          <EvilCalibrationChart data={evidence.calibration_points}/>
        </> : <EmptyState title="Calibration evidence unavailable">The backend has not supplied model evaluation artifacts.</EmptyState>}
      </Panel>
    </div>

    <Panel title="Plan and solver records" action={<span className="arq-panel-caption">Source records</span>}>
      {plans.length ? <div className="arq-table-scroll"><table className="arq-table"><thead><tr><th>Plan / scenario</th><th>Source</th><th>Validation</th><th>SLA exposure (₹)</th><th>Objective cost</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><b>{plan.scenario_name}</b><span className="arq-cell-title">{plan.id}</span></td><td><DataBadge badge={plan.provenance_badge} size="sm"/></td><td><Badge tone={plan.validator_result.passed ? 'good' : 'warning'}>{plan.validator_result.passed ? 'Validator passed' : 'Validator failed'}</Badge></td><td className="tabular-nums">₹{plan.total_sla_exposure_inr.toLocaleString('en-IN')}<small>{plan.assumed_rate_label}</small></td><td className="tabular-nums">{plan.objective_cost ?? 'Unavailable'}</td></tr>)}</tbody></table></div> : <EmptyState title={operations.busy ? 'Loading plan records' : 'No plan records supplied'}>Plan history is shown when the backend returns run records. No sample values are substituted.</EmptyState>}
      {operations.jobs.length > 0 && <div className="mt-4 overflow-x-auto"><table className="arq-table"><thead><tr><th>Job</th><th>Engine</th><th>Status</th><th>Runtime</th><th>Execution</th></tr></thead><tbody>{operations.jobs.map((job) => <tr key={job.id}><td><b>{job.id}</b></td><td>{job.engine}</td><td><Badge tone={job.status === 'succeeded' ? 'good' : job.status === 'failed' || job.status === 'timed_out' ? 'warning' : ''}>{job.status}</Badge></td><td className="tabular-nums">{job.elapsed_seconds === null ? 'Unavailable' : `${job.elapsed_seconds.toFixed(2)} s`}</td><td>{job.execution_type}</td></tr>)}</tbody></table></div>}
    </Panel>
  </div>;
}
