import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { LoginClient } from './login-client';

export default async function LoginPage() {
  const auth = await getServerAuth();
  if (auth) redirect('/dashboard');
  return <LoginClient />;
}
