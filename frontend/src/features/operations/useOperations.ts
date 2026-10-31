import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import { dispatchApi, type AuditEntry, type DispatcherState } from '../../api/dispatch';
import type { IntelligenceEvidence, PlanRun, SolverJob, SystemHealth } from '../../types/api';

const OFFLINE: SystemHealth = { status: 'offline', backend_url: '', version: 'unavailable', timestamp: '', capacity: null, engines_available: [] };
export function useOperations() {
  const [health, setHealth] = useState(OFFLINE);
  const [plans, setPlans] = useState<PlanRun[]>([]);
  const [jobs, setJobs] = useState<SolverJob[]>([]);
  const [drivers, setDrivers] = useState<DispatcherState | null>(null);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [evidence, setEvidence] = useState<IntelligenceEvidence | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (inFlight.current && !controller.current?.signal.aborted) return inFlight.current;
    controller.current?.abort();
    const abortController = new AbortController();
    controller.current = abortController;
    const current = ++generation.current;
    const run = (async () => {
      try {
        const result = await Promise.allSettled([apiClient.getHealth(), apiClient.getRuns(), apiClient.getJobs(), dispatchApi.state(abortController.signal), dispatchApi.audits(abortController.signal), apiClient.getIntelligenceEvidence()]);
        if (!alive.current || generation.current !== current) return;
        const [h, p, j, d, a, e] = result;
        if (h.status === 'fulfilled') setHealth(h.value); else setHealth(OFFLINE);
        if (p.status === 'fulfilled') setPlans(p.value);
        if (j.status === 'fulfilled') setJobs(j.value);
        if (e.status === 'fulfilled') setEvidence(e.value);
        // Never present a previous dispatcher response as current after an auth/error response.
        if (d.status === 'fulfilled' && a.status === 'fulfilled') {
          setDrivers(d.value);
          setAudits(a.value);
        } else {
          setDrivers(null);
          setAudits([]);
        }
        const failed = result.find((r) => r.status === 'rejected');
        setError(failed?.status === 'rejected' ? (failed.reason instanceof Error ? failed.reason.message : 'Some backend data is unavailable.') : '');
        if (d.status === 'fulfilled' && a.status === 'fulfilled') setLastSync(new Date().toISOString());
        setBusy(false);
      } finally {
        if (generation.current === current) {
          controller.current = null;
          inFlight.current = null;
        }
      }
    })();
    inFlight.current = run;
    return run;
  }, []);
  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { await refresh(); if (alive.current) timer = setTimeout(poll, document.hidden ? 15_000 : 5_000); };
    void poll();
    return () => { alive.current = false; generation.current++; clearTimeout(timer); controller.current?.abort(); };
  }, [refresh]);
  return { health, plans, jobs, drivers, audits, evidence, error, busy, lastSync, refresh };
}
