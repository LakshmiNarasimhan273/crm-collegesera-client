import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import { StatusBadge, fmt } from '../components/ui';

export default function Clients() {
  const [rows, setRows] = useState(null);
  const { canEdit } = useAuth();
  useEffect(() => { api.get('/clients').then((r) => setRows(r.data)); }, []);

  return (
    <>
      <div className="page-h">
        <h1>Clients</h1>
        {canEdit && <Link className="btn primary" to="/clients/new">Add client</Link>}
      </div>
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? (
        <p className="empty">No clients yet. Add a client, enter its API details, send a test lead, then activate it.</p>
      ) : (
        <table className="tbl">
          <thead><tr><th>Client</th><th>CRM</th><th>Status</th><th>Last test</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c._id}>
                <td><Link to={`/clients/${c._id}`}>{c.name}</Link></td>
                <td>{c.crmType}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{c.lastTest?.at ? `${c.lastTest.success ? 'Passed' : 'Failed'} · ${fmt(c.lastTest.at)}` : <span className="muted">Not tested</span>}</td>
                <td className="r"><Link to={`/clients/${c._id}`}>{canEdit ? 'Edit' : 'View'}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
