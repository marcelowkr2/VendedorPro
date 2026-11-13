'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  tenants: { tenant: { id: string; name: string; active: boolean } }[];
}

interface AdminTenant {
  id: string;
  name: string;
  active: boolean;
}

export function AdminClient({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get<{ items: AdminUser[] }>('/api/v1/admin/users')).data.items,
  });
  const tenants = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => (await api.get<{ items: AdminTenant[] }>('/api/v1/admin/tenants')).data.items,
  });
  const status = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/api/v1/users/${id}`, { active }),
    onSuccess: async (_result, variables) => {
      toast.success(variables.active ? 'Usuário ativado.' : 'Usuário desativado.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Administração</h1>
        <p className="mt-2 text-sm text-white/80">Gerencie contas e consulte as empresas cadastradas.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Usuários</h2>
        <p className="mt-1 text-sm text-slate-500">Desativar uma conta encerra suas sessões e bloqueia o acesso.</p>
        {users.isPending ? <p className="mt-4 text-slate-500">Carregando usuários...</p> : users.isError ? (
          <p role="alert" className="mt-4 text-red-700">Não foi possível carregar os usuários. <button onClick={() => users.refetch()} className="underline">Tentar novamente</button></p>
        ) : users.data.length === 0 ? <p className="mt-4 text-slate-500">Nenhum usuário cadastrado.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500"><tr><th className="p-3">Usuário</th><th className="p-3">Empresa</th><th className="p-3">Status</th><th className="p-3">Ação</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.data.map((user) => (
                  <tr key={user.id}>
                    <td className="p-3"><div className="font-medium">{user.name}</div><div className="text-slate-500">{user.email}</div></td>
                    <td className="p-3">{user.tenants.map(({ tenant }) => tenant.name).join(', ') || 'Sem empresa'}</td>
                    <td className="p-3">{user.active ? 'Ativo' : 'Desativado'}</td>
                    <td className="p-3">
                      {user.role === 'admin_global' || user.id === currentUserId ? <span className="text-slate-400">Administrador</span> : (
                        <button className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50" disabled={status.isPending} onClick={() => {
                          const active = !user.active;
                          if (window.confirm(`${active ? 'Ativar' : 'Desativar'} a conta de ${user.name}?`)) status.mutate({ id: user.id, active });
                        }}>
                          {user.active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Empresas</h2>
        {tenants.isPending ? <p className="mt-4 text-slate-500">Carregando empresas...</p> : tenants.isError ? (
          <p role="alert" className="mt-4 text-red-700">Não foi possível carregar as empresas. <button onClick={() => tenants.refetch()} className="underline">Tentar novamente</button></p>
        ) : tenants.data.length === 0 ? <p className="mt-4 text-slate-500">Nenhuma empresa cadastrada.</p> : (
          <ul className="mt-4 divide-y divide-slate-100">{tenants.data.map((tenant) => (
            <li key={tenant.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{tenant.name}</span><span className="text-slate-500">{tenant.active ? 'Ativa' : 'Desativada'}</span></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
