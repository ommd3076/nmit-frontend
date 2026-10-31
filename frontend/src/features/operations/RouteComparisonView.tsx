import { useMemo, useState } from 'react';
import { Check, ChevronRight, Clock3, Route as RouteIcon, ShieldCheck } from 'lucide-react';
import { dispatchApi, type DriverState, type Proposal } from '../../api/dispatch';
import { Badge, EmptyState, ErrorState, Panel } from './primitives';
import type { useOperations } from './useOperations';

type Operations = ReturnType<typeof useOperations>;
type Point = [number, number];
type GeoJson = { geometry?: { type?: string; coordinates?: unknown } };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const nested = (proposal: Proposal) => record(proposal.proposal);
const value = (p: Proposal, key: string) => nested(p)[key] ?? p[key];
const text = (v: unknown, fallback = 'Unavailable') => typeof v === 'string' && v.trim() ? v : fallback;
const finite = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;
function geometry(v: unknown): Point[] {
  const root = record(v) as GeoJson;
  const source = Array.isArray(root.geometry?.coordinates) ? root.geometry.coordinates : Array.isArray(v) ? v : [];
  const valid = (point: unknown): point is Point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
  return source.every(valid) ? source as Point[] : [];
}
function duration(seconds: number | null) { return seconds === null ? 'Unavailable' : `${(seconds / 60).toFixed(1)} min`; }

function RouteOverlay({ current, candidate }: { current: Point[]; candidate: Point[] }) {
  const coords = [...current, ...candidate];
  if (current.length < 2 || candidate.length < 2 || !coords.length) return <div className="arq-map-wrap"><EmptyState title="Route overlay unavailable">The selected records do not both include valid route geometry. No route is interpolated or substituted.</EmptyState></div>;
  const xs = coords.map(([x]) => x), ys = coords.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const project = (points: Point[]) => points.map(([x, y]) => `${8 + ((x - minX) / (maxX - minX || 1)) * 84},${92 - ((y - minY) / (maxY - minY || 1)) * 84}`).join(' ');
  return <div className="arq-map-wrap" aria-label="Route geometry comparison">
    <svg viewBox="0 0 100 100" role="img" aria-label="Current and candidate route geometry from dispatcher API" style={{ width: '100%', height: '100%', minHeight: 260, background: '#f7f9fa', borderRadius: 12 }}>
      <polyline aria-label="Current route" points={project(current)} fill="none" stroke="#527f90" strokeWidth="1.6" strokeDasharray="2.5 1.5" vectorEffect="non-scaling-stroke" />
      <polyline aria-label="Candidate route" points={project(candidate)} fill="none" stroke="#2f5bea" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      {[['Current', '#527f90'], ['Candidate', '#2f5bea']].map(([label, color]) => <g key={label}><circle cx={8} cy={8 + (label === 'Candidate' ? 6 : 0)} r="1.3" fill={color} /><text x={12} y={9 + (label === 'Candidate' ? 6 : 0)} fontSize="3.4" fill="#24303b">{label}</text></g>)}
    </svg>
    <small className="arq-panel-caption">API GeoJSON coordinates · [longitude, latitude]</small>
  </div>;
}

