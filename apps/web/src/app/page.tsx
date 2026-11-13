import { redirect } from 'next/navigation';
import { getServerAuth } from '../lib/server-auth';

export default async function Page() {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  redirect('/dashboard');
}