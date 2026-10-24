import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientEditor from './pages/ClientEditor';
import Routing from './pages/Routing';
import Mappings from './pages/Mappings';
import Leads from './pages/Leads';
import Logs from './pages/Logs';
import Audit from './pages/Audit';

function Shell({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const links = [
    ['/', 'Dashboard'], ['/leads', 'Lead queue'], ['/clients', 'Clients'], ['/routing', 'Routing rules'],
    ['/mappings', 'Master data'], ['/logs', 'API logs'], ...(isAdmin ? [['/audit', 'Audit log']] : []),
  ];
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">CollegeSera<span>Lead distribution</span></div>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>{label}</NavLink>
          ))}
        </nav>
        <div className="me">
          <div>{user.name || user.email}</div>
          <small>{user.role}</small>
          <button className="btn quiet" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="center muted">Loading…</div>;
  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<ClientEditor />} />
        <Route path="/clients/:id" element={<ClientEditor />} />
        <Route path="/routing" element={<Routing />} />
        <Route path="/mappings" element={<Mappings />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
