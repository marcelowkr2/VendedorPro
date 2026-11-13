import { NextResponse } from 'next/server';
import { forwardedHeaders } from '../../../../lib/forwarded-headers';

const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function POST(request: Request) {
  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: forwardedHeaders(request),
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'A API está indisponível. Tente novamente.' }, { status: 502 });
  }
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}
