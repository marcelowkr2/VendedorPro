'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/card';
import { formatBRL } from '../../lib/utils';
import { invalidateStockQueries } from '../../lib/stock-queries';

export function QuotesClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [form, setForm] = useState<{ customerId: string; items: { productId: string; quantity: string; priceCents: string }[] }>({
    customerId: '',
    items: [{ productId: '', quantity: '1', priceCents: '' }],
  });

  const { data: quotes } = useQuery({
    queryKey: ['quotes', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/quotes?limit=50'),
    enabled: !!tenant,
  });
  const { data: products } = useQuery({
    queryKey: ['products-quote', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/products?limit=100'),
    enabled: !!tenant,
  });
  const { data: customers } = useQuery({
    queryKey: ['customers-quote', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/customers?limit=100'),
    enabled: !!tenant,
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post('/api/v1/quotes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      setForm({ customerId: '', items: [{ productId: '', quantity: '1', priceCents: '' }] });
    },
  });
  const convert = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/quotes/${id}/convert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (tenant) invalidateStockQueries(qc, tenant.tenantId);
    },
  });

  const items: any[] = quotes?.data?.items ?? [];
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
      <h1 className="text-2xl font-bold">Orçamentos</h1>

      <Card title="Novo orçamento">
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
            <Button type="submit">Criar orçamento</Button>
          </div>
        </form>
      </Card>

      <Card title="Orçamentos recentes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((q: any) => (
            <div key={q.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="font-mono text-sm font-medium">{q.number}</span>
                <span className={`badge badge-${q.status}`}>{q.status}</span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{q.customer?.name || 'Cliente'}</p>
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold">{formatBRL(q.totalCents)}</div>
                <div className="flex gap-1">
                  <a
                    href={`/api/v1/quotes/${q.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 underline decoration-brand-300 hover:decoration-brand-600"
                  >
                    PDF
                  </a>
                  {q.status === 'draft' && (
                    <Button size="sm" onClick={() => convert.mutate(q.id)}>Converter</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}