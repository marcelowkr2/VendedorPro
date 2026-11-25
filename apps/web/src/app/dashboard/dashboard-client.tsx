'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, BarChart3, Boxes, CircleDollarSign, ShoppingBag, UsersRound } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { formatBRL } from '../../lib/utils';

interface DashboardData {
  monthRevenueCents: number;
  monthOrdersCount: number;
  productsCount: number;
  customersCount: number;
  monthlySales: { key: string; totalCents: number; ordersCount: number }[];
  topProducts: { id: string; name: string; quantity: number; unit: string }[];
  lowStock: { id: string; name: string; stock: number; minStock: number; unit: string }[];
  lowStockCount: number;
}

const monthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 15))).replace('.', '');
};

export function DashboardClient() {
  const tenant = useAuthStore((s) => s.currentTenant);
  const user = useAuthStore((s) => s.user);
  const dashboard = useQuery({
    queryKey: ['dashboard-performance', tenant?.tenantId],
    queryFn: async () => (await api.get<DashboardData>('/api/v1/reports/dashboard-performance')).data,
    enabled: !!tenant,
  });

  if (!tenant) {
    return <p className="p-6 text-center text-slate-500">Nenhuma empresa selecionada. Faça login e selecione uma empresa.</p>;
  }
  if (dashboard.isPending) {
    return <div role="status" className="rounded-2xl bg-white p-8 text-slate-500">Carregando o dashboard...</div>;
  }
  if (dashboard.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-red-700">
        Não foi possível carregar os dados.{' '}
        <button type="button" className="font-semibold underline" onClick={() => dashboard.refetch()}>Tentar novamente</button>
      </div>
    );
  }

  const d = dashboard.data;
  const chartData = d.monthlySales.map((month) => ({ ...month, label: monthLabel(month.key) }));
  const hasSales = chartData.some((month) => month.ordersCount > 0);
  const cards = [
    { label: 'Vendas do mês', value: formatBRL(d.monthRevenueCents), description: 'Valor dos pedidos no mês', icon: CircleDollarSign, color: 'from-violet-600 to-indigo-700' },
    { label: 'Pedidos do mês', value: d.monthOrdersCount.toLocaleString('pt-BR'), description: 'Pedidos realizados no mês', icon: ShoppingBag, color: 'from-sky-500 to-blue-700' },
    { label: 'Produtos ativos', value: d.productsCount.toLocaleString('pt-BR'), description: 'No seu catálogo', icon: Boxes, color: 'from-emerald-500 to-teal-700' },
    { label: 'Clientes ativos', value: d.customersCount.toLocaleString('pt-BR'), description: 'Na sua carteira', icon: UsersRound, color: 'from-orange-500 to-rose-600' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-lg sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Visão geral do negócio</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Olá, {user?.name?.split(' ')[0] || 'bem-vindo'}!</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">Acompanhe o desempenho de {tenant.name} e veja o que precisa de atenção.</p>
          </div>
          <Link href="/pedidos" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-50">
            Ver pedidos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, description, icon: Icon, color }) => (
          <article key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-sm`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white/85">{label}</p>
              <span className="rounded-xl bg-white/15 p-2"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <p className="mt-3 break-words text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-white/75">{description}</p>
          </article>
        ))}
      </section>

      <p className="text-xs text-slate-500">Indicadores de vendas consideram pedidos ativos, exceto cancelados. Período: horário de São Paulo.</p>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="font-semibold text-slate-900">Evolução de vendas</h2><p className="mt-1 text-sm text-slate-500">Valor dos pedidos nos últimos 6 meses</p></div>
            <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><CircleDollarSign className="h-5 w-5" aria-hidden="true" /></span>
          </div>
          {hasSales ? (
            <div className="mt-6 h-64 min-w-0" aria-label="Gráfico de evolução de vendas">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis width={72} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(value: number) => formatBRL(value)} />
                  <Tooltip formatter={(value: number) => [formatBRL(value), 'Vendas']} />
                  <Area type="monotone" dataKey="totalCents" stroke="#7c3aed" strokeWidth={3} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="flex h-64 items-center justify-center text-center text-sm text-slate-500">Nenhum pedido no período para exibir vendas.</p>}
        </article>
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="font-semibold text-slate-900">Ritmo de pedidos</h2><p className="mt-1 text-sm text-slate-500">Quantidade por mês nos últimos 6 meses</p></div>
            <span className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><BarChart3 className="h-5 w-5" aria-hidden="true" /></span>
          </div>
          {hasSales ? (
            <div className="mt-6 h-64 min-w-0" aria-label="Gráfico de pedidos por mês">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [value, 'Pedidos']} />
                  <Bar dataKey="ordersCount" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="flex h-64 items-center justify-center text-center text-sm text-slate-500">Nenhum pedido no período para exibir o gráfico.</p>}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold text-slate-900">Produtos mais vendidos</h2><p className="mt-1 text-sm text-slate-500">Por quantidade, nos últimos 6 meses</p></div>
            <Link href="/relatorios" className="text-sm font-semibold text-indigo-700 hover:underline">Relatórios</Link>
          </div>
          {d.topProducts.length ? <ul className="mt-4 divide-y divide-slate-100">{d.topProducts.map((product, index) => (
            <li key={product.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-semibold text-indigo-700">{index + 1}</span>
              <span className="min-w-0 flex-1 break-words font-medium text-slate-700">{product.name}</span>
              <span className="shrink-0 text-slate-500">{product.quantity} {product.unit}</span>
            </li>
          ))}</ul> : <p className="mt-6 text-sm text-slate-500">Nenhum produto vendido no período.</p>}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="font-semibold text-slate-900">Atenção ao estoque</h2><p className="mt-1 text-sm text-slate-500">{d.lowStockCount} {d.lowStockCount === 1 ? 'produto precisa' : 'produtos precisam'} de atenção</p></div>
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
          </div>
          {d.lowStock.length ? <ul className="mt-4 divide-y divide-slate-100">{d.lowStock.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 break-words font-medium text-slate-700">{product.name}</span>
              <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">{product.stock} {product.unit}</span>
            </li>
          ))}</ul> : <p className="mt-6 text-sm text-slate-500">Nenhum produto com estoque baixo.</p>}
          <Link href="/estoque" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">Ver estoque <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </article>
      </section>
    </div>
  );
}
