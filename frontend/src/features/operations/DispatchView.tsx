import { useEffect, useRef, useState, type ReactElement } from 'react';
import { dispatchRequest, type Scenario } from '../../api/dispatch';
import { Badge, ErrorState, Panel } from './primitives';

type Job = { id: string; status: string; result?: unknown; error?: { code?: string; message?: string } | null; metadata?: Record<string, unknown> };
type Validation = { valid: boolean; errors: string[]; execution_type?: string };
const starter: Scenario = {
  depot: 'D', vehicles: [{ id: 'V1', capacity: 3 }, { id: 'V2', capacity: 2 }],
  orders: [
    { id: 'A', demand: 2, window: [0, 5], service: 1, penalty: 4 },
    { id: 'B', demand: 1, window: [0, 4], service: 1, penalty: 2 },
    { id: 'C', demand: 2, window: [0, 20], service: 1, penalty: 1 },
  ],
  travel: { D: { D: 0, A: 2, B: 1, C: 3 }, A: { D: 2, A: 0, B: 1, C: 2 }, B: { D: 1, A: 1, B: 0, C: 2 }, C: { D: 3, A: 2, B: 2, C: 0 } },
};
const terminal = new Set(['succeeded', 'failed', 'infeasible', 'cancelled', 'timed_out']);
const cell: React.CSSProperties = { display: 'grid', gap: 5, color: '#59675f', fontSize: 11 };
const input: React.CSSProperties = { width: '100%', padding: '8px 9px', border: '1px solid #dfe5df', borderRadius: 7, background: 'white', color: '#25352b', font: 'inherit' };

