import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Drawer, Field, Json, useToast } from '../components/ui';

const OPS = [['eq', 'is'], ['neq', 'is not'], ['in', 'is one of (comma separated)'], ['nin', 'is none of'], ['contains', 'contains'], ['startsWith', 'starts with'], ['regex', 'matches pattern'], ['exists', 'has a value']];
const FIELDS = ['college', 'course', 'specialization', 'state', 'city', 'campus', 'source', 'campaign', 'medium'];
const newRule = () => ({ name: '', priority: 100, active: true, match: 'all', conditions: [{ field: 'college', op: 'eq', value: '' }], strategy: 'single', targets: [{ clientId: '', weight: 1 }], stopOnMatch: true });

export default function Routing() {
  const { canEdit } = useAuth();
  const [rules, setRules] = useState([]);
  const [clients, setClients] = useState([]);
  const [edit, setEdit] = useState(null);
  const [probe, setProbe] = useState('{\n  "college": "Rathinam",\n  "course": "B.Com",\n  "state": "Tamil Nadu"\n}');
  const [probeOut, setProbeOut] = useState(null);
  const [toast, toastNode] = useToast();

  const load = () => api.get('/routing').then((r) => setRules(r.data));
  useEffect(() => { load(); api.get('/clients').then((r) => setClients(r.data)); }, []);
  const cname = (id) => clients.find((c) => c._id === id)?.name || '—';

  const save = async () => {
    try {
      const body = { ...edit, targets: edit.targets.filter((t) => t.clientId), priority: Number(edit.priority) };
      if (!body.targets.length) return toast('Choose at least one destination client', true);
      edit._id ? await api.put(`/routing/${edit._id}`, body) : await api.post('/routing', body);
      setEdit(null); load(); toast('Rule saved');
    } catch (e) { toast(errMsg(e), true); }
  };
  const remove = async (r) => { if (confirm(`Delete rule "${r.name}"?`)) { await api.delete(`/routing/${r._id}`); load(); } };
  const test = async () => {
    try { const r = await api.post('/routing/preview', JSON.parse(probe)); setProbeOut(r.data.length ? r.data.map((h) => `${cname(h.clientId)} (rule: ${h.ruleName})`) : ['No rule matches. This lead would be held as "No route".']); }
    catch (e) { toast(e instanceof SyntaxError ? 'Lead is not valid JSON' : errMsg(e), true); }
  };

  const setCond = (i, p) => setEdit({ ...edit, conditions: edit.conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const setTarget = (i, p) => setEdit({ ...edit, targets: edit.targets.map((t, j) => (j === i ? { ...t, ...p } : t)) });

  return (
    <>
      <div className="page-h"><h1>Routing rules</h1>{canEdit && <button className="btn primary" onClick={() => setEdit(newRule())}>Add rule</button>}</div>
      <p className="muted">Rules run from the lowest priority number up. The first rule that matches decides the destination.</p>
      {rules.length === 0 ? <p className="empty">No rules yet. Leads that match no rule are kept as "No route".</p> : (
        <table className="tbl">
          <thead><tr><th>Priority</th><th>Rule</th><th>When</th><th>Send to</th><th /></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r._id} className={r.active ? '' : 'dim'}>
                <td className="num">{r.priority}</td>
                <td>{r.name}{!r.active && ' (off)'}</td>
                <td>{r.conditions.length ? r.conditions.map((c) => `${c.field} ${c.op} ${c.value ?? ''}`).join(r.match === 'all' ? ' and ' : ' or ') : 'Every lead'}</td>
                <td>{r.targets.map((t) => cname(t.clientId)).join(', ')}{r.strategy !== 'single' && ` (${r.strategy.replace('_', ' ')})`}</td>
                <td className="r">{canEdit && <><button className="btn quiet" onClick={() => setEdit(r)}>Edit</button><button className="btn quiet" onClick={() => remove(r)}>Delete</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Check a lead</h2>
      <div className="split">
        <textarea className="code" rows={6} value={probe} onChange={(e) => setProbe(e.target.value)} />
        <div><button className="btn" onClick={test}>Where would it go?</button>{probeOut && <ul className="plain">{probeOut.map((l) => <li key={l}>{l}</li>)}</ul>}</div>
      </div>

      {edit && (
        <Drawer title={edit._id ? 'Edit rule' : 'Add rule'} onClose={() => setEdit(null)}>
          <div className="grid">
            <Field label="Rule name"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Rathinam B.Com to NPF" /></Field>
            <Field label="Priority" hint="Lower runs first"><input type="number" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} /></Field>
            <Field label="Conditions must match"><select value={edit.match} onChange={(e) => setEdit({ ...edit, match: e.target.value })}><option value="all">All of them</option><option value="any">Any of them</option></select></Field>
            <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Rule is on</label>
            <div className="wide">
              <h3>Conditions</h3>
              {edit.conditions.map((c, i) => (
                <div className="cond" key={i}>
                  <input list="lead-fields" value={c.field} onChange={(e) => setCond(i, { field: e.target.value })} />
                  <select value={c.op} onChange={(e) => setCond(i, { op: e.target.value })}>{OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  <input value={c.value || ''} disabled={c.op === 'exists'} onChange={(e) => setCond(i, { value: e.target.value })} />
                  <button className="btn quiet" onClick={() => setEdit({ ...edit, conditions: edit.conditions.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <datalist id="lead-fields">{FIELDS.map((f) => <option key={f} value={f} />)}</datalist>
              <button className="btn quiet" onClick={() => setEdit({ ...edit, conditions: [...edit.conditions, { field: 'college', op: 'eq', value: '' }] })}>Add condition</button>
              <p className="muted">No conditions means every lead matches.</p>
            </div>
            <div className="wide">
              <h3>Destination</h3>
              <Field label="When there are several clients"><select value={edit.strategy} onChange={(e) => setEdit({ ...edit, strategy: e.target.value })}><option value="single">Send to the first client</option><option value="round_robin">Take turns (round robin)</option><option value="weighted">Share by weight</option></select></Field>
              {edit.targets.map((t, i) => (
                <div className="cond" key={i}>
                  <select value={t.clientId} onChange={(e) => setTarget(i, { clientId: e.target.value })}><option value="">Choose client</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                  {edit.strategy === 'weighted' && <input type="number" min="1" value={t.weight} onChange={(e) => setTarget(i, { weight: Number(e.target.value) })} aria-label="Weight" />}
                  <button className="btn quiet" onClick={() => setEdit({ ...edit, targets: edit.targets.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              {edit.strategy !== 'single' && <button className="btn quiet" onClick={() => setEdit({ ...edit, targets: [...edit.targets, { clientId: '', weight: 1 }] })}>Add client</button>}
            </div>
            <label className="check wide"><input type="checkbox" checked={edit.stopOnMatch} onChange={(e) => setEdit({ ...edit, stopOnMatch: e.target.checked })} /> Stop checking later rules once this one matches</label>
          </div>
          <div className="row"><button className="btn primary" onClick={save} disabled={!edit.name}>Save rule</button></div>
        </Drawer>
      )}
      {toastNode}
    </>
  );
}
