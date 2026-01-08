// Cookie constants and utilities
// NOTE: Session cookie removed in 0.7.0 - server handles session resolution

export const VISITOR_COOKIE = '_mbuzz_vid';

export const VISITOR_MAX_AGE = 63072000000; // 2 years in ms

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
