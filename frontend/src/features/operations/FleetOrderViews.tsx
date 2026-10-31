import { useMemo, useState } from 'react';
import { ArrowUpRight, ClipboardList, Route, Truck, UserRound } from 'lucide-react';
import { Badge, EmptyState, Panel } from './primitives';
import type { DriverState, DriverStop } from '../../api/dispatch';
import type { useOperations } from './useOperations';

type Operations = ReturnType<typeof useOperations>;
type Mode = 'fleet' | 'drivers' | 'orders';
type OrderRow = { state: DriverState; stop: DriverStop };
type SortKey = 'name' | 'status' | 'route' | 'version' | 'stops' | 'sequence';

const stamp = (value?: string | null) => value
  ? `${new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`
  : 'Unavailable';
const normalized = (value: string) => value.trim().toLocaleLowerCase();
const ackLabel = (state: DriverState) => {
  if (state.route_version > 0 && state.last_ack_version === state.route_version) return 'Current';
  if (state.last_ack_version <= 0) return 'Not acknowledged';
  if (state.last_ack_version > state.route_version) return `v${state.last_ack_version} reported (newer)`;
  return `v${state.last_ack_version} acknowledged`;
};
const ackTone = (state: DriverState): 'green' | 'amber' | 'neutral' =>
  state.route_version > 0 && state.last_ack_version === state.route_version ? 'green' : state.last_ack_version > state.route_version ? 'neutral' : 'amber';

