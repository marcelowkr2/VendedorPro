import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { FinanceClient } from './finance-client';

export default async function FinancePage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <FinanceClient token={auth.token} />
    </AppShell>
  );
}