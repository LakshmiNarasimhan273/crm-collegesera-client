import { useEffect, useState } from 'react';
import api from '../api';
import { Pager, fmt } from '../components/ui';

export default function Audit() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  useEffect(() => { api.get('/audit', { params: { page } }).then((r) => setData(r.data)); }, [page]);
  return (
    <>
      <div className="page-h"><h1>Audit log</h1></div>
      <table className="tbl">
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>{data.items.map((a) => (
          <tr key={a._id}><td className="nowrap">{fmt(a.createdAt)}</td><td>{a.userEmail}</td><td>{a.action}</td><td className="detail">{a.details && Object.keys(a.details).length ? JSON.stringify(a.details) : ''}</td></tr>
        ))}</tbody>
      </table>
      <Pager page={page} total={data.total} onPage={setPage} />
    </>
  );
}
