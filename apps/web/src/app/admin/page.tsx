import { redirect } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { getServerAuth } from '../../lib/server-auth';
import { AdminClient } from './admin-client';

export default async function AdminPage() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  if (auth.user.role !== 'admin_global') redirect('/dashboard');
  return <AppShell><AdminClient currentUserId={auth.userId} /></AppShell>;
}
