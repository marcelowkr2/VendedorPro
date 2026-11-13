// api.js — cliente HTTP para o backend
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : '';

const token = () => localStorage.getItem('sv_token');

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const err = new Error((data && (data.error || data.message)) || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  me: () => request('GET', '/api/auth/me'),
  changePassword: (oldPassword, newPassword) => request('POST', '/api/auth/change-password', { oldPassword, newPassword }),
  users: {
    list: () => request('GET', '/api/users'),
    create: (u) => request('POST', '/api/users', u),
    toggle: (id, active) => request('PATCH', '/api/users/' + id, { active }),
  },
  products: {
    list: (p = {}) => {
      const qs = new URLSearchParams(p).toString();
      return request('GET', '/api/products' + (qs ? '?' + qs : ''));
    },
    get: (id) => request('GET', '/api/products/' + id),
    create: (p) => request('POST', '/api/products', p),
    update: (id, p) => request('PUT', '/api/products/' + id, p),
    delete: (id) => request('DELETE', '/api/products/' + id),
    stock: (id, qty, type, reason) => request('POST', '/api/products/' + id + '/stock', { qty, type, reason }),
  },
  customers: {
    list: (p = {}) => {
      const qs = new URLSearchParams(p).toString();
      return request('GET', '/api/customers' + (qs ? '?' + qs : ''));
    },
    get: (id) => request('GET', '/api/customers/' + id),
    create: (c) => request('POST', '/api/customers', c),
    update: (id, c) => request('PUT', '/api/customers/' + id, c),
    delete: (id) => request('DELETE', '/api/customers/' + id),
  },
  orders: {
    list: (p = {}) => {
      const qs = new URLSearchParams(p).toString();
      return request('GET', '/api/orders' + (qs ? '?' + qs : ''));
    },
    get: (id) => request('GET', '/api/orders/' + id),
    create: (o) => request('POST', '/api/orders', o),
    status: (id, status) => request('PATCH', '/api/orders/' + id + '/status', { status }),
    delete: (id) => request('DELETE', '/api/orders/' + id),
  },
  reports: {
    dashboard: () => request('GET', '/api/reports/dashboard'),
    sales: (from, to) => request('GET', '/api/reports/sales?from=' + (from||'') + '&to=' + (to||'')),
    stock: () => request('GET', '/api/reports/stock'),
  },
  settings: {
    get: () => request('GET', '/api/settings'),
    update: (s) => request('PUT', '/api/settings', s),
  },
};

window.api = api;