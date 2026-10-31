import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Activity, BarChart3, Boxes, CircleHelp, ClipboardList, Command, GitCompareArrows, Map, Menu, RefreshCw, Search, Settings2, Truck, X } from 'lucide-react';
import type { SystemHealth } from '../../types/api';
import { configureDispatcherToken } from '../../api/dispatch';
import type { NavView } from './CommandMapViews';

const NAV: { id: NavView; label: string; icon: typeof Map; group: string }[] = [
  { id: 'command', label: 'Command', icon: Command, group: 'OPERATIONS' },
  { id: 'map', label: 'Live map', icon: Map, group: 'OPERATIONS' },
  { id: 'dispatch', label: 'Dispatch', icon: GitCompareArrows, group: 'OPERATIONS' },
  { id: 'compare', label: 'Compare', icon: Boxes, group: 'OPERATIONS' },
  { id: 'fleet', label: 'Fleet', icon: Truck, group: 'NETWORK' },
  { id: 'driver', label: 'Drivers', icon: Activity, group: 'NETWORK' },
  { id: 'orders', label: 'Orders', icon: ClipboardList, group: 'NETWORK' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'INTELLIGENCE' },
  { id: 'diagnostics', label: 'Diagnostics', icon: Settings2, group: 'INTELLIGENCE' },
  { id: 'recovery', label: 'Recovery', icon: RefreshCw, group: 'INTELLIGENCE' },
];
const TITLES: Record<NavView, string> = { command: 'Command center', map: 'Live map', dispatch: 'Dispatch planning', compare: 'Plan comparison', fleet: 'Fleet', driver: 'Drivers', orders: 'Orders', analytics: 'Analytics', diagnostics: 'Diagnostics', recovery: 'Recovery' };

export function AppShell({ view, onViewChange, health, lastSync, busy, error, refresh, search, onSearchChange, children }: {
  view: NavView; onViewChange: (view: NavView) => void; health: SystemHealth; lastSync: string | null;
  busy: boolean; error: string; refresh: () => void; search: string; onSearchChange: (value: string) => void; children: ReactNode;
}) {
  const [railOpen, setRailOpen] = useState(false);
  const [token, setToken] = useState('');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const accessRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const railWasOpen = useRef(false);
  const connected = health.status === 'healthy';
  const healthLabel = health.status === 'healthy' ? 'Backend online' : health.status === 'degraded' ? 'Backend degraded' : 'Backend offline';
  const groups = useMemo(() => [...new Set(NAV.map((item) => item.group))], []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (railOpen && isMobile) navRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    else if (!railOpen && isMobile && railWasOpen.current) menuRef.current?.focus();
    railWasOpen.current = railOpen;
  }, [railOpen, isMobile]);

  useEffect(() => {
    if (tokenOpen) tokenInputRef.current?.focus();
  }, [tokenOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !isTyping && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (tokenOpen) {
          setTokenOpen(false);
          setToken('');
          accessRef.current?.focus();
        } else if (railOpen) {
          setRailOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [railOpen, tokenOpen]);

  const choose = (id: NavView) => { onViewChange(id); setRailOpen(false); };
  const submitToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    configureDispatcherToken(token);
    setToken('');
    setTokenOpen(false);
    refresh();
  };
  const syncTime = lastSync ? new Date(lastSync) : null;
  const syncLabel = syncTime && !Number.isNaN(syncTime.getTime())
    ? `Synced ${syncTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`
    : lastSync ? 'Sync time unavailable' : 'Waiting for API';

  return <div className="arq-app">
    <header className="arq-topbar">
      <a className="arq-skip-link" href="#main-content">Skip to content</a>
      <button ref={menuRef} className="arq-menu-button" aria-label={railOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={railOpen} aria-controls="ops-navigation" onClick={() => setRailOpen(!railOpen)}><Menu size={19} aria-hidden="true" /></button>
      <a className="arq-brand" href="#/command" onClick={(event) => { event.preventDefault(); choose('command'); }} aria-label="arQ command center"><span className="arq-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M6 23.5 13 16l5 4.5L26 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="23.5" r="2.2" fill="#A8DBC9"/><circle cx="13" cy="16" r="2.2" fill="#fff"/><circle cx="18" cy="20.5" r="2.2" fill="#A8DBC9"/><circle cx="26" cy="9" r="2.6" fill="#E7B86E"/></svg></span><span>arQ</span></a>
      <span className="arq-top-divider" aria-hidden="true" />
      <div className="arq-top-title"><span className="arq-eyebrow">OPERATIONS</span><strong>{TITLES[view]}</strong></div>
      <label className="arq-search"><Search size={16} aria-hidden="true" /><input ref={searchRef} id="ops-search" aria-label="Search fleet, driver, or stop" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search fleet, driver, stop…"/><kbd aria-hidden="true">/</kbd></label>
      <div className={`arq-health ${connected ? 'is-online' : 'is-offline'}`} role="status" aria-label={`Backend status: ${health.status}`}><i aria-hidden="true"/><span>{healthLabel}</span></div>
      <button className="arq-icon-button" aria-label={busy ? 'Refreshing data' : 'Refresh data'} title="Refresh data" onClick={refresh} disabled={busy}><RefreshCw size={17} aria-hidden="true" /></button>
      <button ref={accessRef} className="arq-avatar" aria-label="Dispatcher API access settings" aria-haspopup="dialog" aria-expanded={tokenOpen} aria-controls="dispatcher-access" onClick={() => { if (tokenOpen) setToken(''); setTokenOpen(!tokenOpen); }}>OP</button>
      {tokenOpen && <section id="dispatcher-access" className="arq-token-popover" role="dialog" aria-labelledby="dispatcher-access-title" aria-modal="false">
        <div className="arq-token-head"><strong id="dispatcher-access-title">Optional API access</strong><button type="button" aria-label="Close API access settings" onClick={() => { setTokenOpen(false); setToken(''); accessRef.current?.focus(); }}><X size={15} aria-hidden="true" /></button></div>
        <p>This optional token stays in this tab's memory and is sent to the configured API.</p>
        <form onSubmit={submitToken}><input ref={tokenInputRef} id="dispatcher-token" aria-label="Dispatcher API token" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="API token"/><button type="submit">Apply</button></form>
      </section>}
    </header>
    <div className="arq-layout">
      {railOpen && <button className="arq-scrim visible" aria-label="Close navigation" onClick={() => setRailOpen(false)} />}
      <aside className={`arq-rail ${railOpen ? 'open' : ''}`} aria-label="Main navigation" inert={isMobile && !railOpen}>
        <nav id="ops-navigation" ref={navRef} className="arq-rail-scroll" aria-label="Operations views">
          {groups.map((group) => <div className="arq-nav-group" key={group}><span className="arq-nav-label">{group}</span>{NAV.filter((item) => item.group === group).map(({ id, label, icon: Icon }) => <button key={id} className={`arq-nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => choose(id)}><Icon size={18} aria-hidden="true"/><span>{label}</span></button>)}</div>)}
        </nav>
        <div className="arq-rail-foot"><CircleHelp size={16} aria-hidden="true"/><span>{syncLabel}</span><span className="arq-sync-dot" aria-hidden="true"/></div>
      </aside>
      <main className="arq-main" id="main-content" tabIndex={-1}>
        {error && <div className="arq-global-error" role="alert" aria-live="assertive"><span>{error}</span><button type="button" onClick={refresh} disabled={busy}>{busy ? 'Retrying…' : 'Retry'}</button></div>}
        {children}
      </main>
    </div>
  </div>;
}
