'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { StatCard } from '../../components/stat-card';
import { Card } from '../../components/card';
import { ChartCard } from '../../components/chart-card';

export function DashboardClient({ token }: { userId: string; token: string }) {
  const tenant = useAuthStore((s) => s.currentTenant);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', tenant?.tenantId],
    queryFn: () => api.get('/api/v1/reports/dashboard'),
    enabled: !!tenant,
  });

  if (!tenant) {
    return (
      <div className="p-6 text-center text-slate-500">
        Nenhuma empresa selecionada. Faça login e selecione uma empresa.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const d = data?.data;
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500 text-sm">Empresa: {tenant.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Vendas do mês" value={d?.monthRevenueCents ?? 0} prefix="R$" />
        <StatCard label="Pedidos do mês" value={d?.monthOrdersCount ?? 0} />
        <StatCard label="Produtos" value={d?.productsCount ?? 0} />
        <StatCard label=" clientes" value={d?.customersCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Produtos com estoque baixo">
          <StockLowList tenantId={tenant.tenantId} token={token} />
        </Card>
        <Card title="Produtos mais vendidos">
          <TopProducts tenantId={tenant.tenantId} token={token} />
        </Card>
      </div>
    </div>
  );
}

function StockLowList({ tenantId, token }: { tenantId: string; token: string }) {
  const { data } = useQuery({
    queryKey: ['low-stock', tenantId],
    queryFn: () => api.get('/api/v1/reports/low-stock'),
  });
  const items = data?.data ?? [];
  if (!items.length) return <p className="text-slate-400 text-sm">Nenhum produto com estoque baixo.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((p: any) => (
        <li key={p.id} className="py-2 flex items-center justify-between text-sm">
          <span className="font-medium">{p.name}</span>
          <span className="text-red-600 font-semibold">{p.stock} {p.unit}</span>
        </li>
      ))}
    </ul>
  );
}

function TopProducts({ tenantId, token }: { tenantId: string; token: string }) {
  const { data } = useQuery({
    queryKey: ['top-products', tenantId],
    queryFn: () => api.get('/api/v1/reports/top-products?limit=5'),
  });
  const items = data?.data ?? [];
  if (!items.length) return <p className="text-slate-400 text-sm">Sem vendas ainda.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((p: any) => (
        <li key={p.name} className="py-2 flex items-center justify-between text-sm">
          <span className="font-medium">{p.name}</span>
          <span className="text-slate-500">{p.quantity} un.</span>
        </li>
      ))}
    </ul>
  );
}