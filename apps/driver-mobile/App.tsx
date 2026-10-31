import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AckResult, DriverIdentity, DriverManifest, DriverState, DriverStop, ReportProposal, driverApi } from './src/api/client';
import { routePairMatches, sessionStore } from './src/state/session';
import { DriverRouteMap } from './src/components/DriverRouteMap';

type Screen = 'pair' | 'home' | 'map' | 'navigation' | 'stops' | 'detail' | 'report' | 'replan' | 'updated' | 'settings';
type Stop = DriverStop;
const C = { bg: '#111315', panel: '#1D2023', panel2: '#25292C', line: '#353A3E', ink: '#F7F7F5', muted: '#A3A8AA', dim: '#747B7E', amber: '#E9B640', green: '#87BFA7', red: '#E37C68' };
const fmtDistance = (m: number | null) => m == null ? 'Unavailable' : `${(m / 1000).toFixed(1)} km`;
const fmtDuration = (s: number | null) => s == null ? 'Unavailable' : `${Math.round(s / 60)} min`;

function Button({ label, onPress, quiet = false, disabled = false }: { label: string; onPress: () => void; quiet?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, quiet && styles.buttonQuiet, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><Text style={[styles.buttonText, quiet && styles.buttonQuietText]}>{label}</Text></Pressable>;
}
function Card({ children, style, ...props }: React.ComponentProps<typeof View>) { return <View {...props} style={[styles.card, style]}>{children}</View>; }
function Label({ children }: { children: React.ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
function Pill({ children, amber = false }: { children: React.ReactNode; amber?: boolean }) { return <View style={[styles.pill, amber && styles.pillAmber]}><Text style={[styles.pillText, amber && styles.pillTextAmber]}>{children}</Text></View>; }

export default function App() {
  const [screen, setScreen] = useState<Screen>('pair');
  const [identity, setIdentity] = useState<DriverIdentity | null>(null);
  const [state, setState] = useState<DriverState | null>(null);
  const [manifest, setManifest] = useState<DriverManifest | null>(null);
  const [proposal, setProposal] = useState<ReportProposal | null>(null);
  const [ack, setAck] = useState<AckResult | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [pairCode, setPairCode] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const currentToken = useRef<string | null>(null);
  const refreshFlight = useRef<Promise<DriverState | null> | null>(null);
  const refreshAbort = useRef<AbortController | null>(null);
  const pendingReport = useRef<{ signature: string; eventId: string } | null>(null);
  const ackFlight = useRef(false);

  const clearSession = useCallback(async () => {
    currentToken.current = null; refreshAbort.current?.abort(); refreshFlight.current = null;
    pendingReport.current = null;
    await sessionStore.clear();
    if (!mounted.current) return;
    setIdentity(null); setState(null); setManifest(null); setProposal(null); setAck(null); setStops([]); setSelectedStop(null); setScreen('pair');
  }, []);
  const refresh = useCallback(async (token = identity?.token): Promise<DriverState | null> => {
    if (!token) return null;
    if (Date.parse(identity?.expires_at || '') <= Date.now()) { await clearSession(); setError('Your driver session expired. Pair again to continue.'); return null; }
    if (refreshFlight.current) return refreshFlight.current;
    const controller = new AbortController(); refreshAbort.current = controller;
    let run!: Promise<DriverState | null>;
    run = (async (): Promise<DriverState | null> => {
      setBusy(true); setError('');
      try {
        const [nextState, nextManifest] = await Promise.all([driverApi.state(token, controller.signal), driverApi.manifest(token, controller.signal)]);
        if (!mounted.current || currentToken.current !== token || controller.signal.aborted) return null;
        if (!routePairMatches(nextState, nextManifest)) throw new Error('The route state and manifest do not match. Refresh again before acknowledging.');
        if (ack && (ack.version !== nextManifest.route_version || ack.manifest_revision !== nextManifest.version)) setAck(null);
        if (selectedStop && !nextManifest.stops?.some(stop => stop.id === selectedStop.id)) setSelectedStop(null);
        setState(nextState); setManifest(nextManifest); setStops(nextManifest.stops || nextState.stops || []);
        return nextState;
      } catch (e) {
        if (!controller.signal.aborted && mounted.current && currentToken.current === token) {
          const message = e instanceof Error ? e.message : 'Could not refresh route.';
          if ((e as any)?.status === 401) { await clearSession(); setError('Your driver session expired. Pair again to continue.'); }
          else setError(message);
        }
      } finally { if (mounted.current && currentToken.current === token) setBusy(false); if (refreshFlight.current === run) refreshFlight.current = null; }
      return null;
    })();
    refreshFlight.current = run;
    return run;
  }, [identity?.token, identity?.expires_at, clearSession, ack, selectedStop]);
  useEffect(() => {
    mounted.current = true;
    void sessionStore.load().then(saved => { if (mounted.current && saved) { currentToken.current = saved.token; setIdentity(saved); setScreen('home'); } });
    return () => { mounted.current = false; refreshAbort.current?.abort(); };
  }, []);
  useEffect(() => { currentToken.current = identity?.token || null; if (identity) void refresh(identity.token); }, [identity?.token]);
  useEffect(() => {
    if (!identity) return;
    const poll = setInterval(() => { if (AppState.currentState === 'active') void refresh(identity.token); }, 30_000);
    return () => clearInterval(poll);
  }, [identity?.token, refresh]);
  const pair = async () => {
    setBusy(true); setError('');
    try { const result = await driverApi.pair(pairCode.trim()); await sessionStore.save(result); currentToken.current = result.token; setIdentity(result); setScreen('home'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Pairing failed.'); }
    finally { setBusy(false); }
  };
  const submitReport = async () => {
    if (!identity || !state) return;
    const payload = { base_route_version: state.route_version, severity, note: note.trim() };
    const signature = `${payload.base_route_version}\u0000${payload.severity}\u0000${payload.note}`;
    if (!pendingReport.current || pendingReport.current.signature !== signature) {
      pendingReport.current = { signature, eventId: `driver-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
    }
    const eventId = pendingReport.current.eventId;
    setBusy(true); setError('');
    try {
      const result = await driverApi.report(identity.token, { event_id: eventId, ...payload });
      pendingReport.current = null;
      setProposal(result); setScreen('replan');
    } catch (e) { setError(e instanceof Error ? e.message : 'Report could not be sent.'); }
    finally { setBusy(false); }
  };
  const acknowledge = async () => {
    if (!identity || !manifest) return;
    if (ackFlight.current) return;
    if (!state || !routePairMatches(state, manifest)) {
      setError('Route state and manifest version do not match. Refresh before acknowledging.');
      return;
    }
    const routeVersion = manifest.route_version;
    const revision = state.manifest_revision;
    if (revision == null || revision !== manifest.version || routeVersion !== state.route_version) {
      setError('The published route changed. Refresh it before acknowledging.');
      return;
    }
    ackFlight.current = true;
    setBusy(true); setError('');
    try {
      const result = await driverApi.acknowledge(identity.token, routeVersion, revision);
      if (result.version !== routeVersion || result.manifest_revision !== revision) throw new Error('The service acknowledged a different route revision. Refresh to confirm the current route.');
      setAck(result); setScreen('updated');
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Route acknowledgement failed.'); }
    finally { ackFlight.current = false; setBusy(false); }
  };

  const logout = async () => {
    const token = identity?.token;
    await clearSession();
    if (token) void driverApi.revoke(token).catch(() => undefined);
  };

  const go = (next: Screen) => { setError(''); setScreen(next); };
  const stopRows = stops.length ? stops : [];
  const title: Record<Screen, string> = { pair: 'Pair device', home: 'Today', map: 'Active route', navigation: 'Route guidance', stops: 'Stops', detail: 'Stop details', report: 'Report congestion', replan: 'Replan status', updated: 'Route update', settings: 'Connection' };

  const content = () => {
    if (screen === 'pair') return <>
      <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>a</Text></View><Text style={styles.brandName}>arQ <Text style={styles.brandSub}>DRIVER</Text></Text></View>
      <View style={styles.intro}><Text style={styles.h1}>Connect your shift</Text><Text style={styles.body}>Enter the pairing code provided by dispatch.</Text></View>
      <Card><Label>PAIRING CODE</Label><TextInput value={pairCode} onChangeText={setPairCode} onSubmitEditing={() => void pair()} returnKeyType="go" placeholder="Enter code" placeholderTextColor={C.dim} autoCapitalize="characters" autoCorrect={false} style={styles.input} accessibilityLabel="Pairing code" />
        <Text style={styles.small}>The dispatch service checks this pairing code.</Text><Button label={busy ? 'Connecting…' : 'Connect'} onPress={pair} disabled={busy || !pairCode.trim()} /></Card>
      <Text style={styles.foot}>arQ driver · dispatch session</Text>
    </>;
    if (screen === 'home') return <>
      <View style={styles.greeting}><View><Text style={styles.kicker}>DRIVER SHIFT</Text><Text style={styles.h1}>Good shift, {identity?.driver_name || 'Driver'}</Text></View><Pill>{state?.status || 'Connecting'}</Pill></View>
      <Card style={styles.heroCard}><View style={styles.heroTop}><View><Label>ASSIGNED VEHICLE</Label><Text style={styles.heroTitle}>{identity?.vehicle_id || '—'}</Text></View><Pill amber>Route v{state?.route_version ?? '—'}</Pill></View>
        <View style={styles.metricRow}><Metric label="DISTANCE" value={fmtDistance(state?.estimated_distance_metres ?? null)} /><Metric label="EST. DRIVE" value={fmtDuration(state?.estimated_duration_seconds ?? null)} /></View>
        <Text style={styles.caption}>Server route estimate · no live GPS</Text></Card>
      <View style={styles.rowBetween}><Text style={styles.h2}>Your route</Text><Pressable onPress={() => go('stops')}><Text style={styles.link}>View stops</Text></Pressable></View>
      {stopRows.slice(0, 3).map(stop => <StopRow key={stop.id} stop={stop} onPress={() => { setSelectedStop(stop); go('detail'); }} />)}
      {!stopRows.length && <Card><Text style={styles.body}>Stop details are not available in this manifest.</Text><Text style={styles.small}>Refresh after dispatch publishes a route.</Text></Card>}
      <Button label="Open route map" onPress={() => go('map')} />
      <Button label="Report congestion" onPress={() => go('report')} quiet />
    </>;
    if (screen === 'map') return <>
      <Card style={styles.map}><View style={styles.mapTop}><Pill amber>PLANNED ROUTE</Pill><Text style={styles.small}>Route v{state?.route_version ?? '—'}</Text></View>
        <DriverRouteMap geojson={state?.geojson} stops={stopRows} selectedStopId={selectedStop?.id} onSelectStop={(stop) => setSelectedStop(stop)} />
        <Text style={styles.caption}>Planned route and stops · no live location or turn-by-turn guidance</Text>
      </Card>
      <Card><Label>ROUTE SUMMARY</Label><Metric label="DISTANCE" value={fmtDistance(state?.estimated_distance_metres ?? null)} /><Metric label="ESTIMATED DRIVE" value={fmtDuration(state?.estimated_duration_seconds ?? null)} /><Text style={styles.small}>Route geometry and stop markers come from the current dispatch response.</Text></Card>
      <Button label="View route guidance" onPress={() => go('navigation')} /><Button label="Open stops" onPress={() => go('stops')} quiet />
    </>;    if (screen === 'navigation') {
      const next = stopRows.find(s => s.status !== 'completed') || stopRows[0];
      return <>
        <DriverRouteMap geojson={state?.geojson} stops={stopRows} selectedStopId={next?.id} onSelectStop={(stop) => { setSelectedStop(stop); go('detail'); }} />
        <Card style={styles.navCard}><Pill amber>ROUTE GUIDANCE</Pill><Text style={styles.navDistance}>Next stop</Text><Text style={styles.h1}>{next?.name || 'No active stop'}</Text><Text style={styles.body}>{next?.address || 'Stop address unavailable'}</Text><View style={styles.divider} /><Text style={styles.small}>This screen shows the planned next stop. It does not provide turn-by-turn navigation or live location.</Text></Card>
        {next && <Button label="View stop details" onPress={() => { setSelectedStop(next); go('detail'); }} />}<Button label="Report congestion" onPress={() => go('report')} quiet />
      </>;
    }
    if (screen === 'stops') return <>
      <Card><View style={styles.rowBetween}><Text style={styles.h2}>Stops</Text><Pill>{stopRows.length} planned</Pill></View><Text style={styles.small}>Order supplied by the current manifest · v{manifest?.version ?? '—'}</Text></Card>
      {stopRows.map(stop => <StopRow key={stop.id} stop={stop} onPress={() => { setSelectedStop(stop); go('detail'); }} />)}
      {!stopRows.length && <Empty title="No stop list in manifest" body="The route service has not provided stop details for this session." />}
      <Button label="Refresh route" onPress={() => void refresh()} quiet />
    </>;
    if (screen === 'detail') return <>
      <Card><Pill>{selectedStop?.status || 'Stop'}</Pill><Text style={styles.h1}>{selectedStop?.name || 'Select a stop'}</Text><Text style={styles.body}>{selectedStop?.address || 'Address unavailable'}</Text><View style={styles.divider} /><Metric label="SEQUENCE" value={selectedStop ? `Stop ${selectedStop.sequence}` : '—'} /><Metric label="ETA WINDOW" value={selectedStop?.eta_window || 'Unavailable'} /><Text style={styles.small}>{selectedStop?.detail_available ? 'Details supplied by the route manifest.' : 'Additional delivery details are unavailable.'}</Text></Card>
      <Button label="Open route guidance" onPress={() => go('navigation')} /><Button label="Back to stops" onPress={() => go('stops')} quiet />
    </>;
    if (screen === 'report') return <>
      <Card><Label>ROUTE v{state?.route_version ?? '—'}</Label><Text style={styles.h1}>Report a delay</Text><Text style={styles.body}>Your report goes to dispatch as a proposal. It does not change the route.</Text>
        <Label>SEVERITY</Label><View style={styles.segment}>{['moderate','heavy'].map(v => <Pressable accessibilityRole="button" accessibilityState={{ selected: severity === v }} accessibilityLabel={`Set ${v} severity`} key={v} onPress={() => setSeverity(v)} style={[styles.segmentItem, severity === v && styles.segmentSelected]}><Text style={[styles.segmentText, severity === v && styles.segmentTextSelected]}>{v}</Text></Pressable>)}</View>
        <Label>WHAT IS HAPPENING?</Label><TextInput value={note} onChangeText={setNote} placeholder="Describe the congestion" placeholderTextColor={C.dim} multiline style={[styles.input, styles.noteInput]} accessibilityLabel="Congestion description" />
      </Card><Button label={busy ? 'Sending report…' : 'Send to dispatch'} onPress={() => void submitReport()} disabled={busy} /><Text style={styles.caption}>No route update occurs until dispatch approves a proposal.</Text>
    </>;
    if (screen === 'replan') return <>
      <Card><Pill amber>{proposal?.decision === 'KEEP' ? 'CURRENT ROUTE RETAINED' : 'AWAITING DISPATCH'}</Pill><Text style={styles.h1}>{proposal?.decision === 'KEEP' ? 'No alternate route proposed' : 'Report received'}</Text><Text style={styles.body}>{proposal?.reason || 'Dispatch review is pending. Your current route remains active.'}</Text><View style={styles.divider} /><Metric label="PROPOSAL" value={proposal?.proposal_id || '—'} /><Metric label="BASED ON ROUTE" value={`Version ${proposal?.base_route_version ?? '—'}`} /><Metric label="PUBLISHED" value={proposal?.published ? 'Yes' : 'No'} /><Metric label="VALIDATION" value={proposal?.validation.status || 'Unavailable'} /></Card>
      <Button label={busy ? 'Checking…' : 'Check for route update'} onPress={async () => { const latest = await refresh(); if (latest && proposal && latest.route_version > proposal.base_route_version) go('updated'); }} disabled={busy} /><Button label="Back to route" onPress={() => go('map')} quiet />
    </>;
    if (screen === 'updated') return <>
      <Card><Pill amber>DISPATCH PUBLISHED</Pill><Text style={styles.h1}>Route update available</Text><Text style={styles.body}>Review the server-published route, then acknowledge its exact version.</Text><View style={styles.divider} /><Metric label="CURRENT VERSION" value={`v${manifest?.version ?? state?.route_version ?? '—'}`} /><Metric label="ROUTE" value={manifest?.route_id || state?.route_id || '—'} /><Metric label="CORRIDOR" value={manifest?.corridor_id || state?.corridor_id || '—'} /><Metric label="STOPS PROVIDED" value={`${stopRows.length}`} /></Card>
      {stopRows.map(stop => <StopRow key={stop.id} stop={stop} onPress={() => { setSelectedStop(stop); go('detail'); }} />)}
      {ack ? <Card><Text style={styles.successText}>Acknowledged route version {ack.version}</Text><Text style={styles.small}>{ack.acknowledged_at}</Text></Card> : <Button label={busy ? 'Acknowledging…' : `Acknowledge version ${manifest?.version ?? '—'}`} onPress={() => void acknowledge()} disabled={busy || !manifest || !state || state.route_version !== manifest.route_version} />}
      <Button label="Refresh published route" onPress={() => void refresh()} quiet />
    </>;
    return <>
      <Card><Text style={styles.h1}>Connection</Text><Text style={styles.body}>Driver session and service connection.</Text><View style={styles.divider} /><Metric label="DRIVER" value={identity?.driver_name || 'Not paired'} /><Metric label="VEHICLE" value={identity?.vehicle_id || '—'} /><Metric label="ROUTE VERSION" value={state ? `v${state.route_version}` : '—'} /><Metric label="SERVICE" value="Configured API" /></Card>
      <Button label={busy ? 'Refreshing…' : 'Refresh connection'} onPress={() => void refresh()} /><Button label="End driver session" onPress={() => void logout()} quiet />
      <Text style={styles.caption}>No GPS permission is requested. Location is not tracked.</Text>
    </>;
  };

  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.header}><View style={styles.brandMini}><View style={styles.brandDot}><Text style={styles.brandDotText}>a</Text></View><Text style={styles.brandName}>arQ</Text></View><Text accessibilityRole="header" style={styles.headerTitle}>{title[screen]}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh service data" accessibilityState={{ disabled: !identity || busy }} onPress={() => void refresh()} disabled={!identity || busy} style={styles.refresh}><Text style={styles.refreshText}>{busy ? '…' : '↻'}</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{error ? <Card style={styles.errorCard} accessibilityLiveRegion="assertive"><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Button label="Dismiss message" onPress={() => setError('')} quiet /></Card> : null}{content()}</ScrollView>
    {identity && <View style={styles.tabBar}>{([{id:'home',label:'Home',icon:'⌂'},{id:'map',label:'Route',icon:'⌁'},{id:'stops',label:'Stops',icon:'☷'},{id:'settings',label:'Settings',icon:'⚙'}] as const).map(tab => <Pressable key={tab.id} onPress={() => go(tab.id)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: screen === tab.id }} accessibilityLabel={tab.label}><Text style={[styles.tabIcon, screen === tab.id && styles.tabActive]}>{tab.icon}</Text><Text style={[styles.tabLabel, screen === tab.id && styles.tabActive]}>{tab.label}</Text></Pressable>)}</View>}
  </SafeAreaView>;
}
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function StopRow({ stop, onPress }: { stop: Stop; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Stop ${stop.sequence}: ${stop.name}`} style={styles.stopRow}><View style={styles.stopNum}><Text style={styles.stopNumText}>{stop.sequence}</Text></View><View style={styles.stopInfo}><Text style={styles.stopName}>{stop.name}</Text><Text style={styles.stopAddress}>{stop.address || 'Address unavailable'}</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }
function Empty({ title, body }: { title: string; body: string }) { return <Card><Text style={styles.h2}>{title}</Text><Text style={styles.body}>{body}</Text></Card>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, header: { height: 58, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 }, brandMini: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 72 }, brandDot: { width: 27, height: 27, borderRadius: 9, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }, brandDotText: { color: C.bg, fontSize: 20, fontWeight: '900' }, brandName: { color: C.ink, fontWeight: '800', fontSize: 17, letterSpacing: -.3 }, headerTitle: { flex: 1, color: C.ink, fontWeight: '700', fontSize: 15 }, refresh: { height: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }, refreshText: { color: C.amber, fontSize: 23 }, content: { padding: 18, paddingBottom: 30, gap: 12 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 46 }, brandMark: { width: 50, height: 50, borderRadius: 17, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }, brandMarkText: { color: C.bg, fontSize: 36, fontWeight: '900' }, brandSub: { color: C.muted, fontSize: 10, letterSpacing: 2 }, intro: { marginTop: 32, marginBottom: 8 }, h1: { color: C.ink, fontSize: 26, fontWeight: '800', letterSpacing: -.6, marginTop: 7, marginBottom: 6 }, h2: { color: C.ink, fontSize: 17, fontWeight: '700' }, body: { color: C.muted, fontSize: 14, lineHeight: 21 }, small: { color: C.muted, fontSize: 12, lineHeight: 17, marginVertical: 5 }, caption: { color: C.dim, fontSize: 11, lineHeight: 16, paddingHorizontal: 3 }, foot: { color: C.dim, fontSize: 11, textAlign: 'center', marginTop: 24 }, card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 21, padding: 17, gap: 10 }, heroCard: { padding: 19 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroTitle: { color: C.ink, fontSize: 21, fontWeight: '800', marginTop: 5 }, label: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 7 }, pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30, backgroundColor: C.panel2 }, pillAmber: { backgroundColor: '#3C3321' }, pillText: { color: C.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, pillTextAmber: { color: C.amber }, metricRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, metric: { paddingVertical: 8, gap: 3 }, metricLabel: { color: C.dim, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, metricValue: { color: C.ink, fontSize: 16, fontWeight: '700' }, button: { minHeight: 52, backgroundColor: C.amber, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 3 }, buttonText: { color: C.bg, fontWeight: '800', fontSize: 14 }, buttonQuiet: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line }, buttonQuietText: { color: C.ink }, disabled: { opacity: .45 }, pressed: { opacity: .75 }, input: { height: 52, backgroundColor: C.panel2, borderRadius: 13, color: C.ink, paddingHorizontal: 14, fontSize: 16, borderWidth: 1, borderColor: C.line, marginVertical: 4 }, greeting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }, kicker: { color: C.amber, fontSize: 10, letterSpacing: 1.4, fontWeight: '800' }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, link: { color: C.amber, fontSize: 13, fontWeight: '700' }, map: { padding: 12 }, mapTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6 }, navCard: { padding: 20, minHeight: 285, justifyContent: 'center' }, navDistance: { color: C.amber, fontSize: 13, fontWeight: '700', marginTop: 24 }, divider: { height: 1, backgroundColor: C.line, marginVertical: 10 }, stopRow: { minHeight: 76, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, stopNum: { height: 36, width: 36, borderRadius: 13, backgroundColor: '#3C3321', alignItems: 'center', justifyContent: 'center' }, stopNumText: { color: C.amber, fontWeight: '900' }, stopInfo: { flex: 1, gap: 4 }, stopName: { color: C.ink, fontWeight: '700', fontSize: 14 }, stopAddress: { color: C.muted, fontSize: 11 }, chevron: { color: C.dim, fontSize: 24 }, segment: { flexDirection: 'row', backgroundColor: C.panel2, borderRadius: 13, padding: 4 }, segmentItem: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, segmentSelected: { backgroundColor: C.amber }, segmentText: { color: C.muted, textTransform: 'capitalize', fontWeight: '700' }, segmentTextSelected: { color: C.bg }, noteInput: { minHeight: 105, paddingTop: 13, textAlignVertical: 'top' }, errorCard: { borderColor: C.red }, errorText: { color: '#FFAA99', fontSize: 13 }, successText: { color: C.green, fontWeight: '800', fontSize: 15 }, tabBar: { minHeight: 68, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg, flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, gap: 3 }, tabIcon: { color: C.dim, fontSize: 19 }, tabLabel: { color: C.dim, fontSize: 10, fontWeight: '700' }, tabActive: { color: C.amber },
});

