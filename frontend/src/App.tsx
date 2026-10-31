import { useEffect, useState } from 'react';
import { useOperations } from './features/operations/useOperations';
import { AppShell } from './features/operations/AppShell';
import { CommandMapView, type NavView } from './features/operations/CommandMapViews';
import { FleetOrderView } from './features/operations/FleetOrderViews';
import { RecoveryView } from './features/operations/RecoveryView';
import { DispatchView } from './features/operations/DispatchView';
import { RouteComparisonView } from './features/operations/RouteComparisonView';
import { AnalyticsView } from './features/operations/AnalyticsView';
import { DiagnosticsView } from './features/operations/DiagnosticsView';
import './App.css';
import './features/operations/interactions.css';

function viewFromHash(): NavView {
  const key=window.location.hash.replace(/^#\/?/,'').split('/')[0];
  return (['command','map','dispatch','compare','fleet','driver','orders','analytics','diagnostics','recovery'] as string[]).includes(key) ? key as NavView : 'command';
}
export default function App() {
  const operations=useOperations();
  const [view,setView]=useState<NavView>(viewFromHash);
  const [search,setSearch]=useState('');
  const [vehicleId,setVehicleId]=useState<string|null>(null);
  const [stopId,setStopId]=useState<string|null>(null);
  useEffect(()=>{const onHash=()=>setView(viewFromHash());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
  const navigate=(next:NavView)=>{setView(next);window.history.replaceState(null,'',`#/${next}`);};
  const states=operations.drivers?.states??[];
  useEffect(()=>{if(!states.some((s)=>s.vehicle_id===vehicleId))setVehicleId(states[0]?.vehicle_id??null);if(stopId&&!states.some((s)=>s.stops.some((x)=>x.id===stopId)))setStopId(null);},[states,vehicleId,stopId]);
  const openMap=(vehicle?:string,stop?:string)=>{if(vehicle)setVehicleId(vehicle);if(stop)setStopId(stop);navigate('map');};
  const content = view==='command'||view==='map'
    ? <CommandMapView operations={operations} mode={view} search={search} selectedVehicleId={vehicleId} selectedStopId={stopId} onSelectVehicle={(id)=>setVehicleId(id)} onSelectStop={(id)=>setStopId(id)}/>
    : view==='fleet'||view==='driver'||view==='orders'
      ? <FleetOrderView operations={operations} mode={view==='driver'?'drivers':view} search={search} onOpenMap={openMap}/>
      : view==='dispatch'?<DispatchView />
      : view==='compare'?<RouteComparisonView operations={operations}/>
      : view==='analytics'?<AnalyticsView operations={operations}/>
      : view==='diagnostics'?<DiagnosticsView operations={operations}/>
      : <RecoveryView operations={operations}/>;
  return <AppShell view={view} onViewChange={navigate} health={operations.health} lastSync={operations.lastSync} busy={operations.busy} error={operations.error} refresh={operations.refresh} search={search} onSearchChange={setSearch}>{content}</AppShell>;
}
