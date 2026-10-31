import { useMemo } from 'react';
import { Activity, ArrowUpRight, LocateFixed, MapPinned, Route as RouteIcon, ShieldAlert, Truck } from 'lucide-react';
import { RouteMap } from '../../components/map/RouteMap';
import type { AuditEntry, Proposal } from '../../api/dispatch';
import type { PlanRun } from '../../types/api';
import type { useOperations } from './useOperations';
import { Badge, EmptyState, Metric, Panel } from './primitives';
import { driverMapPlan } from './adapter';
import arqRouteEditorial from '../../assets/brand/arq-route-editorial.png';

export type NavView = 'command'|'map'|'dispatch'|'compare'|'fleet'|'driver'|'orders'|'analytics'|'diagnostics'|'recovery';
type Operations = ReturnType<typeof useOperations>;

function proposalReason(proposal: Proposal) {
  const details = proposal.proposal;
  if (details && typeof details === 'object' && 'reason' in details && typeof details.reason === 'string') return details.reason;
  if (typeof proposal.reason === 'string') return proposal.reason;
  return 'Route proposal awaiting dispatcher review';
}

function activitySummary(event: AuditEntry) {
  const payload = event.payload;
  const severity = typeof payload.severity === 'string' ? `${payload.severity} report` : '';
  const decision = payload.decision && typeof payload.decision === 'object' && 'decision' in payload.decision
    ? String(payload.decision.decision)
    : '';
  return [severity, decision].filter(Boolean).join(' · ') || event.principal;
}

function eventTime(event: AuditEntry) {
  const value = event.created_at || event.timestamp;
  if (!value || !Number.isFinite(Date.parse(value))) return 'Time unavailable';
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}

