'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

export function LoginClient() {
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Não foi possível entrar');
      const auth = useAuthStore.getState();
      auth.setAuth({
        user: payload.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        tenants: payload.tenants,
      });
      const firstTenant = payload.tenants[0];
      if (firstTenant) auth.setCurrentTenant(firstTenant);
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao entrar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-600 text-white mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">VendedorPro</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de gestão comercial</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="form-label">E-mail</label>
            <input name="email" type="email" className="form-input" placeholder="admin@vendedorpro.com" required />
          </div>
          <div>
            <label className="form-label">Senha</label>
            <input name="password" type="password" className="form-input" placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary w-full">Entrar</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-brand-700 hover:underline">Criar conta</Link>
        </p>
        <p className="text-xs text-slate-400 text-center mt-6">BRL · PT-BR · America/Sao_Paulo</p>
      </div>
    </div>
  );
}