import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const ymd = (d) => d.toISOString().slice(0, 10);
const dayStart = (s) => new Date(`${s}T00:00:00`).toISOString();
const dayEnd = (s) => new Date(`${s}T23:59:59.999`).toISOString();

const SEGS = [['success', 'Delivered', 'var(--ok)'], ['pending', 'In progress', 'var(--info)'], ['failed', 'Failed', 'var(--bad)'], ['duplicates', 'Duplicate', 'var(--warn)']];

function DeliveryBar({ s, slim }) {
  const base = s.eligible || 1;
  return (
    <div className={`dbar ${slim ? 'slim' : ''}`} role="img" aria-label={SEGS.map(([k, l]) => `${l} ${s[k]}`).join(', ')}>
      {SEGS.map(([k, , color]) => s[k] > 0 && <i key={k} style={{ width: `${(s[k] / base) * 100}%`, background: color }} />)}
    </div>
  );
}

export default function Dashboard() {
  const [day, setDay] = useState(ymd(new Date()));
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => api.get('/dashboard', { params: { from: dayStart(day), to: dayEnd(day) } }).then((r) => setData(r.data));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [day]);

  const s = data?.summary;
  return (
    <>
      <div className="page-h">
        <h1>Delivery today</h1>
        <input type="date" value={day} max={ymd(new Date())} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
      </div>
      {!s ? <p className="muted">Loading…</p> : (
        <>
          <section className="hero">
            <p className="hero-line">
              <b>{s.success.toLocaleString()}</b> of <b>{s.eligible.toLocaleString()}</b> eligible leads delivered
              <span className="rate">{s.successRate}% success</span>
            </p>
            <DeliveryBar s={s} />
            <ul className="legend">
              {SEGS.map(([k, label, color]) => <li key={k}><i style={{ background: color }} />{label} <b>{s[k].toLocaleString()}</b></li>)}
            </ul>
          </section>

          <dl className="facts">
            <div><dt>Received</dt><dd>{s.total.toLocaleString()}</dd></div>
            <div><dt>No route matched</dt><dd>{s.unrouted.toLocaleString()}</dd></div>
            <div><dt>Eligible</dt><dd>{s.eligible.toLocaleString()}</dd></div>
            <div><dt>Needs attention</dt><dd><Link to="/leads?status=failed">{s.failed.toLocaleString()} failed</Link></dd></div>
          </dl>

          <h2>By client</h2>
          {data.clients.length === 0 ? <p className="muted">No leads were routed to a client on this day.</p> : (
            <table className="tbl">
              <thead><tr><th>Client</th><th>Total</th><th>Delivered</th><th>Failed</th><th>In progress</th><th>Duplicate</th><th style={{ width: '22%' }}>Split</th></tr></thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.clientId}>
                    <td><Link to={`/leads?clientId=${c.clientId}`}>{c.name}</Link></td>
                    <td className="num">{c.total.toLocaleString()}</td>
                    <td className="num">{c.success.toLocaleString()}</td>
                    <td className="num">{c.failed ? <Link to={`/leads?clientId=${c.clientId}&status=failed`}>{c.failed.toLocaleString()}</Link> : 0}</td>
                    <td className="num">{c.pending.toLocaleString()}</td>
                    <td className="num">{c.duplicates.toLocaleString()}</td>
                    <td><DeliveryBar s={c} slim /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
