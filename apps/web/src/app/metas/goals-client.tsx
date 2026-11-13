'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/card';
import { formatBRL } from '../../lib/utils';

export function GoalsClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [form, setForm] = useState({ targetCents: '', startDate: '', endDate: '' });

  const { data } = useQuery({
    queryKey: ['goals', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/goals'),
    enabled: !!tenant,
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post('/api/v1/goals', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setForm({ targetCents: '', startDate: '', endDate: '' });
    },
  });

  const items: any[] = data?.data?.items ?? [];

  if (!tenant) return <div className="text-slate-500">Selecione uma empresa.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Metas de Vendas</h1>

      <Card title="Nova meta">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              targetCents: Math.round(Number(form.targetCents) * 100),
              startDate: form.startDate,
              endDate: form.endDate,
            });
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <Input
            type="number"
            step="0.01"
            placeholder="Meta (R$)"
            value={form.targetCents}
            onChange={(e) => setForm({ ...form, targetCents: e.target.value })}
            required
          />
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <div className="flex items-end">
            <Button type="submit" className="w-full">Criar meta</Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((g: any) => (
          <div key={g.id} className="border border-slate-200 rounded-xl p-5 bg-white">
            <p className="text-sm text-slate-500 mb-2">
              {new Date(g.startDate).toLocaleDateString('pt-BR')} a {new Date(g.endDate).toLocaleDateString('pt-BR')}
            </p>
            <div className="text-2xl font-bold text-brand-600">{formatBRL(g.targetCents)}</div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${Math.min(100, g.percent || 0)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Alcançado: {formatBRL(g.achievedCents || 0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}