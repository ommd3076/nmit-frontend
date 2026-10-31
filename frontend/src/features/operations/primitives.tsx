import { useId, type ReactNode } from 'react';
import { AlertCircle, ArrowUpRight, Inbox } from 'lucide-react';

export function Panel({ title, action, children, className = '', ariaLabel }: {
  title?: string; action?: ReactNode; children: ReactNode; className?: string; ariaLabel?: string;
}) {
  const headingId = useId();
  const content = <>
    {title && <header className="arq-panel-head"><h2 id={headingId}>{title}</h2>{action}</header>}
    {children}
  </>;
  return title || ariaLabel
    ? <section className={`arq-panel ${className}`} aria-labelledby={title ? headingId : undefined} aria-label={!title ? ariaLabel : undefined}>{content}</section>
    : <div className={`arq-panel ${className}`}>{content}</div>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  const headingId = useId();
  return <div className="arq-empty" role="status" aria-labelledby={headingId}>
    <Inbox size={24} aria-hidden="true" />
    <h3 id={headingId}>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>;
}

export function ErrorState({ children, retry, retryLabel = 'Retry' }: { children: ReactNode; retry?: () => void; retryLabel?: string }) {
  return <div className="arq-error" role="alert">
    <AlertCircle size={17} aria-hidden="true" />
    <span>{children}</span>
    {retry && <button type="button" onClick={retry}>{retryLabel}</button>}
  </div>;
}

export function Metric({ label, value, note, icon }: { label: string; value: ReactNode; note: string; icon?: ReactNode }) {
  return <div className="arq-metric">
    <div className="arq-metric-top"><span>{label}</span><span aria-hidden="true">{icon || <ArrowUpRight size={17} />}</span></div>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>;
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`arq-badge ${tone}`}>{children}</span>;
}
