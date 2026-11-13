'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/produtos', label: 'Produtos', icon: '📦' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/estoque', label: 'Estoque', icon: '🏪' },
  { href: '/pedidos', label: 'Pedidos', icon: '🧾' },
  { href: '/orcamentos', label: 'Orçamentos', icon: '📝' },
  { href: '/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/metas', label: 'Metas', icon: '🎯' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, currentTenant, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão no servidor');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao encerrar sessão');
    } finally {
      logout();
      router.replace('/login');
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {menuOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 text-slate-300 transition-transform lg:static lg:z-auto lg:w-64 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">VP</div>
            <div>
              <div className="text-white font-semibold">VendedorPro</div>
              <div className="text-xs text-slate-400 truncate">{currentTenant?.name || 'Selecione empresa'}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[...nav, ...(user.role === 'admin_global' ? [{ href: '/admin', label: 'Administração', icon: '⚙️' }] : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                pathname === item.href
                  ? 'bg-brand-600 text-white'
                  : 'hover:bg-slate-800 hover:text-white',
              )}
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs">
              {user.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate">{user.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
                className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">VendedorPro</h1>
                <p className="max-w-[45vw] truncate text-xs text-slate-500">Gestão comercial · {currentTenant?.name || '—'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-36 truncate rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 sm:inline-block">{user.role.replaceAll('_', ' ')}</span>
          </div>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}