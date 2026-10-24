import { useEffect, useState } from 'react';
import api from '../api';
import { Pager, fmt } from '../components/ui';
import { LogEntry } from './Leads';

export default function Logs() {
  const [clients, setClients] = useState([]);
  const [f, setF] = useState({ clientId: '', success: '', leadId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });

  useEffect(() => { api.get('/clients').then((r) => setClients(r.data)); }, []);
  useEffect(() => { api.get('/logs', { params: { ...f, page } }).then((r) => setData(r.data)); }, [f, page]);
  const set = (p) => { setF({ ...f, ...p }); setPage(1); };

  return (
    <>
      <div className="page-h"><h1>API logs</h1></div>
      <p className="muted">Every request sent to a client CRM. Credentials are removed before anything is stored.</p>
      <div className="filters">
        <select value={f.clientId} onChange={(e) => set({ clientId: e.target.value })}><option value="">All clients</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
        <select value={f.success} onChange={(e) => set({ success: e.target.value })}><option value="">All results</option><option value="true">Success</option><option value="false">Failed</option></select>
        <input placeholder="Lead ID" value={f.leadId} onChange={(e) => set({ leadId: e.target.value })} />
      </div>
      {data.items.map((l) => (
        <div key={l._id} className="logrow"><div className="logmeta"><b>{l.leadId}</b><span>{l.clientName}</span><span className="muted sm">{fmt(l.createdAt)}</span></div><LogEntry l={l} /></div>
      ))}
      {data.items.length === 0 && <p className="empty">No API calls match these filters.</p>}
      <Pager page={page} total={data.total} onPage={setPage} />
    </>
  );
}
