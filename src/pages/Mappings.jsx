import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Field, useToast } from '../components/ui';

const COMMON = ['course', 'specialization', 'campus', 'state', 'city'];

export default function Mappings() {
  const { canEdit } = useAuth();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [sets, setSets] = useState([]);
  const [field, setField] = useState('course');
  const [entries, setEntries] = useState([]);
  const [onMissing, setOnMissing] = useState('passthrough');
  const [paste, setPaste] = useState('');
  const [toast, toastNode] = useToast();

  useEffect(() => { api.get('/clients').then((r) => { setClients(r.data); if (r.data[0]) setClientId(r.data[0]._id); }); }, []);
  const load = () => clientId && api.get('/mappings', { params: { clientId } }).then((r) => setSets(r.data));
  useEffect(() => { load(); }, [clientId]);

  useEffect(() => {
    const s = sets.find((x) => x.field === field);
    setEntries(s ? s.entries : []); setOnMissing(s?.onMissing || 'passthrough');
  }, [field, sets]);

  const save = async () => {
    try { await api.put('/mappings', { clientId, field, entries, onMissing }); await load(); toast(`Saved ${field} mapping`); }
    catch (e) { toast(errMsg(e), true); }
  };
  const importPaste = () => {
    const rows = paste.split('\n').map((l) => l.split(/\t|,/).map((x) => x.trim())).filter((r) => r[0] && r[1]).map(([from, to]) => ({ from, to }));
    setEntries([...entries.filter((e) => !rows.some((r) => r.from.toLowerCase() === e.from.toLowerCase())), ...rows]); setPaste('');
  };
  const set = (i, p) => setEntries(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const fields = [...new Set([...COMMON, ...sets.map((s) => s.field)])];

  return (
    <>
      <div className="page-h"><h1>Master data</h1></div>
      <p className="muted">Translate CollegeSera values into the names each client's CRM expects, for example B.Com to BACHELOR OF COMMERCE.</p>
      <div className="grid">
        <Field label="Client"><select value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
        <Field label="Field"><select value={field} onChange={(e) => setField(e.target.value)}>{fields.map((f) => <option key={f}>{f}</option>)}</select></Field>
        <Field label="Add another field"><input placeholder="Type a field name and press Enter" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { setField(e.target.value.trim()); e.target.value = ''; } }} /></Field>
        <Field label="When a value has no mapping" hint="'Fail' stops the lead so nobody sends a wrong course"><select value={onMissing} onChange={(e) => setOnMissing(e.target.value)}><option value="passthrough">Send the CollegeSera value as it is</option><option value="fail">Fail the lead</option></select></Field>
      </div>

      <table className="tbl">
        <thead><tr><th>CollegeSera value</th><th>Client value</th><th /></tr></thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td><input value={e.from} disabled={!canEdit} onChange={(ev) => set(i, { from: ev.target.value })} /></td>
              <td><input value={e.to} disabled={!canEdit} onChange={(ev) => set(i, { to: ev.target.value })} /></td>
              <td className="r">{canEdit && <button className="btn quiet" onClick={() => setEntries(entries.filter((_, j) => j !== i))}>Remove</button>}</td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td colSpan="3" className="empty">No mappings for {field} yet.</td></tr>}
        </tbody>
      </table>

      {canEdit && (
        <>
          <div className="row"><button className="btn quiet" onClick={() => setEntries([...entries, { from: '', to: '' }])}>Add row</button><button className="btn primary" onClick={save} disabled={!clientId}>Save {field} mapping</button></div>
          <h2>Paste from a spreadsheet</h2>
          <p className="muted">One pair per line, separated by a tab or comma. Existing values are updated.</p>
          <textarea className="code" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'B.Com\tBACHELOR OF COMMERCE'} />
          <div className="row"><button className="btn" onClick={importPaste} disabled={!paste.trim()}>Add pasted rows</button></div>
        </>
      )}
      {toastNode}
    </>
  );
}