export function FleetOrderView({ operations, mode, search, onOpenMap }: {
  operations: Operations;
  mode: Mode;
  search: string;
  onOpenMap: (vehicleId?: string, stopId?: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [inspectedVehicle, setInspectedVehicle] = useState<string | null>(null);
  const [inspectedStop, setInspectedStop] = useState<string | null>(null);
  const title: Record<Mode, string> = { fleet: 'Fleet', drivers: 'Drivers', orders: 'Orders' };
  const query = normalized(search);

  const states = useMemo(() => (operations.drivers?.states ?? []).filter((state) => {
    const stopText = state.stops.map((stop) => `${stop.name} ${stop.id} ${stop.status} ${stop.address ?? ''}`).join(' ');
    const searchable = `${state.vehicle_id} ${state.driver_id} ${state.route_id} ${state.corridor_id} ${state.status} ${stopText}`;
    return normalized(searchable).includes(query);
  }).sort((a, b) => {
    const cmp = (left: string | number, right: string | number) => typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
    const keys: Record<SortKey, (state: DriverState) => string | number> = {
      name: (state) => mode === 'drivers' ? state.driver_id : state.vehicle_id,
      status: (state) => state.status,
      route: (state) => state.route_id,
      version: (state) => state.route_version,
      stops: (state) => state.stops.length,
      sequence: (state) => state.stops[0]?.sequence ?? 0,
    };
    return cmp(keys[sortKey](a), keys[sortKey](b)) * (sortDirection === 'asc' ? 1 : -1);
  }), [operations.drivers?.states, query, mode, sortKey, sortDirection]);

  const orderRows = useMemo<OrderRow[]>(() => states.flatMap((state) => state.stops.map((stop) => ({ state, stop })))
    .sort((a, b) => {
      const cmp = (left: string | number, right: string | number) => typeof left === 'number' && typeof right === 'number'
        ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
      const value = sortKey === 'status' ? cmp(a.stop.status, b.stop.status)
        : sortKey === 'route' ? cmp(a.state.route_id, b.state.route_id)
          : sortKey === 'version' ? cmp(a.state.route_version, b.state.route_version)
            : sortKey === 'sequence' ? cmp(a.stop.sequence, b.stop.sequence)
              : cmp(a.stop.name, b.stop.name);
      return value * (sortDirection === 'asc' ? 1 : -1);
    }), [states, sortKey, sortDirection]);

  const selected = states.find((state) => state.vehicle_id === inspectedVehicle) ?? null;
  const selectedStop = selected?.stops.find((stop) => stop.id === inspectedStop) ?? null;
  const sortControl = <label className="arq-sort-control">Sort by <select aria-label="Sort records" value={sortKey} onChange={(event) => { setSortKey(event.target.value as SortKey); setSortDirection('asc'); }}>
    <option value="name">{mode === 'drivers' ? 'Driver' : mode === 'orders' ? 'Stop' : 'Vehicle'}</option><option value="status">Status</option><option value="route">Route</option><option value="version">Route version</option>{mode !== 'drivers' && <option value={mode === 'orders' ? 'sequence' : 'stops'}>{mode === 'orders' ? 'Sequence' : 'Stop count'}</option>}
  </select><button type="button" className="arq-link-button" aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`} onClick={() => setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</button></label>;

  if (!operations.drivers && operations.busy) return <div className="arq-page"><div className="arq-page-heading"><div><span className="arq-eyebrow">NETWORK / {mode.toUpperCase()}</span><h1>{title[mode]}</h1></div></div><Panel><EmptyState title="Loading dispatcher state">Records will appear when the dispatcher API responds.</EmptyState></Panel></div>;
  if (!states.length) return <div className="arq-page"><div className="arq-page-heading"><div><span className="arq-eyebrow">NETWORK / {mode.toUpperCase()}</span><h1>{title[mode]}</h1></div></div><Panel><EmptyState title={query ? 'No matching records' : 'No catalog records available'}>{query ? 'Adjust the search to see dispatcher records.' : 'Records are read from the dispatcher API. Profiles, contact details, capacity, and live GPS are unavailable.'}</EmptyState></Panel><p className="arq-source-note"><span className="arq-source-dot"/>Dispatcher catalog data</p></div>;

  return <div className="arq-page">
    <div className="arq-page-heading"><div><span className="arq-eyebrow">NETWORK / {mode.toUpperCase()}</span><h1>{title[mode]}</h1><p>{mode === 'fleet' ? 'Vehicles and routes in dispatcher state' : mode === 'drivers' ? 'Driver assignment and reported route acknowledgement' : 'Stops from active manifests'}</p></div><button className="arq-button arq-button-secondary" onClick={() => onOpenMap()}><Route size={15}/> Open map</button></div>
    {mode === 'fleet' && <Panel title="Fleet catalog" action={<>{sortControl}<span className="arq-panel-caption">{states.length} vehicles · source: dispatcher API</span></>}><div className="arq-fleet-grid">{states.map((state) => <article className="arq-fleet-card" key={state.vehicle_id}>
      <div className="arq-fleet-top"><span className="arq-vehicle-glyph"><Truck size={19}/></span><Badge tone={/active|route/i.test(state.status) ? 'green' : 'neutral'}>{state.status}</Badge></div><h3>{state.vehicle_id}</h3><p>{state.driver_id}</p>
      <div className="arq-fleet-details"><div><small>Route</small><strong>{state.route_id}</strong></div><div><small>Stops</small><strong>{state.stops.length}</strong></div><div><small>Route version</small><strong>v{state.route_version}</strong></div><div><small>Driver acknowledgement</small><strong>{ackLabel(state)}</strong></div></div>
      <button className="arq-link-button" onClick={() => { setInspectedVehicle(state.vehicle_id); setInspectedStop(null); onOpenMap(state.vehicle_id); }}>Inspect vehicle and route <ArrowUpRight size={14}/></button>
    </article>)}</div>{!states.length && <EmptyState title="No vehicles match">Adjust the search or sort selection.</EmptyState>}</Panel>}
    {mode === 'drivers' && <Panel title="Driver route acknowledgement" action={<>{sortControl}<span className="arq-panel-caption">Reported versions only</span></>}><div className="arq-table-scroll"><table className="arq-table"><thead><tr><th>Driver</th><th>Vehicle / route</th><th>Manifest version</th><th>Acknowledgement</th><th>Last acknowledged</th><th>Updated</th><th></th></tr></thead><tbody>{states.map((state) => <tr key={`${state.driver_id}-${state.vehicle_id}-${state.route_id}`}><td><UserRound size={15}/><span className="arq-cell-title">{state.driver_id}</span></td><td>{state.vehicle_id} / {state.route_id}</td><td>Route v{state.route_version} · manifest r{state.manifest_revision}</td><td><Badge tone={ackTone(state)}>{ackLabel(state)}</Badge></td><td>{stamp(state.last_ack_at)}</td><td>{stamp(state.updated_at)}</td><td><button className="arq-table-action" onClick={() => { setInspectedVehicle(state.vehicle_id); setInspectedStop(null); }}>Inspect</button></td></tr>)}</tbody></table>{!states.length && <EmptyState title="No drivers match">Adjust the search or sort selection.</EmptyState>}</div></Panel>}
    {mode === 'orders' && <Panel title="Manifest stops" action={<>{sortControl}<span className="arq-panel-caption">Service windows and ETA unavailable from this endpoint</span></>}><div className="arq-table-scroll"><table className="arq-table"><thead><tr><th>Stop</th><th>Manifest</th><th>Address</th><th>Service window</th><th>ETA</th><th>Status</th><th></th></tr></thead><tbody>{orderRows.map(({ state, stop }) => <tr key={`${state.route_id}-${stop.id}`} className={inspectedStop === stop.id ? 'row-selected' : ''} onClick={() => { setInspectedVehicle(state.vehicle_id); setInspectedStop(stop.id); }}><td><ClipboardList size={15}/><span className="arq-cell-title">{stop.sequence}. {stop.name}</span></td><td>{state.vehicle_id} · route v{state.route_version} · manifest r{state.manifest_revision}</td><td>{stop.address || 'Unavailable'}</td><td>Unavailable</td><td>Unavailable</td><td><Badge tone="neutral">{stop.status}</Badge></td><td><button className="arq-table-action" onClick={(event) => { event.stopPropagation(); setInspectedVehicle(state.vehicle_id); setInspectedStop(stop.id); onOpenMap(state.vehicle_id, stop.id); }}>Inspect on map</button></td></tr>)}</tbody></table>{!orderRows.length && <EmptyState title={query ? 'No matching stops' : 'No stops in current manifests'}>{query ? 'Adjust the search to see manifest stops.' : 'The dispatcher state contains no manifest stops.'}</EmptyState>}</div></Panel>}

    {selected && <Panel title={selectedStop ? 'Stop inspector' : 'Route inspector'} action={<button className="arq-link-button" onClick={() => onOpenMap(selected.vehicle_id, selectedStop?.id)}>Open on map <ArrowUpRight size={14}/></button>}><div className="arq-fleet-details">
      <div><small>Vehicle</small><strong>{selected.vehicle_id}</strong></div><div><small>Driver</small><strong>{selected.driver_id}</strong></div><div><small>Route</small><strong>{selected.route_id} · v{selected.route_version}</strong></div><div><small>Manifest revision</small><strong>r{selected.manifest_revision}</strong></div>
      <div><small>Route acknowledgement</small><strong>{ackLabel(selected)}</strong></div><div><small>Last acknowledged</small><strong>{stamp(selected.last_ack_at)}</strong></div><div><small>Reported route duration</small><strong>{selected.estimated_duration_seconds > 0 ? `${Math.round(selected.estimated_duration_seconds / 60)} min` : 'Unavailable'}</strong></div><div><small>Reported route distance</small><strong>{selected.estimated_distance_metres > 0 ? `${(selected.estimated_distance_metres / 1000).toFixed(1)} km` : 'Unavailable'}</strong></div>
      {selectedStop && <><div><small>Stop</small><strong>{selectedStop.sequence}. {selectedStop.name}</strong></div><div><small>Stop status</small><strong>{selectedStop.status}</strong></div><div><small>Address</small><strong>{selectedStop.address || 'Unavailable'}</strong></div></>}
    </div><p className="arq-panel-caption">Duration and distance are dispatcher-reported estimates. ETA, service windows, demand, contact details, capacity, and live GPS are unavailable.</p></Panel>}
    <p className="arq-source-note"><span className="arq-source-dot"/>Dispatcher catalog data · Route versions and acknowledgements are reported by the backend; unavailable operational fields remain unavailable.</p>
  </div>;
}
