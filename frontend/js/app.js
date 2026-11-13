// app.js — lógica da SPA
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let currentUser = null;
let currentView = 'dashboard';
let cart = [];

function toast(msg, type='info') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg z-50 ' + (type==='error'?'bg-red-600':type==='success'?'bg-green-600':'bg-slate-900') + ' text-white';
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function showModal(title, bodyHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }

$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

async function login(email, password) {
  const r = await api.login(email, password);
  localStorage.setItem('sv_token', r.token);
  localStorage.setItem('sv_user', JSON.stringify(r.user));
  currentUser = r.user;
  showApp();
}

function showApp() {
  $('#loginScreen').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  $('#userName').textContent = currentUser.name + ' (' + currentUser.role + ')';
  if (currentUser.role === 'admin') $$('.admin-only').forEach(e => e.classList.remove('hidden'));
  navigate('dashboard');
}

function logout() {
  localStorage.removeItem('sv_token');
  localStorage.removeItem('sv_user');
  location.reload();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#loginError');
  err.classList.add('hidden');
  try {
    await login($('#loginEmail').value, $('#loginPass').value);
  } catch (ex) {
    err.textContent = ex.data?.error === 'invalid' ? 'Email ou senha inválidos' : (ex.message || 'Erro');
    err.classList.remove('hidden');
  }
});

$('#logoutBtn').addEventListener('click', logout);

$$('.nav-link').forEach(a => a.addEventListener('click', () => navigate(a.dataset.view)));

function navigate(view) {
  currentView = view;
  $$('.nav-link').forEach(a => a.classList.toggle('bg-slate-800', a.dataset.view === view));
  const c = $('#viewContainer');
  c.innerHTML = '<div class="text-slate-400">Carregando...</div>';
  const renderers = {
    dashboard: renderDashboard,
    products: renderProducts,
    customers: renderCustomers,
    orders: renderOrders,
    reports: renderReports,
    users: renderUsers,
  };
  (renderers[view] || (() => {}))();
}

