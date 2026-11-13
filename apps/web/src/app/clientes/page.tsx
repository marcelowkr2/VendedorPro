import { redirect } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { getServerAuth } from '../../lib/server-auth';
import { CustomersClient } from './customers-client';

export default async function CustomersPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');

  return (
    <AppShell>
      <CustomersClient />
    </AppShell>
  );
}
