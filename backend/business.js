/**
 * business.js — Lógica de negócios: produtos, clientes, pedidos, estoque, relatórios
 */
import { get, update, flushSync, uid } from './db.js';

// ---------- PRODUTOS ----------
export function listProducts(filter = {}) {
  const db = get();
  let items = db.products;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q) || (p.code||'').toLowerCase().includes(q));
  }
  if (filter.active !== undefined) items = items.filter(p => p.active === filter.active);
  return items.slice().sort((a,b) => a.name.localeCompare(b.name));
}

export function getProduct(id) {
  return get().products.find(p => p.id === id) || null;
}

export function createProduct(data) {
  const db = get();
  if (!data.name || !data.code) return { ok:false, reason:'missing' };
  if (db.products.find(p => p.code === data.code)) return { ok:false, reason:'code_exists' };
  const p = {
    id: uid('p'),
    name: data.name.trim(),
    code: data.code.trim(),
    barcode: data.barcode || '',
    category: data.category || '',
    costPrice: Number(data.costPrice) || 0,
    salePrice: Number(data.salePrice) || 0,
    stock: Number(data.stock) || 0,
    minStock: Number(data.minStock) || 0,
    unit: data.unit || 'un',
    active: data.active !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  update(d => d.products.push(p));
  if (p.stock > 0) {
    update(d => d.stock_moves.push({
      id: uid('sm'), productId: p.id, type:'in', qty:p.stock,
      reason:'Saldo inicial', userId:data.userId||null, date:new Date().toISOString()
    }));
  }
  return { ok:true, product:p };
}

export function updateProduct(id, data) {
  const db = get();
  const p = db.products.find(x => x.id === id);
  if (!p) return { ok:false, reason:'notfound' };
  if (data.code && data.code !== p.code) {
    if (db.products.find(x => x.code === data.code)) return { ok:false, reason:'code_exists' };
  }
  const oldStock = p.stock;
  Object.assign(p, {
    name: data.name ?? p.name,
    code: data.code ?? p.code,
    barcode: data.barcode ?? p.barcode,
    category: data.category ?? p.category,
    costPrice: data.costPrice !== undefined ? Number(data.costPrice) : p.costPrice,
    salePrice: data.salePrice !== undefined ? Number(data.salePrice) : p.salePrice,
    stock: data.stock !== undefined ? Number(data.stock) : p.stock,
    minStock: data.minStock !== undefined ? Number(data.minStock) : p.minStock,
    unit: data.unit ?? p.unit,
    active: data.active !== undefined ? data.active : p.active,
    updatedAt: new Date().toISOString(),
  });
  if (data.stock !== undefined && Number(data.stock) !== oldStock) {
    const diff = Number(data.stock) - oldStock;
    update(d => d.stock_moves.push({
      id: uid('sm'), productId:p.id, type: diff>0?'in':'out', qty: Math.abs(diff),
      reason: diff>0 ? 'Ajuste de estoque (entrada)' : 'Ajuste de estoque (saída)',
      userId: data.userId||null, date: new Date().toISOString()
    }));
  }
  flushSync();
  return { ok:true, product:p };
}

export function deleteProduct(id) {
  const db = get();
  if (db.order_items.find(oi => oi.productId === id)) {
    return { ok:false, reason:'has_orders' };
  }
  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) return { ok:false, reason:'notfound' };
  update(d => d.products.splice(idx, 1));
  return { ok:true };
}

export function adjustStock(productId, qty, type, reason, userId) {
  const db = get();
  const p = db.products.find(x => x.id === productId);
  if (!p) return { ok:false, reason:'notfound' };
  const n = Number(qty);
  if (isNaN(n) || n <= 0) return { ok:false, reason:'invalid' };
  if (type === 'in') p.stock += n;
  else if (type === 'out') {
    if (p.stock < n) return { ok:false, reason:'insufficient' };
    p.stock -= n;
  } else return { ok:false, reason:'invalid' };
  update(d => d.stock_moves.push({
    id: uid('sm'), productId, type, qty:n, reason:reason||'Ajuste manual',
    userId: userId||null, date:new Date().toISOString()
  }));
  p.updatedAt = new Date().toISOString();
  flushSync();
  return { ok:true, product:p };
}

// ---------- CLIENTES ----------
export function listCustomers(filter = {}) {
  const db = get();
  let items = db.customers;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter(c => c.name.toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').includes(q) || (c.document||'').includes(q));
  }
  return items.slice().sort((a,b) => a.name.localeCompare(b.name));
}

export function getCustomer(id) {
  return get().customers.find(c => c.id === id) || null;
}