async function renderDashboard() {
  const d = await api.reports.dashboard();
  const c = $('#viewContainer');
  c.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Dashboard</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="text-sm opacity-80">Vendas do mês</div><div class="text-3xl font-bold mt-1">R$ ${d.totalSales.toFixed(2)}</div><div class="text-xs opacity-70 mt-1">${d.monthOrders} pedidos</div></div>
      <div class="stat-card green"><div class="text-sm opacity-80">Recebido (pago/entregue)</div><div class="text-3xl font-bold mt-1">R$ ${d.paidSales.toFixed(2)}</div></div>
      <div class="stat-card amber"><div class="text-sm opacity-80">Pedidos pendentes</div><div class="text-3xl font-bold mt-1">${d.pendingCount}</div></div>
      <div class="stat-card slate"><div class="text-sm opacity-80">Clientes / Produtos</div><div class="text-3xl font-bold mt-1">${d.totalCustomers} / ${d.activeProducts}</div></div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card">
        <h3 class="font-bold mb-3">Estoque baixo</h3>
        ${d.lowStock.length ? `<table class="w-full text-sm"><thead><tr class="text-left text-slate-500"><th class="pb-2">Produto</th><th class="pb-2">Código</th><th class="pb-2 text-right">Estoque</th><th class="pb-2 text-right">Min.</th></tr></thead><tbody>
        ${d.lowStock.map(p=>`<tr class="border-t"><td class="py-2">${p.name}</td><td class="py-2 text-slate-500">${p.code}</td><td class="py-2 text-right text-red-600 font-bold">${p.stock}</td><td class="py-2 text-right">${p.minStock}</td></tr>`).join('')}</tbody></table>` : '<p class="text-slate-400 text-sm">Nenhum produto com estoque baixo.</p>'}
      </div>
      <div class="card">
        <h3 class="font-bold mb-3">Produtos mais vendidos</h3>
        ${d.topProducts.length ? `<table class="w-full text-sm"><thead><tr class="text-left text-slate-500"><th class="pb-2">Produto</th><th class="pb-2 text-right">Qtd</th><th class="pb-2 text-right">Total</th></tr></thead><tbody>
        ${d.topProducts.map(p=>`<tr class="border-t"><td class="py-2">${p.name}</td><td class="py-2 text-right">${p.qty}</td><td class="py-2 text-right">R$ ${p.total.toFixed(2)}</td></tr>`).join('')}</tbody></table>` : '<p class="text-slate-400 text-sm">Sem vendas ainda.</p>'}
      </div>
    </div>
  `;
}

async function renderProducts() {
  const search = $('#prodSearch')?.value || '';
  const products = await api.products.list({ search });
  const c = $('#viewContainer');
  c.innerHTML = `
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h2 class="text-2xl font-bold">Produtos</h2>
      <div class="flex gap-2">
        <input id="prodSearch" class="form-input w-64" placeholder="Buscar produto ou código..." value="${search}">
        <button class="btn btn-primary" id="newProductBtn">+ Novo produto</button>
      </div>
    </div>
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr class="text-left text-slate-600">
          <th class="px-4 py-3">Código</th><th class="px-4 py-3">Nome</th><th class="px-4 py-3">Categoria</th>
          <th class="px-4 py-3 text-right">Custo</th><th class="px-4 py-3 text-right">Venda</th>
          <th class="px-4 py-3 text-right">Estoque</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-center">Ações</th>
        </tr></thead>
        <tbody>
        ${products.map(p => `
          <tr class="border-t hover:bg-slate-50">
            <td class="px-4 py-3 font-mono text-xs">${p.code}</td>
            <td class="px-4 py-3 font-medium">${p.name}</td>
            <td class="px-4 py-3 text-slate-500">${p.category||'-'}</td>
            <td class="px-4 py-3 text-right">R$ ${p.costPrice.toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-semibold">R$ ${p.salePrice.toFixed(2)}</td>
            <td class="px-4 py-3 text-right ${p.stock <= (p.minStock||0) ? 'text-red-600 font-bold' : ''}">${p.stock} ${p.unit}</td>
            <td class="px-4 py-3 text-center"><span class="badge ${p.active?'badge-pago':'badge-cancelado'}">${p.active?'Ativo':'Inativo'}</span></td>
            <td class="px-4 py-3 text-center space-x-1">
              <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Editar</button>
              <button class="btn btn-ghost btn-sm" onclick="adjustStock('${p.id}')">Estoque</button>
              <button class="btn btn-danger btn-sm" onclick="removeProduct('${p.id}')">Excluir</button>
            </td>
          </tr>`).join('')}
        ${products.length===0?'<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>':''}
        </tbody>
      </table>
    </div>
  `;
  $('#prodSearch').addEventListener('input', () => renderProducts());
  $('#newProductBtn').addEventListener('click', () => productForm());
}

window.editProduct = async (id) => {
  const p = await api.products.get(id);
  productForm(p);
};

function productForm(p = null) {
  showModal(p ? 'Editar produto' : 'Novo produto', `
    <form id="productForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><label class="form-label">Nome *</label><input class="form-input" name="name" value="${p?.name||''}" required></div>
      <div><label class="form-label">Código *</label><input class="form-input" name="code" value="${p?.code||''}" required ${p?'readonly':''}></div>
      <div><label class="form-label">Código de barras</label><input class="form-input" name="barcode" value="${p?.barcode||''}"></div>
      <div><label class="form-label">Categoria</label><input class="form-input" name="category" value="${p?.category||''}"></div>
      <div><label class="form-label">Preço de custo</label><input class="form-input" name="costPrice" type="number" step="0.01" value="${p?.costPrice||0}"></div>
      <div><label class="form-label">Preço de venda</label><input class="form-input" name="salePrice" type="number" step="0.01" value="${p?.salePrice||0}"></div>
      <div><label class="form-label">Estoque</label><input class="form-input" name="stock" type="number" step="0.01" value="${p?.stock||0}"></div>
      <div><label class="form-label">Estoque mínimo</label><input class="form-input" name="minStock" type="number" step="0.01" value="${p?.minStock||0}"></div>
      <div><label class="form-label">Unidade</label><select class="form-input" name="unit"><option value="un" ${p?.unit==='un'?'selected':''}>Unidade</option><option value="kg" ${p?.unit==='kg'?'selected':''}>Kg</option><option value="cx" ${p?.unit==='cx'?'selected':''}>Caixa</option><option value="lt" ${p?.unit==='lt'?'selected':''}>Litro</option></select></div>
      <div class="flex items-end"><label class="flex items-center gap-2 text-sm"><input type="checkbox" name="active" ${p===null||p.active?'checked':''}> Ativo</label></div>
      <div class="md:col-span-2 flex justify-end gap-2 mt-2">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  `);
  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = Object.fromEntries(f.entries());
    data.active = f.has('active');
    try {
      if (p) await api.products.update(p.id, data);
      else await api.products.create(data);
      toast('Produto salvo!', 'success');
      closeModal();
      renderProducts();
    } catch (ex) { toast(ex.data?.error || 'Erro ao salvar', 'error'); }
  });
}

window.adjustStock = async (id) => {
  const p = await api.products.get(id);
  showModal('Ajustar estoque — ' + p.name, `
    <form id="stockForm" class="space-y-3">
      <div><label class="form-label">Tipo</label><select class="form-input" name="type"><option value="in">Entrada (+)</option><option value="out">Saída (-)</option></select></div>
      <div><label class="form-label">Quantidade</label><input class="form-input" name="qty" type="number" step="0.01" required></div>
      <div><label class="form-label">Motivo</label><input class="form-input" name="reason" placeholder="Ex: compra, perda, ajuste"></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Aplicar</button></div>
    </form>
  `);
  $('#stockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.products.stock(id, f.get('qty'), f.get('type'), f.get('reason'));
      toast('Estoque atualizado!', 'success');
      closeModal();
      renderProducts();
    } catch (ex) { toast(ex.data?.error || 'Erro', 'error'); }
  });
};

window.removeProduct = async (id) => {
  if (!confirm('Excluir este produto?')) return;
  try {
    await api.products.delete(id);
    toast('Produto excluído', 'success');
    renderProducts();
  } catch (ex) { toast(ex.data?.error || 'Erro (pode ter pedidos vinculados)', 'error'); }
};

async function renderCustomers() {
  const search = $('#custSearch')?.value || '';
  const customers = await api.customers.list({ search });
  const c = $('#viewContainer');
  c.innerHTML = `
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h2 class="text-2xl font-bold">Clientes</h2>
      <div class="flex gap-2">
        <input id="custSearch" class="form-input w-64" placeholder="Buscar cliente..." value="${search}">
        <button class="btn btn-primary" id="newCustomerBtn">+ Novo cliente</button>
      </div>
    </div>
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr class="text-left text-slate-600">
          <th class="px-4 py-3">Nome</th><th class="px-4 py-3">Documento</th><th class="px-4 py-3">Telefone</th>
          <th class="px-4 py-3">Email</th><th class="px-4 py-3">Cidade</th><th class="px-4 py-3 text-center">Ações</th>
        </tr></thead><tbody>
        ${customers.map(cu => `
          <tr class="border-t hover:bg-slate-50">
            <td class="px-4 py-3 font-medium">${cu.name}</td>
            <td class="px-4 py-3 text-slate-500">${cu.document||'-'}</td>
            <td class="px-4 py-3">${cu.phone||'-'}</td>
            <td class="px-4 py-3 text-slate-500">${cu.email||'-'}</td>
            <td class="px-4 py-3">${cu.city||'-'}</td>
            <td class="px-4 py-3 text-center space-x-1">
              <button class="btn btn-ghost btn-sm" onclick="editCustomer('${cu.id}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="removeCustomer('${cu.id}')">Excluir</button>
            </td>
          </tr>`).join('')}
        ${customers.length===0?'<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Nenhum cliente cadastrado.</td></tr>':''}
        </tbody>
      </table>
    </div>
  `;
  $('#custSearch').addEventListener('input', () => renderCustomers());
  $('#newCustomerBtn').addEventListener('click', () => customerForm());
}

window.editCustomer = async (id) => {
  const c = await api.customers.get(id);
  customerForm(c);
};

function customerForm(c = null) {
  showModal(c ? 'Editar cliente' : 'Novo cliente', `
    <form id="customerForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="md:col-span-2"><label class="form-label">Nome *</label><input class="form-input" name="name" value="${c?.name||''}" required></div>
      <div><label class="form-label">CPF/CNPJ</label><input class="form-input" name="document" value="${c?.document||''}"></div>
      <div><label class="form-label">Telefone</label><input class="form-input" name="phone" value="${c?.phone||''}"></div>
      <div><label class="form-label">Email</label><input class="form-input" name="email" type="email" value="${c?.email||''}"></div>
      <div><label class="form-label">Cidade</label><input class="form-input" name="city" value="${c?.city||''}"></div>
      <div class="md:col-span-2"><label class="form-label">Endereço</label><input class="form-input" name="address" value="${c?.address||''}"></div>
      <div class="md:col-span-2"><label class="form-label">Observações</label><textarea class="form-textarea" name="notes" rows="2">${c?.notes||''}</textarea></div>
      <div class="md:col-span-2 flex justify-end gap-2 mt-2">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  `);
  $('#customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = Object.fromEntries(f.entries());
    try {
      if (c) await api.customers.update(c.id, data);
      else await api.customers.create(data);
      toast('Cliente salvo!', 'success');
      closeModal();
      renderCustomers();
    } catch (ex) { toast(ex.data?.error || 'Erro ao salvar', 'error'); }
  });
}

window.removeCustomer = async (id) => {
  if (!confirm('Excluir este cliente?')) return;
  try {
    await api.customers.delete(id);
    toast('Cliente excluído', 'success');
    renderCustomers();
  } catch (ex) { toast(ex.data?.error || 'Erro (pode ter pedidos)', 'error'); }
};

async function renderOrders() {
  const status = $('#orderStatus')?.value || '';
  const orders = await api.orders.list({ status });
  const c = $('#viewContainer');
  c.innerHTML = `
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h2 class="text-2xl font-bold">Pedidos</h2>
      <div class="flex gap-2">
        <select id="orderStatus" class="form-input w-40">
          <option value="">Todos</option>
          <option value="pendente" ${status==='pendente'?'selected':''}>Pendente</option>
          <option value="pago" ${status==='pago'?'selected':''}>Pago</option>
          <option value="enviado" ${status==='enviado'?'selected':''}>Enviado</option>
          <option value="entregue" ${status==='entregue'?'selected':''}>Entregue</option>
          <option value="cancelado" ${status==='cancelado'?'selected':''}>Cancelado</option>
        </select>
        <button class="btn btn-primary" id="newOrderBtn">+ Novo pedido</button>
      </div>
    </div>
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr class="text-left text-slate-600">
          <th class="px-4 py-3">Nº</th><th class="px-4 py-3">Cliente</th><th class="px-4 py-3">Data</th>
          <th class="px-4 py-3 text-right">Total</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-center">Ações</th>
        </tr></thead><tbody>
        ${orders.map(o => `
          <tr class="border-t hover:bg-slate-50">
            <td class="px-4 py-3 font-mono">${o.number}</td>
            <td class="px-4 py-3">${o.customer?.name || '-'}</td>
            <td class="px-4 py-3 text-slate-500">${new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-3 text-right font-bold">R$ ${o.total.toFixed(2)}</td>
            <td class="px-4 py-3 text-center"><span class="badge badge-${o.status}">${o.status}</span></td>
            <td class="px-4 py-3 text-center space-x-1">
              <button class="btn btn-ghost btn-sm" onclick="viewOrder('${o.id}')">Ver</button>
              <button class="btn btn-ghost btn-sm" onclick="changeStatus('${o.id}')">Status</button>
              <button class="btn btn-danger btn-sm" onclick="removeOrder('${o.id}')">Excluir</button>
            </td>
          </tr>`).join('')}
        ${orders.length===0?'<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Nenhum pedido.</td></tr>':''}
        </tbody>
      </table>
    </div>
  `;
  $('#orderStatus').addEventListener('change', () => renderOrders());
  $('#newOrderBtn').addEventListener('click', () => orderForm());
}

window.viewOrder = async (id) => {
  const o = await api.orders.get(id);
  showModal('Pedido ' + o.number, `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><b>Cliente:</b> ${o.customer?.name}</div>
        <div><b>Status:</b> <span class="badge badge-${o.status}">${o.status}</span></div>
        <div><b>Data:</b> ${new Date(o.createdAt).toLocaleString('pt-BR')}</div>
        <div><b>Pagamento:</b> ${o.payment}</div>
      </div>
      <table class="w-full text-sm mt-3">
        <thead class="bg-slate-50"><tr><th class="px-2 py-2 text-left">Produto</th><th class="px-2 py-2 text-right">Qtd</th><th class="px-2 py-2 text-right">Preço</th><th class="px-2 py-2 text-right">Total</th></tr></thead>
        <tbody>${o.items.map(i=>`<tr class="border-t"><td class="px-2 py-2">${i.productName} <span class="text-slate-400 text-xs">(${i.productCode})</span></td><td class="px-2 py-2 text-right">${i.qty}</td><td class="px-2 py-2 text-right">R$ ${i.price.toFixed(2)}</td><td class="px-2 py-2 text-right font-semibold">R$ ${i.total.toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="text-right mt-3 space-y-1 text-sm">
        <div>Subtotal: R$ ${o.subtotal.toFixed(2)}</div>
        <div>Desconto: ${o.discount}%</div>
        <div class="font-bold text-lg">Total: R$ ${o.total.toFixed(2)}</div>
      </div>
      ${o.notes?`<div class="mt-3 text-sm"><b>Obs:</b> ${o.notes}</div>`:''}
    </div>
  `);
};

window.changeStatus = async (id) => {
  const statuses = ['pendente','pago','enviado','entregue','cancelado'];
  const s = prompt('Novo status:\n' + statuses.join(', '));
  if (!s || !statuses.includes(s)) return;
  try {
    await api.orders.status(id, s);
    toast('Status atualizado', 'success');
    renderOrders();
  } catch (ex) { toast(ex.data?.error || 'Erro', 'error'); }
};

window.removeOrder = async (id) => {
  if (!confirm('Excluir este pedido? (estoque será devolvido)')) return;
  try {
    await api.orders.delete(id);
    toast('Pedido excluído', 'success');
    renderOrders();
  } catch (ex) { toast(ex.data?.error || 'Erro', 'error'); }
};

async function orderForm() {
  const customers = await api.customers.list();
  const products = await api.products.list({ active: true });
  cart = [];
  showModal('Novo pedido', `
    <form id="orderForm" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="form-label">Cliente *</label>
          <select class="form-input" name="customerId" required>
            <option value="">Selecione...</option>
            ${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Pagamento</label>
          <select class="form-input" name="payment">
            <option value="a_vista">À vista</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="boleto">Boleto</option>
            <option value="prazo">A prazo</option>
          </select>
        </div>
      </div>
      <div>
        <label class="form-label">Adicionar produto</label>
        <div class="flex gap-2">
          <select id="prodSelect" class="form-input flex-1">
            <option value="">Selecione produto...</option>
            ${products.map(p=>`<option value="${p.id}" data-price="${p.salePrice}" data-stock="${p.stock}">${p.name} (${p.code}) — R$ ${p.salePrice.toFixed(2)} [est: ${p.stock}]</option>`).join('')}
          </select>
          <input id="prodQty" class="form-input w-20" type="number" step="0.01" value="1" min="0.01">
          <button type="button" class="btn btn-ghost" id="addCartBtn">+ Adicionar</button>
        </div>
      </div>
      <div id="cartArea" class="border rounded-lg p-3 min-h-[60px] bg-slate-50"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="form-label">Desconto geral (%)</label><input class="form-input" name="discount" type="number" step="0.01" value="0"></div>
        <div><label class="form-label">Observações</label><input class="form-input" name="notes"></div>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Finalizar pedido</button>
      </div>
    </form>
  `);
  renderCart();
  $('#addCartBtn').addEventListener('click', () => {
    const sel = $('#prodSelect');
    const id = sel.value;
    if (!id) return;
    const opt = sel.options[sel.selectedIndex];
    const price = parseFloat(opt.dataset.price);
    const stock = parseFloat(opt.dataset.stock);
    const qty = parseFloat($('#prodQty').value) || 1;
    const existing = cart.find(i => i.productId === id);
    if (existing) existing.qty += qty;
    else cart.push({ productId: id, name: opt.text.split(' (')[0], price, qty, discount: 0, stock });
    renderCart();
  });
  $('#orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cart.length) { toast('Adicione ao menos um item', 'error'); return; }
    const f = new FormData(e.target);
    const data = {
      customerId: f.get('customerId'),
      payment: f.get('payment'),
      discount: f.get('discount'),
      notes: f.get('notes'),
      items: cart.map(i => ({ productId: i.productId, qty: i.qty, price: i.price, discount: i.discount })),
    };
    try {
      const r = await api.orders.create(data);
      toast('Pedido ' + r.order.number + ' criado!', 'success');
      closeModal();
      renderOrders();
    } catch (ex) { toast(ex.data?.error || 'Erro', 'error'); if (ex.data?.product) toast(ex.data.product + ' (disp: ' + ex.data.available + ')', 'error'); }
  });
}

