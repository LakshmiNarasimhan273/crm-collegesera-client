import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';
import { Field, Json, KVEditor, StatusBadge, useToast } from '../components/ui';

const TABS = ['Connection', 'Authentication', 'Payload', 'Response and rules', 'Test and activate'];
const VARS = ['lead.name', 'lead.email', 'lead.mobile', 'lead.state', 'lead.city', 'lead.college', 'lead.course', 'lead.specialization', 'lead.campus', 'lead.lead_id',
  'campaign.name', 'campaign.medium', 'campaign.source', 'client.collegeId', 'secrets.<name>', 'now'];
const SAMPLE = { lead_id: 'TEST-0001', name: 'Test Student', email: 'test.student@example.com', mobile: '9000000001', state: 'Tamil Nadu', city: 'Coimbatore', college: 'Test College', course: 'B.Com', specialization: 'Accounting', campaign: 'Test Campaign' };

const blank = {
  name: '', crmType: 'generic_rest', apiUrl: '', method: 'POST', contentType: 'json', timeoutMs: 15000, headers: [], queryParams: [],
  payloadTemplate: '{\n  "name": "{{lead.name}}",\n  "mobile": "{{lead.mobile}}"\n}',
  authType: 'none', apiKeyIn: 'header', apiKeyName: '', apiKeySecret: 'apiKey',
  oauth: { tokenUrl: '', grantType: 'refresh_token', scope: '', tokenPrefix: 'Bearer' },
  defaultValues: { collegeId: '', source: '', medium: '', campaign: '' },
  responseMapping: { successStatusCodes: '', successPath: '', successValue: '', externalIdPath: '', errorPath: '' },
  duplicate: { enabled: true, keys: ['mobile'], mode: 'any', scope: 'client' },
  retry: { maxRetries: 3, delaysMinutes: '1,5,15', retryOn4xx: false },
};

// server shape -> form shape
const toForm = (c) => ({
  ...blank, ...c,
  oauth: { ...blank.oauth, ...c.oauth }, defaultValues: { ...blank.defaultValues, ...c.defaultValues },
  responseMapping: { ...blank.responseMapping, ...c.responseMapping, successStatusCodes: (c.responseMapping?.successStatusCodes || []).join(', ') },
  duplicate: { ...blank.duplicate, ...c.duplicate },
  retry: { ...blank.retry, ...c.retry, delaysMinutes: (c.retry?.delaysMinutes || [1, 5, 15]).join(', ') },
});
const nums = (s) => String(s).split(',').map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);

