import { redirect } from 'next/navigation';
import { getServerAuth } from '../../lib/server-auth';
import { RegisterClient } from './register-client';

export default async function RegisterPage() {
  if (await getServerAuth()) redirect('/dashboard');
  return <RegisterClient />;
}