export function createCustomer(data) {
  const db = get();
  if (!data.name) return { ok:false, reason:'missing' };
  const c = {
    id: uid('c'),
    name: data.name.trim(),
    document: data.document || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    city: data.city || '',
    notes: data.notes || '',
    active: true,
    createdAt: new Date().toISOString(),
  };
  update(d => d.customers.push(c));
  return { ok:true, customer:c };
}

export function updateCustomer(id, data) {
  const db = get();
  const c = db.customers.find(x => x.id === id);
  if (!c) return { ok:false, reason:'notfound' };
  Object.assign(c, {
    name: data.name ?? c.name,
    document: data.document ?? c.document,
    phone: data.phone ?? c.phone,
    email: data.email ?? c.email,
    address: data.address ?? c.address,
    city: data.city ?? c.city,
    notes: data.notes ?? c.notes,
    active: data.active !== undefined ? data.active : c.active,
  });
  flushSync();
  return { ok:true, customer:c };
}

export function deleteCustomer(id) {
  const db = get();
  if (db.orders.find(o => o.customerId === id)) return { ok:false, reason:'has_orders' };
  const idx = db.customers.findIndex(c => c.id === id);
  if (idx === -1) return { ok:false, reason:'notfound' };
  update(d => d.customers.splice(idx, 1));
  return { ok:true };
}

// ---------- PEDIDOS ----------
export function listOrders(filter = {}) {
  const db = get();
  let items = db.orders;
  if (filter.status) items = items.filter(o => o.status === filter.status);
  if (filter.customerId) items = items.filter(o => o.customerId === filter.customerId);
  if (filter.userId) items = items.filter(o => o.userId === filter.userId);
  if (filter.from) items = items.filter(o => o.createdAt >= filter.from);
  if (filter.to) items = items.filter(o => o.createdAt <= filter.to);
  return items.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id) {
  const db = get();
  const o = db.orders.find(x => x.id === id);
  if (!o) return null;
  const items = db.order_items.filter(oi => oi.orderId === id);
  const customer = db.customers.find(c => c.id === o.customerId) || null;
  const user = db.users.find(u => u.id === o.userId) || null;
  return { ...o, items, customer, user };
}

