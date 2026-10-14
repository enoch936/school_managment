import type { CookieOptions } from 'express';

export const ACCESS_COOKIE = 'sms_access_token';
export const REFRESH_COOKIE = 'sms_refresh_token';

export function accessCookieOptions(secure: boolean, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function refreshCookieOptions(secure: boolean, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function clearCookieOptions(secure: boolean, path = '/'): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'strict', path };
}
