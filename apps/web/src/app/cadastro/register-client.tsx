'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function RegisterClient() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== form.get('confirmPassword')) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Não foi possível criar a conta.');
      toast.success('Conta criada. Entre com seu e-mail e senha.');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar a conta.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-slate-900">Crie sua conta</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Sua carteira comercial em um espaço exclusivo.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="form-label">Nome</span><input className="form-input" name="name" maxLength={120} required /></label>
          <label className="block"><span className="form-label">E-mail</span><input className="form-input" name="email" type="email" maxLength={254} required /></label>
          <label className="block"><span className="form-label">Senha</span><input className="form-input" name="password" type="password" minLength={8} maxLength={128} required /></label>
          <label className="block"><span className="form-label">Confirmar senha</span><input className="form-input" name="confirmPassword" type="password" minLength={8} maxLength={128} required /></label>
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? 'Criando conta...' : 'Criar conta'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">Já tem conta? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Entrar</Link></p>
      </div>
    </div>
  );
}