export function RouteComparisonView({ operations }: { operations: Operations }) {
  const proposals = operations.drivers?.proposals ?? [];
  const pending = proposals.filter((p) => p.status === 'pending');
  const [selectedId, setSelectedId] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = pending.find((p) => (p.proposal_id || p.id || '') === selectedId) ?? pending[0] ?? null;
  const vehicleId = String(value(selected || ({} as Proposal), 'vehicle_id') || selected?.vehicle_id || '');
  const currentState = operations.drivers?.states.find((s) => s.vehicle_id === vehicleId) ?? null;
  const currentDuration = finite(value(selected || ({} as Proposal), 'current_duration_seconds')) ?? (currentState ? finite(currentState.estimated_duration_seconds) : null);
  const proposedDuration = finite(value(selected || ({} as Proposal), 'proposed_duration_seconds'));
  const saved = finite(value(selected || ({} as Proposal), 'time_saved_seconds')) ?? (currentDuration !== null && proposedDuration !== null ? currentDuration - proposedDuration : null);
  const candidateGeo = geometry(value(selected || ({} as Proposal), 'proposed_route_geojson') ?? selected?.geojson);
  const currentGeo = geometry(currentState?.geojson);
  const validation = record(value(selected || ({} as Proposal), 'validation'));
  const validationStatus = typeof validation.valid === 'boolean' ? (validation.valid ? 'Candidate checks passed' : 'Candidate checks failed') : 'Not independently verified';

  const metrics = useMemo(() => [
    { label: 'Travel duration', current: duration(currentDuration), candidate: duration(proposedDuration), delta: saved === null ? 'Unavailable' : `${Math.abs(saved / 60).toFixed(1)} min ${saved >= 0 ? 'shorter' : 'longer'}` },
    { label: 'SLA lateness', current: 'Unavailable', candidate: 'Unavailable', delta: 'No SLA fields in this API record' },
    { label: 'Cost exposure', current: 'Unavailable', candidate: 'Unavailable', delta: 'No financial objective in this API record' },
    { label: 'Feasibility', current: currentState ? 'Catalog route active' : 'Unavailable', candidate: validationStatus, delta: 'Capacity, service windows and financial feasibility unavailable' },
  ], [currentDuration, proposedDuration, saved, currentState, validationStatus]);

  async function approve() {
    const id = selected?.proposal_id || selected?.id;
    if (!id || selected?.status !== 'pending') return;
    setBusy(true); setError(''); setNotice('');
    try {
      await dispatchApi.approve(id);
      setConfirming(false);
      setNotice('The backend accepted the approval and returned the updated manifest.');
      await operations.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Approval failed.'); }
    finally { setBusy(false); }
  }

  return <div className="arq-page">
    <div className="arq-page-heading"><div><span className="arq-eyebrow">OPERATIONS / DISPATCH</span><h1>Route comparison</h1><p>Current manifest against a backend proposal</p></div><button className="arq-button arq-button-secondary" onClick={() => void operations.refresh()}>Refresh proposals</button></div>
    {error && <ErrorState>{error}</ErrorState>}{notice && <div className="arq-notice" role="status"><Check size={16}/>{notice}</div>}
    {!pending.length ? <Panel><EmptyState title={operations.busy ? 'Loading proposals' : 'No pending route proposals'}>A dispatcher comparison appears here after the backend records a route proposal. No candidate data is generated in the browser.</EmptyState></Panel> : <>
      <Panel title="Pending proposals" action={<Badge tone="warning">{pending.length} awaiting review</Badge>}>
        <div className="arq-route-list">{pending.map((proposal) => {
          const id = proposal.proposal_id || proposal.id || '';
          return <button className={`arq-route-row ${selected?.proposal_id === proposal.proposal_id || selected?.id === proposal.id ? 'selected' : ''}`} key={id} aria-pressed={id === (selected?.proposal_id || selected?.id)} onClick={() => { setSelectedId(id); setConfirming(false); setError(''); }}>
            <span className="arq-route-index"><RouteIcon size={16}/></span><span className="arq-route-info"><strong>{text(value(proposal, 'vehicle_id'), proposal.vehicle_id)}</strong><small>{text(value(proposal, 'current_route_id'), 'Current route')} <ChevronRight size={13}/> {text(value(proposal, 'proposed_route_id'), 'Candidate route')}</small></span><Badge tone="warning">Pending</Badge>
          </button>;
        })}</div>
      </Panel>
      {selected && <>
        <Panel title="Current route vs candidate" action={<Badge tone="preview">Preview</Badge>}>
          <div className="arq-comparison-grid" role="table" aria-label="Current route and candidate metrics" style={{ overflowX: 'auto' }}>
            <div role="row" className="arq-list-line" style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1.2fr) repeat(3, minmax(105px, 1fr))', minWidth: 560, gap: 12 }}><strong role="columnheader">Metric</strong><strong role="columnheader">Current</strong><strong role="columnheader">Candidate</strong><strong role="columnheader">Difference / evidence</strong></div>
            {metrics.map((metric) => <div role="row" className="arq-mini-metrics" key={metric.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1.2fr) repeat(3, minmax(105px, 1fr))', minWidth: 560, gap: 12, alignItems: 'center' }}><span role="rowheader">{metric.label}</span><b role="cell">{metric.current}</b><b role="cell">{metric.candidate}</b><small role="cell">{metric.delta}</small></div>)}
          </div>
          <div className="arq-note"><Clock3 size={15}/> {saved === null ? 'Duration gap unavailable' : `${Math.abs(saved / 60).toFixed(1)} min ${saved >= 0 ? 'shorter' : 'longer'} in the proposal record`}. No speed-up claimed.</div>
        </Panel>
        <Panel title="Route geometry overlay"><RouteOverlay current={currentGeo} candidate={candidateGeo}/></Panel>
        <div className="arq-source-note"><span className="arq-source-dot"/>Source: dispatcher proposal and active manifest API. Route catalog geometry and duration are proposal inputs; SLA, rupee exposure, capacity and full dispatch feasibility are unavailable.</div>
        {selected.status === 'pending' && <button className="arq-button primary" onClick={() => { setError(''); setConfirming(true); }}><ShieldCheck size={16}/>Review approval</button>}
        {confirming && <section className="arq-panel" role="dialog" aria-modal="true" aria-labelledby="approval-title"><header className="arq-panel-head"><h2 id="approval-title">Confirm route approval</h2></header><p>This calls the dispatcher approval API for proposal {selected.proposal_id || selected.id}. The server rechecks proposal validity and route version before publishing.</p><div className="arq-note">Approval validation does not establish capacity, SLA windows, financial feasibility, or live traffic conditions.</div><div className="arq-dialog-actions"><button className="arq-button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button><button className="arq-button primary" disabled={busy} onClick={() => void approve()}>{busy ? 'Waiting for backend…' : 'Confirm & publish'}</button></div></section>}
      </>}
    </>}
  </div>;
}
