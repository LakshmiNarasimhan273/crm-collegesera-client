// import { createContext, useContext, useEffect, useState } from 'react';
// import api from './api';

// const Ctx = createContext(null);
// export const useAuth = () => useContext(Ctx);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     if (!localStorage.getItem('cs_token')) return setReady(true);
//     api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => {}).finally(() => setReady(true));
//   }, []);

//   const login = async (email, password) => {
//     const { data } = await api.post(
//       "https://backend-crm-pro-b81w.vercel.app/auth/login",
//       { email, password },
//     );
//     localStorage.setItem('cs_token', data.token);
//     setUser(data.user);
//   };
//   const logout = () => { localStorage.removeItem('cs_token'); setUser(null); };
//   const canEdit = user && ['admin', 'ops'].includes(user.role);

//   return <Ctx.Provider value={{ user, ready, login, logout, canEdit, isAdmin: user?.role === 'admin' }}>{children}</Ctx.Provider>;
// }

import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cs_token')) {
      setReady(true);
      return;
    }

    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('cs_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('cs_token');
    setUser(null);
  };

  const canEdit = user && ['admin', 'ops'].includes(user.role);

  return (
    <Ctx.Provider
      value={{
        user,
        ready,
        login,
        logout,
        canEdit,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </Ctx.Provider>
  );
}