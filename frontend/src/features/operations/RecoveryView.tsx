import { useEffect, useRef, useState } from 'react';
import { Check, Clock3, ShieldCheck, X } from 'lucide-react';
import { dispatchApi, type AuditEntry, type Proposal } from '../../api/dispatch';
import type { SolverJob } from '../../types/api';
import { Panel, EmptyState, Badge, ErrorState } from './primitives';
import type { useOperations } from './useOperations';

type Operations = ReturnType<typeof useOperations>;
type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const proposalData = (proposal: Proposal) => ({ ...proposal, ...row(proposal.proposal) });
const display = (value: unknown) => typeof value === 'string' && value.trim() ? value : 'Unavailable';
const version = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? `v${value}` : 'Unavailable';
const eventDate = (event: AuditEntry) => event.created_at || event.timestamp || '';
const failureStatus = (value: unknown) => typeof value === 'string' && /^(failed|failure|timed_out|cancelled|interrupted|infeasible|validation_failed)$/i.test(value);

function recoveryJob(job: SolverJob) {
  const meta = row(job.metadata);
  return [meta.operation, meta.kind, meta.workflow].some(value => typeof value === 'string' && /^(recovery|recovery_replan)$/i.test(value));
}

function RecoveryFailure({ job }: { job: SolverJob }) {
  return <li key={job.id}><i /><div><strong>Recovery job {job.status.replaceAll('_', ' ')}</strong><p>{job.id} · {job.scenario_id}</p><time>{job.submitted_at ? new Date(job.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Time unavailable'}</time>{job.error_message && <p className="arq-error-copy">{job.error_message}</p>}</div></li>;
}

export function RecoveryView({ operations }: { operations: Operations }) {
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [selected]);

  async function approve() {
    const id = selected?.proposal_id || selected?.id;
    if (!id || selected?.status !== 'pending') return;
    setPending(true); setError(''); setNotice('');
    try {
      const published = await dispatchApi.approve(id);
      setSelected(null);
      setNotice(`The backend returned manifest v${published.route_version} for ${published.vehicle_id}. Driver acknowledgement remains pending.`);
      await operations.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Approval failed. The existing manifest remains authoritative unless the backend confirms publication.'); }
    finally { setPending(false); }
  }

  const proposals = operations.drivers?.proposals || [];
  const recoveryEvents = operations.audits.filter(event => /recovery|replan|congestion|proposal|publish|acknowledg/i.test(event.event_type));
  const recoveryFailures = operations.jobs.filter(job => recoveryJob(job) && failureStatus(job.status));
  const proposal: Row = selected ? proposalData(selected) : {};
  const validation = row(proposal.validation_result ?? proposal.validation);
  const validationErrors = Array.isArray(validation.errors) ? validation.errors.filter((item): item is string => typeof item === 'string') : [];
  const hasValidation = typeof validation.valid === 'boolean' || typeof validation.status === 'string';
  const versionAudit = [
    ['Base route version', proposal.base_route_version],
    ['Published route version', proposal.published_route_version ?? proposal.route_version],
    ['Manifest revision', proposal.manifest_revision],
  ].filter(([, value]) => typeof value === 'number');

  return <div className="arq-page">
    <div className="arq-page-heading"><div><span className="arq-eyebrow">OPERATIONS / RECOVERY</span><h1>Incidents & audit</h1><p>Backend recovery proposals, publication versions and persisted events.</p></div><button className="arq-button" onClick={() => void operations.refresh()}>Refresh activity</button></div>
    {error && <ErrorState>{error}</ErrorState>}
    {notice && <div className="arq-notice" role="status"><Check size={17} />{notice}</div>}
    <div className="arq-split">
      <Panel title="Route proposals" action={<Badge>{proposals.filter(p => p.status === 'pending').length} pending</Badge>}>
        {!proposals.length ? <EmptyState title="No recovery proposals">Proposals appear here only after the backend records them.</EmptyState> : <div className="arq-list">{proposals.map((item) => {
          const p = proposalData(item);
          const id = item.proposal_id || item.id || `${item.vehicle_id}-${item.status}`;
          const check = row(p.validation_result ?? p.validation);
          const passed = check.valid === true;
          const failed = check.valid === false;
          return <article className="arq-list-item" key={id}>
            <div className="arq-list-line"><strong>{display(p.vehicle_id)}</strong><Badge tone={item.status === 'published' ? 'good' : item.status === 'pending' ? 'warning' : ''}>{item.status}</Badge></div>
            <h3>{display(p.reason)}</h3>
            <p>{display(p.current_route_id)} → {display(p.proposed_route_id)}</p>
            <div className="arq-mini-metrics"><span>Base version <b>{version(p.base_route_version)}</b></span><span>Candidate version <b>{version(p.published_route_version ?? p.route_version)}</b></span></div>
            <div className="arq-mini-metrics"><span>Candidate duration <b>{typeof p.proposed_duration_seconds === 'number' && Number.isFinite(p.proposed_duration_seconds) ? `${(p.proposed_duration_seconds / 60).toFixed(1)} min` : 'Unavailable'}</b></span><span>Time/cost savings <b>Unavailable</b></span></div>
            <div className="arq-list-line"><span>Backend candidate validation</span><Badge tone={passed ? 'good' : failed ? 'warning' : ''}>{passed ? 'Passed' : failed ? 'Failed' : typeof check.status === 'string' ? check.status : 'Not returned'}</Badge></div>
            {validationErrors.length > 0 && <ul>{validationErrors.map((message, i) => <li key={`${i}-${message}`}>{message}</li>)}</ul>}
            {item.status === 'pending' && <button className="arq-button primary" onClick={() => { setError(''); setSelected(item); }}><ShieldCheck size={15} />Review & authorize</button>}
          </article>;
        })}</div>}
        {selected && <section className="arq-review-summary" aria-label="Selected proposal version audit">
          <strong>Selected candidate audit</strong>
          {hasValidation ? <p>Backend validation: {typeof validation.valid === 'boolean' ? (validation.valid ? 'passed' : 'failed') : String(validation.status)}{validation.validator ? ` · ${String(validation.validator)}` : ''}</p> : <p>No candidate validation result was included in the proposal record.</p>}
          {versionAudit.length ? <dl>{versionAudit.map(([label, value]) => <div key={String(label)}><dt>{String(label)}</dt><dd>{version(value)}</dd></div>)}</dl> : <p>Route version transition is unavailable in this proposal record.</p>}
          {validationErrors.length > 0 && <ul>{validationErrors.map((message, i) => <li key={`${i}-${message}`}>{message}</li>)}</ul>}
          <small>Source: selected dispatcher proposal API record. No savings or financial feasibility are inferred.</small>
        </section>}
      </Panel>
      <Panel title="Persistent recovery timeline" action={<Clock3 size={16} />}>
        {!recoveryEvents.length && !recoveryFailures.length ? <EmptyState title="No recovery events">Recovery events and terminal recovery job failures appear when returned by the backend.</EmptyState> : <ol className="arq-timeline">
          {recoveryEvents.map((event, i) => <li key={event.id || i}><i /><div><strong>{event.event_type.replaceAll('_', ' ')}</strong><p>{event.principal}</p><time>{eventDate(event) ? `${new Date(eventDate(event)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : 'Time unavailable'}</time><details><summary>Event details</summary><pre>{JSON.stringify(event.payload, null, 2)}</pre></details></div></li>)}
          {recoveryFailures.map(job => <RecoveryFailure key={job.id} job={job} />)}
        </ol>}
      </Panel>
    </div>
    <dialog className="arq-dialog" ref={dialogRef} onCancel={event => { event.preventDefault(); if (!pending) setSelected(null); }}>
      <div className="arq-panel-head"><h2>Authorize route revision</h2><button aria-label="Close approval" disabled={pending} onClick={() => setSelected(null)}><X size={18} /></button></div>
      <p>This sends an approval request to the dispatcher API. The backend must revalidate the candidate and route version before returning the published manifest.</p>
      <div className="arq-note">Confirm explicitly to publish. A returned route version confirms publication; driver acknowledgement is a separate event.</div>
      {error && <ErrorState>{error}</ErrorState>}
      <div className="arq-dialog-actions"><button className="arq-button" disabled={pending} onClick={() => setSelected(null)}>Cancel</button><button className="arq-button primary" disabled={pending || selected?.status !== 'pending'} onClick={() => void approve()}>{pending ? 'Waiting for backend…' : 'Confirm & publish revision'}</button></div>
    </dialog>
    <div className="arq-source-note"><span className="arq-source-dot"/>Source: dispatcher proposal, manifest, recovery audit and persisted job APIs. Unreturned validation, feasibility and financial effects remain unavailable.</div>
  </div>;
}
