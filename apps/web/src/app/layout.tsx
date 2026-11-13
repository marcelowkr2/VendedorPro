import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '../components/query-provider';

export const metadata: Metadata = {
  title: 'VendedorPro — Gestão Comercial',
  description: 'SaaS comercial para vendedores: produtos, clientes, pedidos, estoque e relatórios.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}