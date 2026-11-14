'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/select';

export function StockClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [form, setForm] = useState({ productId: '', type: 'in', quantity: '1', reason: '' });

  const { data: products } = useQuery({
    queryKey: ['products-stock', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/products?limit=100'),
    enabled: !!tenant,
  });

  const { data: movements } = useQuery({
    queryKey: ['movements', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/stock/movements?limit=20'),
    enabled: !!tenant,
  });

  const adjust = useMutation({
    mutationFn: (payload: any) => api.post('/api/v1/stock/adjust', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['products-stock'] });
      setForm({ productId: '', type: 'in', quantity: '1', reason: '' });
    },
  });

  const productsList: any[] = products?.data?.items ?? [];
  const movementsList: any[] = movements?.data?.items ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    adjust.mutate({
      productId: form.productId,
      type: form.type,
      quantity: Number(form.quantity),
      reason: form.reason,
    });
  };

  if (!tenant) return <div className="text-slate-500">Selecione uma empresa.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Controle de Estoque</h1>

      <Card title="Ajustar estoque">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="form-label">Produto</label>
            <Select
              value={form.productId}
              onValueChange={(v) => setForm({ ...form, productId: v })}
            >
              <SelectTrigger>
                <span className="text-slate-400">Selecione um produto</span>
              </SelectTrigger>
              <SelectContent>
                {productsList.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
            >
              <SelectTrigger><span /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrada</SelectItem>
                <SelectItem value="out">Saída</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Quantidade</label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Motivo</label>
            <Input
              placeholder="Motivo do movimento"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit">Registrar movimento</Button>
          </div>
        </form>
      </Card>

      <Card title="Movimentações recentes">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Qtd</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movementsList.map((m: any) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">{new Date(m.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="font-medium">{m.product?.name || '—'}</td>
                  <td>
                    <span className={`badge ${m.type === 'in' ? 'badge-approved' : m.type === 'out' ? 'badge-cancelled' : 'badge-pending'}`}>
                      {m.type === 'in' ? 'Entrada' : m.type === 'out' ? 'Saída' : m.type === 'adjustment' ? 'Ajuste' : m.type}
                    </span>
                  </td>
                  <td className={m.type === 'in' ? 'text-emerald-600' : m.type === 'out' ? 'text-red-600' : ''}>
                    {m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.quantity}
                  </td>
                  <td className="text-slate-500">{m.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}