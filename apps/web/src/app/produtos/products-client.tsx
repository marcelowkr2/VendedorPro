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

export function ProductsClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', code: '', barcode: '', unit: 'UN', priceCents: '', costCents: '', stock: '0', categoryId: '', brandId: '',
  });
  const [editing, setEditing] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/products?limit=50'),
    enabled: !!tenant,
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post('/api/v1/products', payload),
    onSuccess: () => {
      if (tenant) invalidateStockQueries(qc, tenant.tenantId);
      setForm({ name: '', code: '', barcode: '', unit: 'UN', priceCents: '', costCents: '', stock: '0', categoryId: '', brandId: '' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/products/${id}`),
    onSuccess: () => { if (tenant) invalidateStockQueries(qc, tenant.tenantId); },
  });

  const items: any[] = data?.data?.items ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      ...form,
      priceCents: Math.round(Number(form.priceCents) * 100),
      costCents: Math.round(Number(form.costCents) * 100),
      stock: Number(form.stock),
    });
  };

  if (!tenant) return <div className="text-slate-500">Selecione uma empresa.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
      </div>

      <Card title="Novo produto">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            placeholder="Código"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <Input
            placeholder="Código de barras"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <Input
            placeholder="Preço de venda (R$)"
            type="number"
            step="0.01"
            value={form.priceCents}
            onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
            required
          />
          <Input
            placeholder="Custo (R$)"
            type="number"
            step="0.01"
            value={form.costCents}
            onChange={(e) => setForm({ ...form, costCents: e.target.value })}
          />
          <div>
            <label htmlFor="product-unit" className="form-label">Unidade de venda</label>
            <Input
              id="product-unit"
              placeholder="Ex.: UN, kg, g, L"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              aria-describedby="product-unit-help"
            />
            <p id="product-unit-help" className="mt-1 text-xs text-slate-500">
              Ex.: UN, kg, g ou L. Quantidades inteiras, sem conversão automática.
            </p>
          </div>
          <Input
            placeholder="Estoque inicial"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full">Criar</Button>
          </div>
        </form>
      </Card>

      <Card title="Lista de produtos" action={<span className="badge badge-active">{items.length}</span>}>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Nome</th>
                <th>Código</th>
                <th>Preço</th>
                <th>Unidade</th>
                <th>Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">Nenhum produto.</td></tr>
              ) : (
                items.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="text-slate-500">{p.code}</td>
                    <td>{formatBRL(p.priceCents)}</td>
                    <td>{p.unit}</td>
                    <td className={p.stock <= p.minStock ? 'text-red-600 font-semibold' : ''}>{p.stock}</td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>Excluir</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}