export default function ClientEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { canEdit } = useAuth();
  const [toast, toastNode] = useToast();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(blank);
  const [saved, setSaved] = useState(null); // server copy (for status, lastTest, saved secret names)
  const [secretNames, setSecretNames] = useState([]);
  const [secretValues, setSecretValues] = useState({});
  const [presets, setPresets] = useState({});
  const [sample, setSample] = useState(JSON.stringify(SAMPLE, null, 2));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/clients/presets').then((r) => setPresets(r.data));
    if (id) api.get(`/clients/${id}`).then((r) => { setSaved(r.data); setForm(toForm(r.data)); setSecretNames(r.data.secretNames); });
  }, [id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const nest = (key, patch) => setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));
  const readOnly = !canEdit;

  const applyPreset = (key) => {
    const { label, secretNames: sn = [], ...p } = presets[key] || {};
    setForm((f) => toForm({ ...blank, ...p, name: f.name, crmType: key, defaultValues: f.defaultValues }));
    setSecretNames(sn);
  };

  const save = async () => {
    setBusy(true);
    try {
      JSON.parse(form.payloadTemplate || '{}');
    } catch {
      setBusy(false); setTab(2); return toast('Payload is not valid JSON. Fix it on the Payload tab.', true);
    }
    const body = {
      ...form, secretNames, secrets: secretValues,
      responseMapping: { ...form.responseMapping, successStatusCodes: nums(form.responseMapping.successStatusCodes) },
      retry: { ...form.retry, maxRetries: Number(form.retry.maxRetries), delaysMinutes: nums(form.retry.delaysMinutes) },
      timeoutMs: Number(form.timeoutMs),
    };
    try {
      const r = saved ? await api.put(`/clients/${saved._id}`, body) : await api.post('/clients', body);
      setSaved(r.data); setForm(toForm(r.data)); setSecretNames(r.data.secretNames); setSecretValues({});
      toast('Saved');
      if (!saved) nav(`/clients/${r.data._id}`, { replace: true });
    } catch (e) { toast(errMsg(e), true); } finally { setBusy(false); }
  };

  const sendTest = async () => {
    setBusy(true); setResult(null);
    try {
      const lead = JSON.parse(sample);
      const r = await api.post(`/clients/${saved._id}/test`, { lead });
      setResult(r.data);
      setSaved((await api.get(`/clients/${saved._id}`)).data);
    } catch (e) { toast(e instanceof SyntaxError ? 'Sample lead is not valid JSON' : errMsg(e), true); } finally { setBusy(false); }
  };

  const setStatus = async (status) => {
    try { const r = await api.post(`/clients/${saved._id}/status`, { status }); setSaved(r.data); toast(status === 'active' ? 'Client activated' : `Client set to ${status}`); }
    catch (e) { toast(errMsg(e), true); }
  };

  const toggleKey = (k) => nest('duplicate', { keys: form.duplicate.keys.includes(k) ? form.duplicate.keys.filter((x) => x !== k) : [...form.duplicate.keys, k] });
  const dirty = !saved || JSON.stringify(toForm(saved)) !== JSON.stringify(form) || Object.keys(secretValues).length > 0;

  return (
    <>
      <div className="page-h">
        <h1>{saved ? saved.name : 'New client'} {saved && <StatusBadge status={saved.status} />}</h1>
        {canEdit && <button className="btn primary" onClick={save} disabled={busy || !form.name || !dirty}>Save changes</button>}
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t, i) => <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{t}</button>)}
      </div>

      <fieldset disabled={readOnly} className="panel">
        {tab === 0 && (
          <div className="grid">
            <Field label="Client name"><input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rathinam College" /></Field>
            <Field label="CRM" hint="Choosing a CRM fills in a starting configuration. Check it against the vendor's API docs.">
              <select value={form.crmType} onChange={(e) => applyPreset(e.target.value)}>
                {Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="API URL" wide><input value={form.apiUrl} onChange={(e) => set({ apiUrl: e.target.value })} placeholder="https://clientcrm.com/api/leads" /></Field>
            <Field label="HTTP method">
              <select value={form.method} onChange={(e) => set({ method: e.target.value })}>{['POST', 'PUT', 'PATCH', 'GET', 'DELETE'].map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
            <Field label="Body format">
              <select value={form.contentType} onChange={(e) => set({ contentType: e.target.value })}><option value="json">JSON</option><option value="form">Form (urlencoded)</option></select>
            </Field>
            <Field label="Timeout (ms)"><input type="number" value={form.timeoutMs} onChange={(e) => set({ timeoutMs: e.target.value })} /></Field>
            <Field label="College ID" hint="Available in the payload as {{client.collegeId}}"><input value={form.defaultValues.collegeId} onChange={(e) => nest('defaultValues', { collegeId: e.target.value })} /></Field>
            <Field label="Source" hint="{{campaign.source}}. Overrides the lead's own source."><input value={form.defaultValues.source} onChange={(e) => nest('defaultValues', { source: e.target.value })} placeholder="collegedunia" /></Field>
            <Field label="Medium" hint="{{campaign.medium}}"><input value={form.defaultValues.medium} onChange={(e) => nest('defaultValues', { medium: e.target.value })} placeholder="Google" /></Field>
            <Field label="Campaign" hint="Used when the lead has no campaign"><input value={form.defaultValues.campaign} onChange={(e) => nest('defaultValues', { campaign: e.target.value })} /></Field>
            <Field label="Headers" wide hint="Values can use {{secrets.name}}"><KVEditor rows={form.headers} onChange={(headers) => set({ headers })} keyLabel="Header" /></Field>
            <Field label="Query parameters" wide><KVEditor rows={form.queryParams} onChange={(queryParams) => set({ queryParams })} keyLabel="Parameter" /></Field>
          </div>
        )}

        {tab === 1 && (
          <div className="grid">
            <Field label="Authentication type">
              <select value={form.authType} onChange={(e) => set({ authType: e.target.value })}>
                <option value="none">None (use headers or query parameters)</option><option value="api_key">API key</option>
                <option value="bearer">Bearer token</option><option value="basic">Basic (username and password)</option><option value="oauth2">OAuth 2.0</option>
              </select>
            </Field>
            {form.authType === 'api_key' && <>
              <Field label="Send key in"><select value={form.apiKeyIn} onChange={(e) => set({ apiKeyIn: e.target.value })}><option value="header">Header</option><option value="query">Query parameter</option></select></Field>
              <Field label="Name"><input value={form.apiKeyName} onChange={(e) => set({ apiKeyName: e.target.value })} placeholder="x-api-key" /></Field>
              <Field label="Secret holding the key"><input value={form.apiKeySecret} onChange={(e) => set({ apiKeySecret: e.target.value })} /></Field>
            </>}
            {form.authType === 'oauth2' && <>
              <Field label="Token URL" wide><input value={form.oauth.tokenUrl} onChange={(e) => nest('oauth', { tokenUrl: e.target.value })} /></Field>
              <Field label="Grant type"><select value={form.oauth.grantType} onChange={(e) => nest('oauth', { grantType: e.target.value })}><option value="refresh_token">Refresh token</option><option value="client_credentials">Client credentials</option></select></Field>
              <Field label="Header prefix" hint="Bearer, or Zoho-oauthtoken for Zoho"><input value={form.oauth.tokenPrefix} onChange={(e) => nest('oauth', { tokenPrefix: e.target.value })} /></Field>
              <Field label="Scope (optional)"><input value={form.oauth.scope} onChange={(e) => nest('oauth', { scope: e.target.value })} /></Field>
            </>}

            <div className="wide">
              <h3>Stored credentials</h3>
              <p className="muted">Encrypted at rest and never shown again after saving. Use them in headers, query parameters or the payload as <code>{'{{secrets.name}}'}</code>. Bearer uses <code>token</code>, Basic uses <code>username</code> and <code>password</code>, OAuth uses <code>clientId</code>, <code>clientSecret</code>, <code>refreshToken</code>.</p>
              {secretNames.map((n) => (
                <div className="kv-row" key={n}>
                  <input value={n} readOnly />
                  <input type="password" autoComplete="new-password" placeholder={saved?.secretNames.includes(n) ? 'Saved. Type to replace.' : 'Enter value'} value={secretValues[n] || ''} onChange={(e) => setSecretValues({ ...secretValues, [n]: e.target.value })} />
                  <button type="button" className="btn quiet" onClick={() => setSecretNames(secretNames.filter((x) => x !== n))}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn quiet" onClick={() => { const n = prompt('Credential name (letters, numbers, underscore)'); if (n && /^[A-Za-z_]\w*$/.test(n) && !secretNames.includes(n)) setSecretNames([...secretNames, n]); }}>Add credential</button>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="stack">
            <p className="muted">Write the exact JSON the client's API expects. Placeholders are replaced for every lead. A placeholder on its own keeps its type, so <code>{'"{{lead}}"'}</code> sends the whole lead object.</p>
            <textarea className="code" rows={20} spellCheck={false} value={form.payloadTemplate} onChange={(e) => set({ payloadTemplate: e.target.value })} />
            <p className="vars">{VARS.map((v) => <code key={v}>{`{{${v}}}`}</code>)}</p>
          </div>
        )}

        {tab === 3 && (
          <div className="grid">
            <h3 className="wide">How to read the response</h3>
            <Field label="Success status codes" hint="Blank means any 2xx"><input value={form.responseMapping.successStatusCodes} onChange={(e) => nest('responseMapping', { successStatusCodes: e.target.value })} placeholder="200, 201" /></Field>
            <Field label="Client lead ID path" hint="e.g. data.lead_id"><input value={form.responseMapping.externalIdPath} onChange={(e) => nest('responseMapping', { externalIdPath: e.target.value })} /></Field>
            <Field label="Also require this field" hint="For APIs that return 200 with an error body"><input value={form.responseMapping.successPath} onChange={(e) => nest('responseMapping', { successPath: e.target.value })} placeholder="Status" /></Field>
            <Field label="…to equal"><input value={form.responseMapping.successValue} onChange={(e) => nest('responseMapping', { successValue: e.target.value })} placeholder="Success" /></Field>
            <Field label="Error message path" hint="e.g. message"><input value={form.responseMapping.errorPath} onChange={(e) => nest('responseMapping', { errorPath: e.target.value })} /></Field>

            <h3 className="wide">Duplicates</h3>
            <label className="check wide"><input type="checkbox" checked={form.duplicate.enabled} onChange={(e) => nest('duplicate', { enabled: e.target.checked })} /> Skip leads that were already pushed</label>
            <div className="wide checks">
              {[['mobile', 'Mobile'], ['email', 'Email'], ['leadId', 'CollegeSera lead ID']].map(([k, l]) => (
                <label className="check" key={k}><input type="checkbox" checked={form.duplicate.keys.includes(k)} onChange={() => toggleKey(k)} /> {l}</label>
              ))}
            </div>
            <Field label="A lead is a duplicate when"><select value={form.duplicate.mode} onChange={(e) => nest('duplicate', { mode: e.target.value })}><option value="any">Any selected field matches</option><option value="all">All selected fields match</option></select></Field>
            <Field label="Look across"><select value={form.duplicate.scope} onChange={(e) => nest('duplicate', { scope: e.target.value })}><option value="client">This client only</option><option value="global">All clients</option></select></Field>

            <h3 className="wide">Retries</h3>
            <Field label="Maximum retries" hint="After the first attempt"><input type="number" min="0" max="10" value={form.retry.maxRetries} onChange={(e) => nest('retry', { maxRetries: e.target.value })} /></Field>
            <Field label="Wait before each retry (minutes)" hint="The last value repeats if there are more retries"><input value={form.retry.delaysMinutes} onChange={(e) => nest('retry', { delaysMinutes: e.target.value })} /></Field>
            <label className="check wide"><input type="checkbox" checked={form.retry.retryOn4xx} onChange={(e) => nest('retry', { retryOn4xx: e.target.checked })} /> Also retry 4xx errors (normally these mean the data was rejected, so they fail straight away)</label>
          </div>
        )}
      </fieldset>

      {tab === 4 && (
        <div className="panel stack">
          {!saved ? <p className="empty">Save this client first, then come back to send a test lead.</p> : (
            <>
              {dirty && <p className="warnline">You have unsaved changes. Save before testing.</p>}
              <p className="warnline">The test lead is a real lead in the client's CRM. Use a clearly fake name and mobile number, and ask the client to delete it.</p>
              <Field label="Test lead"><textarea className="code" rows={11} value={sample} onChange={(e) => setSample(e.target.value)} /></Field>
              {canEdit && <div className="row">
                <button className="btn" onClick={sendTest} disabled={busy || dirty}>{busy ? 'Sending…' : 'Send test lead'}</button>
                {saved.status !== 'active'
                  ? <button className="btn primary" onClick={() => setStatus('active')} disabled={!saved.lastTest?.success}>Activate client</button>
                  : <button className="btn" onClick={() => setStatus('inactive')}>Pause client</button>}
              </div>}
              {saved.lastTest && !result && <p>Last test: <b>{saved.lastTest.success ? 'passed' : 'failed'}</b>{saved.lastTest.httpStatus ? ` (HTTP ${saved.lastTest.httpStatus})` : ''}{saved.lastTest.error ? `, ${saved.lastTest.error}` : ''}</p>}
              {result && (
                <div className={`result ${result.success ? 'okr' : 'badr'}`}>
                  <h3>{result.success ? 'Test passed' : 'Test failed'}{result.httpStatus ? `, HTTP ${result.httpStatus}` : ''}{result.durationMs ? `, ${result.durationMs} ms` : ''}</h3>
                  {result.error && <p>{result.error}</p>}
                  {result.externalLeadId && <p>Client lead ID: <b>{result.externalLeadId}</b></p>}
                  <h4>Request sent (credentials hidden)</h4><Json value={result.request} />
                  <h4>Response</h4><Json value={result.responseBody} />
                </div>
              )}
            </>
          )}
        </div>
      )}
      {toastNode}
    </>
  );
}
