import { useState } from 'react';

export const STATUS_LABEL = {
  queued: 'Queued', processing: 'Sending', pending: 'Waiting to retry', success: 'Delivered', failed: 'Failed',
  duplicate: 'Duplicate', unrouted: 'No route', active: 'Active', draft: 'Draft', inactive: 'Inactive',
};

export const StatusBadge = ({ status }) => <span className={`badge s-${status}`}>{STATUS_LABEL[status] || status}</span>;

export const Field = ({ label, hint, children, wide }) => (
  <label className={`field ${wide ? 'wide' : ''}`}>
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

export function Drawer({ title, onClose, children, width = 640 }) {
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="drawer" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <header><h2>{title}</h2><button className="btn quiet" onClick={onClose}>Close</button></header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export const Json = ({ value }) => {
  if (value === undefined || value === null || value === '') return <pre className="json muted">—</pre>;
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (typeof value === 'string') { try { text = JSON.stringify(JSON.parse(value), null, 2); } catch { /* keep raw */ } }
  return <pre className="json">{text}</pre>;
};

// Editable list of key/value rows (headers, query params)
export function KVEditor({ rows, onChange, keyLabel = 'Name', valueLabel = 'Value' }) {
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="kv">
      {rows.map((r, i) => (
        <div className="kv-row" key={i}>
          <input placeholder={keyLabel} value={r.key || ''} onChange={(e) => set(i, { key: e.target.value })} />
          <input placeholder={valueLabel} value={r.value || ''} onChange={(e) => set(i, { value: e.target.value })} />
          <button type="button" className="btn quiet" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn quiet" onClick={() => onChange([...rows, { key: '', value: '' }])}>Add row</button>
    </div>
  );
}

export function Pager({ page, total, limit = 50, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      <span className="muted">{total.toLocaleString()} total</span>
      <button className="btn quiet" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn quiet" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

export const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');

export function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (text, bad) => { setMsg({ text, bad }); setTimeout(() => setMsg(null), 4000); };
  const node = msg ? <div className={`toast ${msg.bad ? 'bad' : ''}`} role="status">{msg.text}</div> : null;
  return [show, node];
}
