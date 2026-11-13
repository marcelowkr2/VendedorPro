import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface AuthContext {
  userId: string;
  user: { id: string; name: string; email: string; role: string };
  token: string;
  tenantId: string | null;
}

export async function getServerAuth(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('vp_access_token')?.value;
  if (!token) return null;

  const res = await fetch(
    `${process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/auth/me`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );

  if (!res.ok) return null;

  const user = await res.json();
  return {
    userId: user.id,
    user,
    token,
    tenantId: null,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getServerAuth();
  if (!auth) redirect('/login');
  return auth;
}