export function CommandMapView({ operations, mode = 'command', search, selectedVehicleId, selectedStopId, onSelectVehicle, onSelectStop }: {
  operations: Operations; mode?: 'command'|'map'; search: string; selectedVehicleId: string|null; selectedStopId: string|null;
  onSelectVehicle: (id:string)=>void; onSelectStop:(id:string)=>void;
}) {
  const states = operations.drivers?.states ?? [];
  const proposals = operations.drivers?.proposals ?? [];
  const pendingProposals = proposals.filter((proposal) => proposal.status.toLowerCase() === 'pending');
  const recentActivity = operations.audits.slice(0, 4);
  const plan: PlanRun|null = useMemo(() => states.length ? driverMapPlan(states) : null, [states]);
  const stops = plan?.routes.flatMap((route) => route.stops) ?? [];
  const query = search.trim().toLowerCase();
  const filtered = stops.filter((stop) => `${stop.customer_name} ${stop.address} ${stop.id}`.toLowerCase().includes(query));
  const visibleStops = filtered.filter((stop) => !selectedVehicleId || stop.vehicle_id === selectedVehicleId);
  const activeVehicles = states.filter((state) => /active|en.?route|in.?progress/i.test(state.status)).length;

  if (!plan) return <div className="arq-page"><div className="arq-page-heading"><div><span className="arq-eyebrow">OPERATIONS / {mode==='map'?'MAP':'OVERVIEW'}</span><h1>{mode==='map'?'Live map':'Command center'}</h1><p>Dispatcher state will appear here when the API is available.</p></div></div><Panel className="arq-empty-panel"><div className="arq-empty-story"><img src={arqRouteEditorial} alt="Decorative route illustration; not live fleet data." loading="lazy" decoding="async" fetchPriority="low"/><div><EmptyState title={operations.busy?'Connecting to dispatcher API':'No dispatcher catalog available'}>The map and operational counts appear when dispatcher state is available. No sample fleet is substituted.</EmptyState></div></div></Panel></div>;

  const selected = plan.vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  return <div className={`arq-page arq-command-page ${mode==='map'?'map-only':''}`}>
    <div className="arq-page-heading">
      <div><span className="arq-eyebrow">OPERATIONS / {mode==='map'?'MAP':'OVERVIEW'}</span><h1>{mode==='map'?'Fleet map':'Command center'}</h1><p>South Delhi · Gurgaon corridor <Badge tone="preview">{plan.provenance_badge}</Badge></p></div>
      <div className="arq-heading-actions"><span className="arq-last-updated">{operations.lastSync ? `Updated ${new Date(operations.lastSync).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'})} IST` : 'Awaiting sync'}</span><button className="arq-button arq-button-secondary" onClick={operations.refresh}><LocateFixed size={15}/> Refresh state</button></div>
    </div>

    {mode==='command' && <div className="arq-command-metrics"><Metric label="Catalog vehicles" value={states.length} note="Dispatcher state" icon={<Truck size={16}/>}/><Metric label="Active" value={activeVehicles} note="Status reported by backend" icon={<ArrowUpRight size={16}/>}/><Metric label="Pending proposals" value={pendingProposals.length} note="Awaiting dispatcher review" icon={<ShieldAlert size={16}/>}/><Metric label="Recent events" value={operations.audits.length} note="Persistent audit records" icon={<Activity size={16}/>}/></div>}

    <div className="arq-command-grid">
      <Panel title="Fleet routes" action={<span className="arq-panel-caption">{states.length} vehicles · dispatcher catalog</span>} className="arq-map-panel">
        <div className="arq-map-wrap"><RouteMap plan={plan} selectedVehicleId={selectedVehicleId} selectedStopId={selectedStopId} onSelectVehicle={onSelectVehicle} onSelectStop={onSelectStop}/><div className="arq-map-credit">OpenFreeMap · Route geometry from dispatcher catalog</div></div>
      </Panel>
      <div className="arq-command-side">
        <Panel title="Vehicles" action={<Badge tone="neutral">{states.length}</Badge>}>
          <div className="arq-route-list">{states.map((state,index)=><button className={`arq-route-row ${selectedVehicleId===state.vehicle_id?'selected':''}`} key={state.route_id} onClick={()=>onSelectVehicle(state.vehicle_id)} aria-pressed={selectedVehicleId===state.vehicle_id}>
            <span className="arq-route-index">{String(index+1).padStart(2,'0')}</span><span className="arq-route-info"><strong>{state.vehicle_id}</strong><small>{state.driver_id} · {state.stops.length} stops</small></span><Badge tone={/active|route/i.test(state.status)?'green':'neutral'}>{state.status}</Badge>
          </button>)}</div>
        </Panel>
        <Panel title="Selected vehicle">{selected ? <div className="arq-selected-card"><div className="arq-selected-head"><span className="arq-vehicle-glyph"><Truck size={18}/></span><div><strong>{selected.callsign}</strong><small>{selected.driver_name}</small></div><ArrowUpRight size={16}/></div><div className="arq-selected-stats"><div><small>Route</small><b>{selected.route_id}</b></div><div><small>Assigned stops</small><b>{selected.assigned_stops_count}</b></div></div><button className="arq-link-button" onClick={()=>onSelectVehicle(selected.id)}>Inspect route <ArrowUpRight size={14}/></button></div>:<EmptyState title="Choose a vehicle">Select a vehicle to inspect its manifest.</EmptyState>}</Panel>
      </div>
    </div>

    {mode==='command' && <div className="arq-command-activity">
      <Panel title="Pending incident proposals" action={<Badge tone={pendingProposals.length ? 'amber' : 'neutral'}>{pendingProposals.length} pending</Badge>} className="arq-command-summary">
        {!pendingProposals.length ? <p className="arq-activity-empty">No pending route proposals in dispatcher state.</p> : <ul className="arq-activity-list">{pendingProposals.slice(0,3).map((proposal,index)=><li key={proposal.proposal_id || proposal.id || `${proposal.vehicle_id}-${index}`}><span className="arq-activity-icon"><ShieldAlert size={15}/></span><div><strong>{proposal.vehicle_id}</strong><p>{proposalReason(proposal)}</p></div><a className="arq-link-button" href="#/compare">Review</a></li>)}</ul>}
      </Panel>
      <Panel title="Recent activity" action={<span className="arq-panel-caption">Persistent audit trail</span>} className="arq-command-summary">
        {!recentActivity.length ? <p className="arq-activity-empty">No operational events recorded yet.</p> : <ul className="arq-activity-list">{recentActivity.map((event,index)=><li key={event.id || `${event.event_type}-${index}`}><span className="arq-activity-icon"><Activity size={15}/></span><div><strong>{event.event_type.replaceAll('_',' ')}</strong><p>{activitySummary(event)}</p></div><time>{eventTime(event)}</time></li>)}</ul>}
      </Panel>
    </div>}

    {mode==='command' && <Panel title={selectedVehicleId ? `Stops · ${selectedVehicleId}` : 'All route stops'} action={<span className="arq-panel-caption">Select a stop to focus it on the map</span>} className="arq-stop-table-panel"><div className="arq-table-scroll"><table className="arq-table"><thead><tr><th>Stop</th><th>Location</th><th>Window / ETA</th><th>Status</th><th>Vehicle</th></tr></thead><tbody>{visibleStops.map((stop)=><tr key={stop.id} className={selectedStopId===stop.id?'row-selected':''} onClick={()=>{onSelectStop(stop.id);onSelectVehicle(stop.vehicle_id);}} tabIndex={0} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelectStop(stop.id);onSelectVehicle(stop.vehicle_id);}}}><td><b>{String(stop.sequence_idx).padStart(2,'0')}</b><span className="arq-cell-title">{stop.customer_name}</span></td><td>{stop.address}</td><td>Unavailable</td><td><Badge tone="neutral">{stop.status}</Badge></td><td>{stop.vehicle_id}</td></tr>)}</tbody></table>{visibleStops.length===0&&<EmptyState title={query?'No matching stops':'No stops on this route'}>{query?'Adjust the search to see the current manifest.':'Choose another vehicle or review the dispatcher catalog.'}</EmptyState>}</div></Panel>}

    <div className="arq-source-note"><span className="arq-source-dot"/>Catalog state · Vehicles, stops, proposals, and activity come from dispatcher records. GPS, service windows, demand, ETA, and lateness risk are unavailable.</div>
  </div>;
}
