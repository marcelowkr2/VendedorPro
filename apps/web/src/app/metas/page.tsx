import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { AppShell } from '../../components/app-shell';
import { GoalsClient } from './goals-client';

export default async function MetasPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return (
    <AppShell>
      <GoalsClient token={auth.token} />
    </AppShell>
  );
}