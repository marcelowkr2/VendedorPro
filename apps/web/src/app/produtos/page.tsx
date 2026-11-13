import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { ProductsClient } from './products-client';

export default async function ProductsPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <ProductsClient token={auth.token} />
    </AppShell>
  );
}