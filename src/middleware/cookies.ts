// Cookie constants and utilities

export const VISITOR_COOKIE = '_mbuzz_vid';
export const SESSION_COOKIE = '_mbuzz_sid';

export const VISITOR_MAX_AGE = 63072000000; // 2 years in ms
export const SESSION_MAX_AGE = 1800000; // 30 minutes in ms

export interface CookieOptions {
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  secure?: boolean;
}

export const visitorCookieOptions = (secure: boolean): CookieOptions => ({
  maxAge: VISITOR_MAX_AGE,
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure,
});

export const sessionCookieOptions = (secure: boolean): CookieOptions => ({
  maxAge: SESSION_MAX_AGE,
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure,
});
