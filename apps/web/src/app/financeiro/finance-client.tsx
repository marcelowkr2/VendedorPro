'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/card';
import { formatBRL } from '../../lib/utils';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  received: 'Recebido',
  overdue: 'Vencido',
};

export function FinanceClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [paying, setPay] = useState<Record<string, string>>({});

  const { data: conditions } = useQuery({
    queryKey: ['payment-conditions', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/finance/payment-conditions'),
    enabled: !!tenant,
  });
  const { data: receivables } = useQuery({
    queryKey: ['receivables', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/finance/receivables?limit=50'),
    enabled: !!tenant,
  });

  const pay = useMutation({
    mutationFn: ({ id, amountCents }: { id: string; amountCents: number }) =>
      api.post(`/api/v1/finance/receivables/${id}/payments`, { amountCents }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivables'] }),
  });

  const items: any[] = receivables?.data?.items ?? [];

  if (!tenant) return <div className="text-slate-500">Selecione uma empresa.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((r: any) => (
          <div key={r.id} className="border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-2">{r.customer?.name || 'Cliente'}</p>
            <div className="text-lg font-bold mb-2">{formatBRL(r.totalCents)}</div>
            <span className={`badge badge-${r.status}`}>{statusLabels[r.status] ?? r.status}</span>
            {r.status !== 'received' && (
              <div className="mt-3 flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  value={paying[r.id] || ''}
                  onChange={(e) => setPay({ ...paying, [r.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const v = Number(paying[r.id]);
                    if (v > 0) pay.mutate({ id: r.id, amountCents: Math.round(v * 100) });
                  }}
                >
                  Pagar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}