import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, update, flushSync, uid } from './db.js';
import * as auth from './auth.js';
import * as biz from './business.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const FRONTEND = join(__dirname, '..', 'frontend');

// Seed admin
auth.seedAdmin();

// --- CORS + helpers ---
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 5e6) reject(new Error('payload too large')); });
    req.on('end', () => { if (!buf) return resolve({}); try { resolve(JSON.parse(buf)); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}

function authMiddleware(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const data = auth.verifyToken(token);
  if (!data) return null;
  const db = get();
  const user = db.users.find(u => u.id === data.userId);
  if (!user || !user.active) return null;
  return { userId: data.userId, role: user.role, user };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // API
  if (path.startsWith('/api/')) {
    try {
      await handleApi(req, res, path, url);
    } catch (e) {
      console.error(e);
      send(res, 500, { error: 'internal_error', message: e.message });
    }
    return;
  }

  // Static
  let filePath = path === '/' ? '/index.html' : path;
  const full = join(FRONTEND, filePath);
  if (!existsSync(full)) { res.writeHead(404); res.end('Not found'); return; }
  const ext = extname(full);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(full));
});

async function handleApi(req, res, path, url) {
  // ---- AUTH ----
  if (path === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { ok, user, reason } = auth.authenticate(body.email, body.password);
    if (!ok) return send(res, 401, { error: reason });
    const token = auth.signToken({ userId: user.id, role: user.role });
    return send(res, 200, { token, user: { id:user.id, name:user.name, email:user.email, role:user.role, mustChangePassword:user.mustChangePassword } });
  }
  if (path === '/api/auth/register' && req.method === 'POST') {
    const body = await parseBody(req);
    const r = auth.register(body);
    if (!r.ok) return send(res, 400, { error: r.reason });
    const user = r.user;
    const token = auth.signToken({ userId: user.id, role: user.role });
    return send(res, 201, { token, user: { id:user.id, name:user.name, email:user.email, role:user.role } });
  }
  if (path === '/api/auth/me' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const u = ctx.user;
    return send(res, 200, { id:u.id, name:u.name, email:u.email, role:u.role, mustChangePassword:u.mustChangePassword });
  }
  if (path === '/api/auth/change-password' && req.method === 'POST') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const body = await parseBody(req);
    const r = auth.changePassword(ctx.userId, body.oldPassword, body.newPassword);
    if (!r.ok) return send(res, 400, { error: r.reason });
    return send(res, 200, { ok:true });
  }

  // ---- USERS (admin) ----
  if (path === '/api/users' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx || ctx.role !== 'admin') return send(res, 403, { error:'forbidden' });
    return send(res, 200, auth.listUsers());
  }
  if (path === '/api/users' && req.method === 'POST') {
    const ctx = authMiddleware(req);
    if (!ctx || ctx.role !== 'admin') return send(res, 403, { error:'forbidden' });
    const body = await parseBody(req);
    const r = auth.register({ ...body, role: body.role || 'vendas' });
    if (!r.ok) return send(res, 400, { error: r.reason });
    return send(res, 201, r.user);
  }
  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch) {
    const ctx = authMiddleware(req);
    if (!ctx || ctx.role !== 'admin') return send(res, 403, { error:'forbidden' });
    const id = userMatch[1];
    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      if (typeof body.active === 'boolean') auth.toggleUser(id, body.active);
      return send(res, 200, { ok:true });
    }
  }

  // ---- PRODUCTS ----
  if (path === '/api/products' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const search = url.searchParams.get('search');
    const active = url.searchParams.get('active');
    const filter = {};
    if (search) filter.search = search;
    if (active !== null) filter.active = active === 'true';
    return send(res, 200, biz.listProducts(filter));
  }
  if (path === '/api/products' && req.method === 'POST') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const body = await parseBody(req);
    const r = biz.createProduct({ ...body, userId: ctx.userId });
    if (!r.ok) return send(res, 400, { error: r.reason });
    return send(res, 201, r.product);
  }
  const prodMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (prodMatch) {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const id = prodMatch[1];
    if (req.method === 'GET') {
      const p = biz.getProduct(id);
      if (!p) return send(res, 404, { error:'notfound' });
      return send(res, 200, p);
    }
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const r = biz.updateProduct(id, { ...body, userId: ctx.userId });
      if (!r.ok) return send(res, 400, { error: r.reason });
      return send(res, 200, r.product);
    }
    if (req.method === 'DELETE') {
      const r = biz.deleteProduct(id);
      if (!r.ok) return send(res, 400, { error: r.reason });
      return send(res, 200, { ok:true });
    }
  }
  if (path.match(/^\/api\/products\/[^/]+\/stock$/) && req.method === 'POST') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const id = path.split('/')[3];
    const body = await parseBody(req);
    const r = biz.adjustStock(id, body.qty, body.type, body.reason, ctx.userId);
    if (!r.ok) return send(res, 400, { error: r.reason });
    return send(res, 200, r.product);
  }

  // ---- CUSTOMERS ----
  if (path === '/api/customers' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const search = url.searchParams.get('search');
    const filter = search ? { search } : {};
    return send(res, 200, biz.listCustomers(filter));
  }
  if (path === '/api/customers' && req.method === 'POST') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const body = await parseBody(req);
    const r = biz.createCustomer(body);
    if (!r.ok) return send(res, 400, { error: r.reason });
    return send(res, 201, r.customer);
  }
  const custMatch = path.match(/^\/api\/customers\/([^/]+)$/);
  if (custMatch) {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const id = custMatch[1];
    if (req.method === 'GET') {
      const c = biz.getCustomer(id);
      if (!c) return send(res, 404, { error:'notfound' });
      return send(res, 200, c);
    }
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const r = biz.updateCustomer(id, body);
      if (!r.ok) return send(res, 400, { error: r.reason });
      return send(res, 200, r.customer);
    }
    if (req.method === 'DELETE') {
      const r = biz.deleteCustomer(id);
      if (!r.ok) return send(res, 400, { error: r.reason });
      return send(res, 200, { ok:true });
    }
  }

  // ---- ORDERS ----
  if (path === '/api/orders' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const filter = {};
    if (url.searchParams.get('status')) filter.status = url.searchParams.get('status');
    if (url.searchParams.get('customerId')) filter.customerId = url.searchParams.get('customerId');
    if (url.searchParams.get('from')) filter.from = url.searchParams.get('from');
    if (url.searchParams.get('to')) filter.to = url.searchParams.get('to');
    if (url.searchParams.get('mine') === 'true') filter.userId = ctx.userId;
    return send(res, 200, biz.listOrders(filter));
  }
  if (path === '/api/orders' && req.method === 'POST') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const body = await parseBody(req);
    const r = biz.createOrder(body, ctx.userId);
    if (!r.ok) return send(res, 400, { error: r.reason, detail: r });
    return send(res, 201, { order: r.order, items: r.items });
  }
  const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch) {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const id = orderMatch[1];
    if (req.method === 'GET') {
      const o = biz.getOrder(id);
      if (!o) return send(res, 404, { error:'notfound' });
      return send(res, 200, o);
    }
    if (req.method === 'DELETE') {
      const r = biz.deleteOrder(id);
      if (!r.ok) return send(res, 400, { error: r.reason });
      return send(res, 200, { ok:true });
    }
  }
  const statusMatch = path.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (statusMatch && req.method === 'PATCH') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    const body = await parseBody(req);
    const r = biz.updateOrderStatus(statusMatch[1], body.status);
    if (!r.ok) return send(res, 400, { error: r.reason });
    return send(res, 200, r.order);
  }

  // ---- REPORTS ----
  if (path === '/api/reports/dashboard' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    return send(res, 200, biz.dashboard());
  }
  if (path === '/api/reports/sales' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    return send(res, 200, biz.salesReport(url.searchParams.get('from'), url.searchParams.get('to')));
  }
  if (path === '/api/reports/stock' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    return send(res, 200, biz.stockReport());
  }

  // ---- SETTINGS ----
  if (path === '/api/settings' && req.method === 'GET') {
    const ctx = authMiddleware(req);
    if (!ctx) return send(res, 401, { error:'unauthorized' });
    return send(res, 200, get().settings);
  }
  if (path === '/api/settings' && req.method === 'PUT') {
    const ctx = authMiddleware(req);
    if (!ctx || ctx.role !== 'admin') return send(res, 403, { error:'forbidden' });
    const body = await parseBody(req);
    update(d => Object.assign(d.settings, body));
    flushSync();
    return send(res, 200, get().settings);
  }

  send(res, 404, { error:'not_found', path });
}

server.listen(PORT, () => {
  console.log(`\n✅ SaaS Vendas rodando em http://localhost:${PORT}`);
  console.log(`   Login: admin@saasvendas.com / Admin@123\n`);
});