function renderCart() {
  const area = $('#cartArea');
  if (!area) return;
  if (!cart.length) { area.innerHTML = '<p class="text-slate-400 text-sm">Carrinho vazio.</p>'; return; }
  let total = 0;
  area.innerHTML = `
    <table class="w-full text-sm">
      <thead><tr class="text-slate-500"><th class="text-left">Produto</th><th class="text-right">Qtd</th><th class="text-right">Preço</th><th class="text-right">Total</th><th></th></tr></thead>
      <tbody>
      ${cart.map((i, idx) => {
        const t = i.qty * i.price * (1 - i.discount/100);
        total += t;
        return `<tr class="border-t">
          <td class="py-1">${i.name}</td>
          <td class="py-1 text-right"><input class="w-16 border rounded px-1 text-right" type="number" step="0.01" value="${i.qty}" onchange="updateCartQty(${idx}, this.value)"></td>
          <td class="py-1 text-right">R$ ${i.price.toFixed(2)}</td>
          <td class="py-1 text-right font-semibold">R$ ${t.toFixed(2)}</td>
          <td class="py-1 text-right"><button class="text-red-500" onclick="removeCartItem(${idx})">x</button></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
    <div class="text-right font-bold mt-2">Subtotal: R$ ${total.toFixed(2)}</div>
  `;
}

window.updateCartQty = (idx, val) => { cart[idx].qty = parseFloat(val) || 1; renderCart(); };
window.removeCartItem = (idx) => { cart.splice(idx, 1); renderCart(); };

async function renderReports() {
  const c = $('#viewContainer');
  const stock = await api.reports.stock();
  const sales = await api.reports.sales(null, null);
  c.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Relatórios</h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card">
        <h3 class="font-bold mb-3">Relatório de estoque</h3>
        <div class="table-wrap">
        <table class="w-full text-sm">
          <thead class="bg-slate-50"><tr class="text-left text-slate-600"><th class="px-2 py-2">Produto</th><th class="px-2 py-2 text-right">Estoque</th><th class="px-2 py-2 text-right">Min</th><th class="px-2 py-2 text-right">Valor custo</th></tr></thead>
          <tbody>
          ${stock.map(p=>`<tr class="border-t ${p.low?'bg-red-50':''}"><td class="px-2 py-2">${p.name}<div class="text-xs text-slate-400">${p.code}</div></td><td class="px-2 py-2 text-right ${p.low?'text-red-600 font-bold':''}">${p.stock}</td><td class="px-2 py-2 text-right">${p.minStock}</td><td class="px-2 py-2 text-right">R$ ${p.value.toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table></div>
        <div class="mt-3 text-sm font-semibold">Total em estoque (custo): R$ ${stock.reduce((s,p)=>s+p.value,0).toFixed(2)}</div>
      </div>
      <div class="card">
        <h3 class="font-bold mb-3">Resumo de vendas (${sales.count} pedidos)</h3>
        <div class="text-3xl font-bold text-indigo-600 mb-2">R$ ${sales.total.toFixed(2)}</div>
        <div class="space-y-1 text-sm">
          ${Object.entries(sales.byStatus).map(([k,v])=>`<div class="flex justify-between"><span class="badge badge-${k}">${k}</span><span>${v}</span></div>`).join('')}
        </div>
        <div class="mt-4">
          <button class="btn btn-ghost btn-sm" onclick="exportSales()">Exportar CSV</button>
        </div>
      </div>
    </div>
  `;
}

window.exportSales = async () => {
  const sales = await api.reports.sales(null, null);
  const rows = [['Numero','Cliente','Data','Total','Status']];
  sales.orders.forEach(o => rows.push([o.number, o.customer, o.createdAt, o.total, o.status]));
  const csv = rows.map(r => r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'vendas.csv'; a.click();
  URL.revokeObjectURL(url);
};

async function renderUsers() {
  const users = await api.users.list();
  const c = $('#viewContainer');
  c.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Usuários</h2>
      <button class="btn btn-primary" id="newUserBtn">+ Novo usuário</button>
    </div>
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr class="text-left text-slate-600"><th class="px-4 py-3">Nome</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Perfil</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-center">Ações</th></tr></thead>
        <tbody>
        ${users.map(u=>`
          <tr class="border-t">
            <td class="px-4 py-3 font-medium">${u.name}</td>
            <td class="px-4 py-3 text-slate-500">${u.email}</td>
            <td class="px-4 py-3"><span class="badge badge-${u.role}">${u.role}</span></td>
            <td class="px-4 py-3"><span class="badge ${u.active?'badge-pago':'badge-cancelado'}">${u.active?'Ativo':'Inativo'}</span></td>
            <td class="px-4 py-3 text-center">
              <button class="btn btn-ghost btn-sm" onclick="toggleUser('${u.id}', ${!u.active})">${u.active?'Desativar':'Ativar'}</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  $('#newUserBtn').addEventListener('click', () => userForm());
}

function userForm() {
  showModal('Novo usuário', `
    <form id="userForm" class="space-y-3">
      <div><label class="form-label">Nome *</label><input class="form-input" name="name" required></div>
      <div><label class="form-label">Email *</label><input class="form-input" name="email" type="email" required></div>
      <div><label class="form-label">Senha *</label><input class="form-input" name="password" type="password" required minlength="6"></div>
      <div><label class="form-label">Perfil</label><select class="form-input" name="role"><option value="vendas">Vendas</option><option value="admin">Admin</option></select></div>
      <div class="flex justify-end gap-2"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Criar</button></div>
    </form>
  `);
  $('#userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = Object.fromEntries(f.entries());
    try {
      await api.users.create(data);
      toast('Usuário criado!', 'success');
      closeModal();
      renderUsers();
    } catch (ex) { toast(ex.data?.error || 'Erro', 'error'); }
  });
}

window.toggleUser = async (id, active) => {
  try {
    await api.users.toggle(id, active);
    toast('Status alterado', 'success');
    renderUsers();
  } catch (ex) { toast(ex.data?.error || 'Erro', 'error'); }
};

const savedUser = localStorage.getItem('sv_user');
const savedToken = localStorage.getItem('sv_token');
if (savedToken && savedUser) {
  currentUser = JSON.parse(savedUser);
  showApp();
}
JSEOF
echo "written"