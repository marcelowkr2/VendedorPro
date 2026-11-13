import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '../../../../lib/server-auth-cookies';
import { forwardedHeaders } from '../../../../lib/forwarded-headers';

const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('vp_refresh_token')?.value;
  if (!refreshToken) {
    const response = NextResponse.json({ message: 'Sessão expirada' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: forwardedHeaders(request),
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'A API está indisponível. Tente novamente.' }, { status: 502 });
  }

  const result = await upstream.json();
  const response = NextResponse.json(result, { status: upstream.status });
  if (upstream.ok) setAuthCookies(response, result);
  else clearAuthCookies(response);
  return response;
}
