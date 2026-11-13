import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <DashboardClient userId={auth.userId} token={auth.token} />
    </AppShell>
  );
}