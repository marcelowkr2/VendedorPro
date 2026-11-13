import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { OrdersClient } from './orders-client';

export default async function OrdersPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <OrdersClient token={auth.token} />
    </AppShell>
  );
}