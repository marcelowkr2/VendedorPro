import { NextResponse } from 'next/server';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set('vp_access_token', tokens.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60,
  });
  response.cookies.set('vp_refresh_token', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set('vp_access_token', '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set('vp_refresh_token', '', { ...cookieOptions, maxAge: 0 });
}
