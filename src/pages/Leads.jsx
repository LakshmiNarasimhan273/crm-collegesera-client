import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Drawer, Json, Pager, StatusBadge, fmt, useToast } from '../components/ui';

const STATUSES = ['', 'failed', 'pending', 'queued', 'processing', 'success', 'duplicate', 'unrouted'];

export function LogEntry({ l }) {
  return (
    <details className="log" open={false}>
      <summary>
        <span className={l.success ? 'ok-t' : 'bad-t'}>{l.success ? 'Success' : 'Failed'}</span> · attempt {l.attempt} · {l.httpStatus ? `HTTP ${l.httpStatus}` : 'no response'} · {fmt(l.requestAt)}{l.isTest && ' · test'}
      </summary>
      <p><b>{l.method}</b> {l.apiUrl}</p>
      {l.error && <p className="bad-t">{l.error}</p>}
      {l.externalLeadId && <p>Client lead ID: <b>{l.externalLeadId}</b></p>}
      <h4>Request</h4><Json value={l.requestPayload} />
      <h4>Response{l.durationMs ? ` (${l.durationMs} ms)` : ''}</h4><Json value={l.responseBody} />
    </details>
  );
}

export default function Leads() {
  const { canEdit } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [toast, toastNode] = useToast();

  const status = sp.get('status') || '';
  const clientId = sp.get('clientId') || '';
  const param = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); setPage(1); };

  const load = () => api.get('/leads', { params: { status, clientId, q, page } }).then((r) => setData(r.data));
  useEffect(() => { api.get('/clients').then((r) => setClients(r.data)); }, []);
  useEffect(() => { load(); }, [status, clientId, page, q]);

  const retry = async (id) => { try { await api.post(`/leads/${id}/retry`); toast('Lead re-queued'); load(); } catch (e) { toast(errMsg(e), true); } };
  const retryAll = async () => {
    if (!confirm(`Retry every failed and pending lead${clientId ? ' for this client' : ''}?`)) return;
    const r = await api.post('/leads-retry-bulk', { clientId, q: q || undefined }); toast(`${r.data.requeued} leads re-queued`); load();
  };
  const view = async (id) => setOpen((await api.get(`/leads/${id}`)).data);

  return (
    <>
      <div className="page-h"><h1>Lead queue</h1>{canEdit && <button className="btn" onClick={retryAll}>Retry all failed and pending</button>}</div>
      <div className="filters">
        <select value={status} onChange={(e) => param('status', e.target.value)} aria-label="Status">{STATUSES.map((s) => <option key={s} value={s}>{s ? s : 'All statuses'}</option>)}</select>
        <select value={clientId} onChange={(e) => param('clientId', e.target.value)} aria-label="Client"><option value="">All clients</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
        <input placeholder="Lead ID, mobile or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <table className="tbl">
        <thead><tr><th>Lead</th><th>Client</th><th>CRM</th><th>Status</th><th>Tries</th><th>Client lead ID</th><th>Detail</th><th>Updated</th><th /></tr></thead>
        <tbody>
          {data.items.map((l) => (
            <tr key={l._id}>
              <td><button className="link" onClick={() => view(l._id)}>{l.leadId}</button><div className="muted sm">{l.data?.name}</div></td>
              <td>{l.clientName || '—'}</td><td>{l.crm || '—'}</td>
              <td><StatusBadge status={l.status} /></td>
              <td className="num">{l.attempts}</td>
              <td>{l.externalLeadId || '—'}</td>
              <td className="detail">{l.lastError || ''}{l.nextRetryAt && l.status === 'pending' ? ` Next try ${fmt(l.nextRetryAt)}` : ''}</td>
              <td className="nowrap">{fmt(l.updatedAt)}</td>
              <td className="r">{canEdit && ['failed', 'pending'].includes(l.status) && <button className="btn" onClick={() => retry(l._id)}>Retry</button>}</td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan="9" className="empty">No leads match these filters.</td></tr>}
        </tbody>
      </table>
      <Pager page={page} total={data.total} onPage={setPage} />

      {open && (
        <Drawer title={`Lead ${open.lead.leadId}`} onClose={() => setOpen(null)}>
          <p><StatusBadge status={open.lead.status} /> {open.lead.clientName && `· ${open.lead.clientName}`}</p>
          <h3>Lead data</h3><Json value={open.lead.data} />
          <h3>API attempts</h3>
          {open.logs.length === 0 ? <p className="muted">No attempts yet.</p> : open.logs.map((l) => <LogEntry key={l._id} l={l} />)}
        </Drawer>
      )}
      {toastNode}
    </>
  );
}
