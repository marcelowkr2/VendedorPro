'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { invalidateStockQueries } from '../../lib/stock-queries';
import toast from 'react-hot-toast';

interface StockProduct {
  id: string;
  name: string;
  code: string;
  stock: number;
  minStock: number;
  unit: string;
}

interface StockMovement {
  id: string;
  createdAt: string;
  type: string;
  quantity: number;
  reason: string | null;
  product: { name: string; code: string };
}

export function StockClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [form, setForm] = useState<{ productId: string; type: 'in' | 'out' | 'adjustment'; quantity: string; reason: string }>({ productId: '', type: 'in', quantity: '1', reason: '' });

  const products = useQuery({
    queryKey: ['products-stock', tenant?.tenantId],
    queryFn: async () => (await api.get<{ items: StockProduct[] }>('/api/v1/stock/products')).data.items,
    enabled: !!tenant,
    refetchOnMount: 'always',
  });

  const movements = useQuery({
    queryKey: ['movements', tenant?.tenantId],
    queryFn: async () => (await api.get<{ items: StockMovement[] }>('/api/v1/stock/movements?limit=20')).data.items,
    enabled: !!tenant,
    refetchOnMount: 'always',
  });

  const adjust = useMutation({
    mutationFn: (payload: { productId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; reason: string }) => api.post('/api/v1/stock/adjust', payload),
    onSuccess: () => {
      if (tenant) invalidateStockQueries(qc, tenant.tenantId);
      setForm({ productId: '', type: 'in', quantity: '1', reason: '' });
      toast.success('Estoque atualizado.');
    },
  });

  const productsList = products.data ?? [];
  const movementsList = movements.data ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) {
      toast.error('Selecione um produto.');
      return;
    }
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
              required
            >
              <SelectTrigger aria-label="Produto">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {productsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <Select
              value={form.type}
              onValueChange={(v: 'in' | 'out' | 'adjustment') => setForm({ ...form, type: v })}
            >
              <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
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
              min={form.type === 'adjustment' ? 0 : 1}
              step="1"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <p className="md:col-span-4 text-xs text-slate-500">Em Ajuste, informe o saldo final desejado. Entrada e Saída acrescentam ou retiram a quantidade informada.</p>
          <div className="md:col-span-2">
            <label className="form-label">Motivo</label>
            <Input
              placeholder="Motivo do movimento"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" disabled={adjust.isPending || products.isLoading || products.isError}>{adjust.isPending ? 'Registrando...' : 'Registrar movimento'}</Button>
          </div>
        </form>
      </Card>

      <Card title="Saldo atual dos produtos">
        {products.isLoading ? <p className="text-sm text-slate-500">Carregando produtos...</p> : products.isError ? (
          <p role="alert" className="text-sm text-red-600">Não foi possível carregar os produtos. <button className="underline" onClick={() => products.refetch()}>Tentar novamente</button></p>
        ) : productsList.length === 0 ? <p className="text-sm text-slate-500">Nenhum produto ativo cadastrado.</p> : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-2">Produto</th><th>Código</th><th>Saldo atual</th></tr></thead>
              <tbody>{productsList.map((product) => (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{product.name}</td>
                  <td>{product.code}</td>
                  <td className={product.stock <= product.minStock ? 'text-red-600 font-semibold' : ''}>{product.stock} {product.unit}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Movimentações recentes">
        <p className="mb-3 text-xs text-slate-500">Histórico das últimas 20 movimentações, inclusive de produtos desativados.</p>
        {movements.isLoading ? <p className="text-sm text-slate-500">Carregando movimentações...</p> : movements.isError ? (
          <p role="alert" className="text-sm text-red-600">Não foi possível carregar as movimentações. <button className="underline" onClick={() => movements.refetch()}>Tentar novamente</button></p>
        ) : movementsList.length === 0 ? <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p> : (
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
              {movementsList.map((m) => (
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
        )}
      </Card>
    </div>
  );
}