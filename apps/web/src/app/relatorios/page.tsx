import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { ReportsClient } from './reports-client';

export default async function RelatoriosPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <ReportsClient token={auth.token} />
    </AppShell>
  );
}