// import axios from 'axios';

// const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// api.interceptors.request.use((c) => {
//   const t = localStorage.getItem('cs_token');
//   if (t) c.headers.Authorization = `Bearer ${t}`;
//   return c;
// });

// api.interceptors.response.use(
//   (r) => r,
//   (e) => {
//     if (e.response?.status === 401 && !e.config.url.includes('/auth/login')) {
//       localStorage.removeItem('cs_token');
//       window.location.href = '/login';
//     }
//     return Promise.reject(e);
//   }
// );

// export const errMsg = (e) => e.response?.data?.error || e.message;
// export default api;


import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cs_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      localStorage.removeItem('cs_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const errMsg = (error) =>
  error.response?.data?.error || error.message;

export default api;