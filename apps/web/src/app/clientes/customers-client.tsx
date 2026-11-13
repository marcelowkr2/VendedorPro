'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserRoundPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface Customer {
  id: string;
  name: string;
  cpfCnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
}

const emptyForm = { name: '', cpfCnpj: '', email: '', phone: '' };

export function CustomersClient() {
  const tenant = useAuthStore((state) => state.currentTenant);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingId(null);
    setForm(emptyForm);
  }, [tenant?.tenantId]);

  const customersQuery = useQuery({
    queryKey: ['customers', tenant?.tenantId, search],
    queryFn: () => api.get('/api/v1/customers', { params: { q: search || undefined, limit: 100 } }),
    enabled: !!tenant,
  });

  const saveCustomer = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: typeof form }) => {
      const body = {
        name: values.name.trim(),
        cpfCnpj: values.cpfCnpj.trim() || null,
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
      };
      return id ? api.patch(`/api/v1/customers/${id}`, body) : api.post('/api/v1/customers', body);
    },
    onSuccess: async () => {
      toast.success(editingId ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      setForm(emptyForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const deactivateCustomer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/customers/${id}`),
    onSuccess: async (_result, id) => {
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      toast.success('Cliente desativado.');
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customers: Customer[] = customersQuery.data?.data?.items ?? [];

  if (!tenant) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Selecione uma empresa para consultar os clientes.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-white/75">Relacionamento comercial</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Clientes</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">Organize seus contatos e mantenha os dados comerciais da sua empresa em um só lugar.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
            <Users aria-hidden="true" className="h-5 w-5" />
            <span className="text-sm font-semibold">{customers.length} {customers.length === 1 ? 'cliente' : 'clientes'}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><UserRoundPlus aria-hidden="true" className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold text-slate-900">{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
              <p className="text-sm text-slate-500">{editingId ? 'Atualize os dados do contato.' : 'Adicione um contato à sua carteira.'}</p>
            </div>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveCustomer.mutate({ id: editingId, values: form });
            }}
          >
            <label className="block">
              <span className="form-label">Nome ou razão social</span>
              <Input ref={nameInput} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={160} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">CPF/CNPJ</span>
                <Input value={form.cpfCnpj} onChange={(event) => setForm({ ...form, cpfCnpj: event.target.value })} maxLength={18} />
              </label>
              <label className="block">
                <span className="form-label">Telefone</span>
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={30} />
              </label>
            </div>
            <label className="block">
              <span className="form-label">E-mail</span>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={254} />
            </label>
            <Button className="w-full" type="submit" disabled={saveCustomer.isPending}>
              {saveCustomer.isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
            {editingId && (
              <Button className="w-full" variant="outline" type="button" disabled={saveCustomer.isPending} onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}>
                Cancelar edição
              </Button>
            )}
          </form>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-slate-900">Sua carteira</h2>
              <p className="text-sm text-slate-500">Pesquise e gerencie seus clientes.</p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>
          {customersQuery.isLoading ? (
            <div className="space-y-3" aria-label="Carregando clientes">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : customersQuery.isError ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
              Não foi possível carregar os clientes.
              <button type="button" className="ml-2 font-semibold underline" onClick={() => customersQuery.refetch()}>Tentar novamente</button>
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center">
              <Users aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-700">{search ? 'Nenhum cliente encontrado' : 'Sua carteira ainda está vazia'}</p>
              <p className="mt-1 text-sm text-slate-500">Cadastre seu primeiro cliente para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-3 py-3 font-medium">Cliente</th><th className="px-3 py-3 font-medium">Contato</th><th className="px-3 py-3 font-medium">Cadastro</th><th className="px-3 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-800">{customer.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{customer.cpfCnpj || 'Documento não informado'}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-slate-700">{customer.email || '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">{customer.phone || 'Telefone não informado'}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-500">{new Date(customer.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-4 text-right">
                        <button
                          className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                          disabled={saveCustomer.isPending || deactivateCustomer.isPending}
                          onClick={() => {
                            setEditingId(customer.id);
                            setForm({
                              name: customer.name,
                              cpfCnpj: customer.cpfCnpj ?? '',
                              email: customer.email ?? '',
                              phone: customer.phone ?? '',
                            });
                            nameInput.current?.focus();
                          }}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          disabled={saveCustomer.isPending || deactivateCustomer.isPending}
                          onClick={() => {
                            if (window.confirm(`Excluir ${customer.name}? O cliente será desativado e removido da lista.`)) deactivateCustomer.mutate(customer.id);
                          }}
                          type="button"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