export function createOrder(data, userId) {
  const db = get();
  if (!data.customerId) return { ok:false, reason:'missing_customer' };
  if (!Array.isArray(data.items) || !data.items.length) return { ok:false, reason:'missing_items' };
  const customer = db.customers.find(c => c.id === data.customerId);
  if (!customer) return { ok:false, reason:'customer_notfound' };
  // Valida estoque
  const prepared = [];
  for (const it of data.items) {
    const p = db.products.find(x => x.id === it.productId);
    if (!p) return { ok:false, reason:'product_notfound' };
    const qty = Number(it.qty);
    if (isNaN(qty) || qty <= 0) return { ok:false, reason:'invalid_qty' };
    if (p.stock < qty) return { ok:false, reason:'insufficient_stock', product:p.name, available:p.stock };
    prepared.push({ product:p, qty, discount: Number(it.discount)||0, price: Number(it.price)||p.salePrice });
  }
  const orderId = uid('o');
  const order = {
    id: orderId,
    number: 'PED-' + String(db.orders.length + 1).padStart(5,'0'),
    customerId: data.customerId,
    userId: userId || null,
    status: data.status || 'pendente',
    payment: data.payment || 'a_vista',
    notes: data.notes || '',
    discount: Number(data.discount) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Subtotal / total
  let subtotal = 0;
  const items = prepared.map(({ product, qty, discount, price }) => {
    const lineSub = qty * price;
    const lineTotal = lineSub - (lineSub * (discount / 100));
    subtotal += lineTotal;
    return {
      id: uid('oi'),
      orderId,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      qty,
      price,
      discount,
      total: Number(lineTotal.toFixed(2)),
    };
  });
  const discountTotal = subtotal * ((order.discount)/100);
  order.subtotal = Number(subtotal.toFixed(2));
  order.total = Number((subtotal - discountTotal).toFixed(2));
  // Atualiza estoque
  update(d => {
    d.orders.push(order);
    items.forEach(oi => d.order_items.push(oi));
    prepared.forEach(({ product, qty }) => {
      const p = d.products.find(x => x.id === product.id);
      if (p) p.stock -= qty;
      d.stock_moves.push({
        id: uid('sm'), productId: product.id, type:'out', qty,
        reason: `Pedido ${order.number}`, userId: userId||null, date:new Date().toISOString()
      });
    });
  });
  flushSync();
  return { ok:true, order, items };
}

export function updateOrderStatus(id, status) {
  const db = get();
  const o = db.orders.find(x => x.id === id);
  if (!o) return { ok:false, reason:'notfound' };
  const allowed = ['pendente','pago','enviado','cancelado','entregue'];
  if (!allowed.includes(status)) return { ok:false, reason:'invalid_status' };
  // Se cancelar, devolve estoque
  if (status === 'cancelado' && o.status !== 'cancelado') {
    const items = db.order_items.filter(oi => oi.orderId === id);
    update(d => {
      items.forEach(oi => {
        const p = d.products.find(x => x.id === oi.productId);
        if (p) p.stock += oi.qty;
        d.stock_moves.push({
          id: uid('sm'), productId: oi.productId, type:'in', qty:oi.qty,
          reason: `Cancelamento ${o.number}`, userId:o.userId, date:new Date().toISOString()
        });
      });
      o.status = status;
      o.updatedAt = new Date().toISOString();
    });
  } else {
    o.status = status;
    o.updatedAt = new Date().toISOString();
    flushSync();
  }
  return { ok:true, order:o };
}

export function deleteOrder(id) {
  const db = get();
  const o = db.orders.find(x => x.id === id);
  if (!o) return { ok:false, reason:'notfound' };
  // devolve estoque se não cancelado
  if (o.status !== 'cancelado') {
    const items = db.order_items.filter(oi => oi.orderId === id);
    update(d => {
      items.forEach(oi => {
        const p = d.products.find(x => x.id === oi.productId);
        if (p) p.stock += oi.qty;
        d.stock_moves.push({
          id: uid('sm'), productId: oi.productId, type:'in', qty:oi.qty,
          reason: `Exclusão ${o.number}`, userId:o.userId, date:new Date().toISOString()
        });
      });
    });
  }
  update(d => {
    d.orders = d.orders.filter(x => x.id !== id);
    d.order_items = d.order_items.filter(x => x.orderId !== id);
  });
  flushSync();
  return { ok:true };
}

// ---------- RELATÓRIOS ----------
export function dashboard() {
  const db = get();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthOrders = db.orders.filter(o => o.createdAt >= startOfMonth);
  const totalSales = monthOrders.reduce((s,o) => s + (o.total||0), 0);
  const paidSales = monthOrders.filter(o => o.status === 'pago' || o.status === 'entregue').reduce((s,o) => s + (o.total||0), 0);
  const pendingCount = monthOrders.filter(o => o.status === 'pendente').length;
  const lowStock = db.products.filter(p => p.stock <= (p.minStock||0) && p.active).map(p => ({ id:p.id, name:p.name, code:p.code, stock:p.stock, minStock:p.minStock }));
  // top produtos
  const counts = {};
  db.order_items.forEach(oi => {
    if (!counts[oi.productId]) counts[oi.productId] = { name:oi.productName, qty:0, total:0 };
    counts[oi.productId].qty += oi.qty;
    counts[oi.productId].total += oi.total;
  });
  const top = Object.entries(counts).map(([id,v]) => ({ id, ...v })).sort((a,b) => b.qty - a.qty).slice(0,5);
  return {
    totalProducts: db.products.length,
    activeProducts: db.products.filter(p => p.active).length,
    totalCustomers: db.customers.length,
    totalOrders: db.orders.length,
    monthOrders: monthOrders.length,
    totalSales: Number(totalSales.toFixed(2)),
    paidSales: Number(paidSales.toFixed(2)),
    pendingCount,
    lowStock,
    topProducts: top,
  };
}

export function salesReport(from, to) {
  const db = get();
  let orders = db.orders;
  if (from) orders = orders.filter(o => o.createdAt >= from);
  if (to) orders = orders.filter(o => o.createdAt <= to + 'T23:59:59');
  const total = orders.reduce((s,o) => s + (o.total||0), 0);
  const byStatus = {};
  orders.forEach(o => { byStatus[o.status] = (byStatus[o.status]||0) + 1; });
  return { orders: orders.map(o => ({ ...o, customer: db.customers.find(c=>c.id===o.customerId)?.name })), total: Number(total.toFixed(2)), count: orders.length, byStatus };
}

export function stockReport() {
  const db = get();
  return db.products.map(p => ({
    id:p.id, name:p.name, code:p.code, category:p.category, stock:p.stock, minStock:p.minStock,
    salePrice:p.salePrice, costPrice:p.costPrice, unit:p.unit, active:p.active,
    value: Number((p.stock * p.costPrice).toFixed(2)),
    low: p.stock <= (p.minStock||0),
  })).sort((a,b) => a.name.localeCompare(b.name));
}