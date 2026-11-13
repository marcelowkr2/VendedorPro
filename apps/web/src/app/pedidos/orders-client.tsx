'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/card';
import { formatBRL } from '../../lib/utils';

export function OrdersClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [form, setForm] = useState<{ customerId: string; items: { productId: string; quantity: string; priceCents: string }[] }>({
    customerId: '',
    items: [{ productId: '', quantity: '1', priceCents: '' }],
  });

  const { data: orders } = useQuery({
    queryKey: ['orders', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/orders?limit=50'),
    enabled: !!tenant,
  });
  const { data: products } = useQuery({
    queryKey: ['products-order', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/products?limit=100'),
    enabled: !!tenant,
  });
  const { data: customers } = useQuery({
    queryKey: ['customers-order', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/customers?limit=100'),
    enabled: !!tenant,
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post('/api/v1/orders', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setForm({ customerId: '', items: [{ productId: '', quantity: '1', priceCents: '' }] });
    },
  });

  const items: any[] = orders?.data?.items ?? [];
  const productsList: any[] = products?.data?.items ?? [];
  const customersList: any[] = customers?.data?.items ?? [];

  const subtotal = form.items.reduce(
    (a, i) => a + (Number(i.priceCents) || 0) * (Number(i.quantity) || 0),
    0,
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      customerId: form.customerId,
      items: form.items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        priceCents: Math.round(Number(i.priceCents) * 100),
      })),
    });
  };

  if (!tenant) return <div className="text-slate-500">Selecione uma empresa.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pedidos de Venda</h1>

      <Card title="Novo pedido">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="form-label">Cliente</label>
            <select
              className="form-input"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              required
            >
              <option value="">Selecione</option>
              {customersList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="form-label">Itens</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <select
                    className="form-input"
                    value={item.productId}
                    onChange={(e) => {
                      const next = [...form.items];
                      next[idx].productId = e.target.value;
                      setForm({ ...form, items: next });
                    }}
                    required
                  >
                    <option value="">Produto</option>
                    {productsList.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...form.items];
                      next[idx].quantity = e.target.value;
                      setForm({ ...form, items: next });
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$"
                    value={item.priceCents}
                    onChange={(e) => {
                      const next = [...form.items];
                      next[idx].priceCents = e.target.value;
                      setForm({ ...form, items: next });
                    }}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm({ ...form, items: [...form.items, { productId: '', quantity: '1', priceCents: '' }] })}
            >
              + Adicionar item
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Total: {formatBRL(subtotal)}</div>
            <Button type="submit">Criar pedido</Button>
          </div>
        </form>
      </Card>

      <Card title="Pedidos recentes">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Número</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o: any) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="py-2 font-mono text-sm font-medium">{o.number}</td>
                  <td className="font-medium">{o.customer?.name || '—'}</td>
                  <td>{formatBRL(o.totalCents)}</td>
                  <td>
                    <span className={`badge badge-${o.status}`}>{o.status}</span>{' '}
                    <a
                      href={`/api/v1/orders/${o.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 underline decoration-brand-300 hover:decoration-brand-600 ml-1"
                    >
                      PDF
                    </a>
                  </td>
                  <td className="text-slate-500">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}