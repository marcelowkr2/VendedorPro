import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { QuotesClient } from './quotes-client';

export default async function QuotesPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <QuotesClient token={auth.token} />
    </AppShell>
  );
}