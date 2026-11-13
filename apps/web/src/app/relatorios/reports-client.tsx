'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/card';
import { formatBRL } from '../../lib/utils';
import { StatCard } from '../../components/stat-card';

export function ReportsClient({ token }: { token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);

  const { data: dash } = useQuery({
    queryKey: ['dashboard', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/reports/dashboard'),
    enabled: !!tenant,
  });
  const { data: top } = useQuery({
    queryKey: ['top-products', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/reports/top-products?limit=5'),
    enabled: !!tenant,
  });
  const { data: low } = useQuery({
    queryKey: ['low-stock', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/reports/low-stock'),
    enabled: !!tenant,
  });

  const d = dash?.data;
  const topItems: any[] = top?.data?.items ?? [];
  const lowItems: any[] = low?.data?.items ?? [];

  if (!tenant) return <div className="text-slate-500">Selecione uma empresa.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Vendas do mês" value={d?.monthRevenueCents ?? 0} prefix="R$" />
        <StatCard label="Pedidos do mês" value={d?.monthOrdersCount ?? 0} />
        <StatCard label="Produtos" value={d?.productsCount ?? 0} />
        <StatCard label=" Clientes" value={d?.customersCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Produtos mais vendidos">
          {topItems.length === 0 ? (
            <p className="text-slate-400 text-sm">Sem vendas ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topItems.map((p: any) => (
                <li key={p.id || p.name} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{p.product?.name || p.name}</span>
                  <span className="text-slate-500">{p.quantity} un.</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Estoque baixo">
          {lowItems.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum produto com estoque baixo.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowItems.map((p: any) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-red-600 font-semibold">{p.stock} {p.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}