export function DispatchView(): ReactElement {
  const [scenario, setScenario] = useState<Scenario>(() => structuredClone(starter));
  const [engine, setEngine] = useState<'exact' | 'qaoa'>('exact');
  const [validation, setValidation] = useState<Validation | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; generation.current++; activeRequest.current?.abort(); if (pollTimer.current) clearTimeout(pollTimer.current); }; }, []);
  const patchScenario = (patch: Partial<Scenario>) => { setScenario(s => {
    const next = { ...s, ...patch };
    const previousTravel = patch.travel ?? s.travel;
    const places = [next.depot, ...next.orders.map(o => o.id)];
    const travel: Scenario['travel'] = {};
    for (const from of places) { travel[from] = {}; for (const to of places) travel[from][to] = from === to ? 0 : (previousTravel[from]?.[to] ?? 1); }
    return { ...next, travel };
  }); setValidation(null); };
  const setVehicle = (i: number, key: 'id' | 'capacity', value: string) => patchScenario({ vehicles: scenario.vehicles.map((v, n) => n === i ? { ...v, [key]: key === 'capacity' ? Number(value) : value } : v) });
  const setOrder = (i: number, key: 'id' | 'demand' | 'open' | 'close' | 'service' | 'penalty', value: string) => patchScenario({ orders: scenario.orders.map((o, n) => n !== i ? o : key === 'open' || key === 'close' ? { ...o, window: key === 'open' ? [Number(value), o.window[1]] : [o.window[0], Number(value)] } : { ...o, [key]: key === 'id' ? value : Number(value) }) });

  const poll = async (id: string, runId: number) => {
    if (!alive.current || generation.current !== runId) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const current = await dispatchRequest<Job>(`/jobs/${encodeURIComponent(id)}`, undefined, controller.signal);
      if (!alive.current || generation.current !== runId) return;
      setJob(current);
      if (!terminal.has(current.status)) pollTimer.current = setTimeout(() => void poll(id, runId), 1000);
    } catch (e) { if (alive.current && generation.current === runId && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not read backend job status.'); }
    finally { if (activeRequest.current === controller) activeRequest.current = null; }
  };
  const run = async () => {
    const runId = ++generation.current;
    activeRequest.current?.abort();
    if (pollTimer.current) clearTimeout(pollTimer.current);
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true); setError(''); setJob(null); setValidation(null);
    try {
      const check = await dispatchRequest<Validation>('/scenarios/validate', scenario, controller.signal);
      if (!alive.current || generation.current !== runId) return;
      setValidation(check);
      if (!check.valid) return;
      const submitted = engine === 'exact'
        ? await dispatchRequest<{ id: string; status: string }>('/jobs', scenario, controller.signal)
        : await dispatchRequest<{ id: string; status: string }>('/jobs/qaoa', { scenario, seed: 7, shots: 128, warm_start: true, angle_grid: 4 }, controller.signal);
      if (!alive.current || generation.current !== runId) return;
      setJob(submitted);
      if (!terminal.has(submitted.status)) void poll(submitted.id, runId);
    } catch (e) { if (alive.current && generation.current === runId && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Dispatch request failed.'); }
    finally { if (alive.current && generation.current === runId) { if (activeRequest.current === controller) activeRequest.current = null; setBusy(false); } }
  };
  const cancel = async () => {
    if (!job) return;
    const runId = ++generation.current;
    activeRequest.current?.abort();
    if (pollTimer.current) clearTimeout(pollTimer.current);
    const controller = new AbortController(); activeRequest.current = controller;
    try { const cancelled = await dispatchRequest<Job>(`/jobs/${encodeURIComponent(job.id)}/cancel`, {}, controller.signal); if (alive.current && generation.current === runId) setJob(cancelled); }
    catch (e) { if (alive.current && generation.current === runId && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Cancellation failed.'); }
    finally { if (activeRequest.current === controller) activeRequest.current = null; }
  };
  const result = job?.result as Record<string, any> | undefined;
  const plan = result?.plan ?? result?.decision?.plan;
  const independent = result?.validation ?? result?.decision?.validation;
  const routes: Array<Record<string, any>> = Array.isArray(plan?.routes) ? plan.routes : [];

  return <div className="arq-page">
    <div className="arq-page-heading"><div><span className="arq-eyebrow">OPERATIONS / DISPATCH</span><h1>Dispatch planning</h1><p>Configure an input scenario, validate it with the backend, then inspect the solver job and independently checked result.</p></div><Badge tone="preview">Backend computed</Badge></div>
    {error && <ErrorState>{error}</ErrorState>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(310px, .9fr) minmax(350px, 1.1fr)', gap: 14, alignItems: 'start' }}>
      <Panel title="Scenario builder" action={<Badge>Editable input</Badge>}>
        <div style={{ padding: 15, display: 'grid', gap: 17 }}>
          <label style={cell}>Depot identifier<input style={input} value={scenario.depot} onChange={e => patchScenario({ depot: e.target.value })} /></label>
          <div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><strong>Vehicles and capacity</strong><button className="arq-button arq-button-secondary" onClick={() => patchScenario({ vehicles: [...scenario.vehicles, { id: `V${scenario.vehicles.length + 1}`, capacity: 3 }] })}>Add vehicle</button></div>
            {scenario.vehicles.map((v, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 7 }}><label style={cell}>Vehicle ID<input style={input} value={v.id} onChange={e => setVehicle(i, 'id', e.target.value)} /></label><label style={cell}>Capacity<input style={input} type="number" min="0" value={v.capacity} onChange={e => setVehicle(i, 'capacity', e.target.value)} /></label><button aria-label={`Remove vehicle ${v.id}`} className="arq-button arq-button-secondary" disabled={scenario.vehicles.length < 2} onClick={() => patchScenario({ vehicles: scenario.vehicles.filter((_, n) => n !== i) })}>×</button></div>)}
          </div>
          <div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><strong>Delivery orders</strong><button className="arq-button arq-button-secondary" onClick={() => patchScenario({ orders: [...scenario.orders, { id: `O${scenario.orders.length + 1}`, demand: 1, window: [0, 60], service: 5, penalty: 1 }] })}>Add order</button></div>
            {scenario.orders.map((o, i) => <fieldset key={i} style={{ border: '1px solid #e8ece8', borderRadius: 8, padding: 9, margin: '0 0 8px' }}><legend style={{ fontSize: 10, color: '#738078' }}>{o.id || `Order ${i + 1}`}</legend><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
              {([['id','Order ID'],['demand','Demand'],['open','Window opens (min)'],['close','Window closes (min)'],['service','Service (min)'],['penalty','Late penalty']] as const).map(([key,label]) => <label key={key} style={cell}>{label}<input style={input} type={key === 'id' ? 'text' : 'number'} min={key === 'id' ? undefined : 0} value={key === 'open' ? o.window[0] : key === 'close' ? o.window[1] : o[key as 'id'|'demand'|'service'|'penalty']} onChange={e => setOrder(i, key, e.target.value)} /></label>)}
            </div><button style={{ marginTop: 7 }} aria-label={`Remove order ${o.id}`} className="arq-button arq-button-secondary" disabled={scenario.orders.length < 1} onClick={() => patchScenario({ orders: scenario.orders.filter((_, n) => n !== i) })}>Remove order</button></fieldset>)}
          </div>
          <details><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Travel matrix · minutes</summary><div style={{ overflowX: 'auto', marginTop: 8 }}><table className="arq-table"><thead><tr><th>From / to</th>{[scenario.depot, ...scenario.orders.map(o => o.id)].map((place, i) => <th key={`${place}-${i}`}>{place}</th>)}</tr></thead><tbody>{[scenario.depot, ...scenario.orders.map(o => o.id)].map((from, i) => <tr key={`${from}-${i}`}><th>{from}</th>{[scenario.depot, ...scenario.orders.map(o => o.id)].map((to, j) => <td key={`${to}-${j}`}><input aria-label={`Travel ${from} to ${to} minutes`} disabled={from === to} style={{ ...input, minWidth: 62, padding: 5 }} type="number" min="0" value={scenario.travel[from]?.[to] ?? 1} onChange={e => patchScenario({ travel: { ...scenario.travel, [from]: { ...scenario.travel[from], [to]: Number(e.target.value) } } })} /></td>)}</tr>)}</tbody></table></div></details>
          <label style={cell}>Planning algorithm<select style={input} value={engine} onChange={e => setEngine(e.target.value as 'exact'|'qaoa')}><option value="exact">Exact enumeration · local classical</option><option value="qaoa">Warm-start QAOA · local simulator</option></select></label>
          {engine === 'qaoa' && <small style={{ color: '#77847c' }}>Bounded backend settings: seed 7 · 128 shots · warm start · angle grid 4. The backend may reject scenarios beyond its supported route bound.</small>}
          <button className="arq-button primary" disabled={busy || (!!job && !terminal.has(job.status))} onClick={() => void run()}>{busy ? 'Submitting…' : 'Validate and run optimization'}</button>
          {validation && <div role="status" style={{ padding: 10, borderRadius: 8, background: validation.valid ? '#edf6ef' : '#fff2ed', color: validation.valid ? '#356347' : '#8c4030', fontSize: 11 }}><strong>{validation.valid ? 'Scenario valid' : 'Scenario rejected'}</strong>{validation.errors.map((x,i) => <div key={i}>{x}</div>)}</div>}
        </div>
      </Panel>
      <div style={{ display: 'grid', gap: 13 }}>
        <Panel title="Solver job" action={job && <Badge>{job.status}</Badge>}>
          <div style={{ padding: 15 }}>
            {!job ? <p style={{ color: '#758179', fontSize: 11 }}>No optimization job submitted. Validation and execution results will appear here.</p> : <><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div><strong>Job {job.id}</strong><div style={{ color: '#758179', fontSize: 10, marginTop: 4 }}>{String(job.metadata?.execution_type ?? (engine === 'qaoa' ? 'local_simulator' : 'local_classical'))} · {String(job.metadata?.solver ?? (engine === 'qaoa' ? 'warm-start QAOA' : 'exact enumeration'))}</div></div>{!terminal.has(job.status) && <button className="arq-button arq-button-secondary" onClick={() => void cancel()}>Cancel job</button>}</div>
            <p role="status" style={{ fontSize: 11, color: '#58665e' }}>{job.status === 'queued' ? 'Queued by backend; awaiting worker.' : job.status === 'running' ? 'Backend reports optimization running.' : job.status === 'succeeded' ? 'Backend job succeeded.' : `Backend job ${job.status}.`}</p>
            {job.error && <ErrorState>{job.error.message || job.error.code || 'Backend job failed.'}</ErrorState>}
            {job.metadata && <details><summary style={{ cursor: 'pointer', fontSize: 10 }}>Execution metadata</summary><pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, overflowWrap: 'anywhere' }}>{JSON.stringify(job.metadata, null, 2)}</pre></details>}
            </>}
          </div>
        </Panel>
        <Panel title="Candidate routes" action={independent && <Badge tone={independent.valid ? 'live' : 'warning'}>{independent.valid ? 'Independent validation passed' : 'Validation failed'}</Badge>}>
          <div style={{ padding: 15 }}>
            {plan && <div style={{ display: 'flex', gap: 22, padding: '0 0 12px', borderBottom: '1px solid #edf0ed', marginBottom: 12, fontSize: 11 }}><span>Objective (proxy units) <strong>{String(plan.objective ?? 'unavailable')}</strong></span><span>Travel (minutes) <strong>{String(plan.travel_cost ?? 'unavailable')}</strong></span><span>Late exposure (scenario units) <strong>{String(plan.lateness_exposure ?? 'unavailable')}</strong></span><span>Status <strong>{String(plan.status ?? 'unavailable')}</strong></span></div>}
            {!job ? <p style={{ color: '#758179', fontSize: 11 }}>Routes are shown only after a backend job returns a plan.</p> : job.status === 'succeeded' && !plan ? <p role="alert" style={{ color: '#8c4030', fontSize: 11 }}>Job succeeded without a recognized plan payload. No route output is inferred.</p> : routes.length === 0 ? <p style={{ color: '#758179', fontSize: 11 }}>{job.status === 'succeeded' ? 'The returned plan contains no assigned routes.' : 'Waiting for a completed backend result.'}</p> : <div style={{ display: 'grid', gap: 10 }}>{routes.map((route,i) => { const vehicleId = String(route.vehicle_id ?? route.vehicle ?? `Vehicle ${i + 1}`); const ids: string[] = Array.isArray(route.order_ids) ? route.order_ids : []; const demand = ids.reduce((sum, id) => sum + (scenario.orders.find(o => o.id === id)?.demand ?? 0), 0); const stops: Array<Record<string, any>> = Array.isArray(route.stops) ? route.stops : []; return <article key={vehicleId} style={{ border: '1px solid #e8ece8', borderRadius: 8, padding: 11 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{vehicleId}</strong><span style={{ color: '#758179', fontSize: 10 }}>Demand {demand} / {String(scenario.vehicles.find(v => v.id === vehicleId)?.capacity ?? 'capacity unavailable')}</span></div><ol style={{ margin: '9px 0 0', paddingLeft: 20, color: '#536159', fontSize: 11 }}>{stops.length ? stops.map((stop,j) => <li key={j}>{String(stop.order_id ?? stop.id ?? 'Stop')} · arrival {String(stop.arrival ?? 'unavailable')} min · service starts {String(stop.service_start ?? 'unavailable')} min · late {String(stop.lateness ?? 'unavailable')} min</li>) : ids.map((id,j) => <li key={j}>{id} · stop timing unavailable</li>)}</ol><small style={{ color: '#76827b' }}>Travel {String(route.travel_cost ?? route.travel_minutes ?? 'unavailable')} min · objective {String(route.objective ?? 'unavailable')} proxy units</small></article>; })}</div>}
            {independent && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, color: '#617067', marginTop: 10 }}>Validation recomputed by backend: {JSON.stringify(independent, null, 2)}</pre>}
          </div>
        </Panel>
      </div>
    </div>
    <style>{'@media(max-width:900px){.arq-page>div:nth-of-type(2){grid-template-columns:1fr!important}}'}</style>
  </div>;
}
