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

// The one request that always reaches the app on a cached page. A cache never
// stores a POST, so this path is the only place the server can still mint.
export const SESSION_ENDPOINT_PATH = '/_mbuzz/session';

// Meta's browser id, written client-side by the customer's Meta Pixel. Read
// only, never set: forwarded on the session call so Meta can merge mbuzz's
// server event with the Pixel's browser event.
export const FBP_COOKIE = '_fbp';

// Meta's documented shape, fb.<subdomainIndex>.<creationTime>.<random>, plus
// the optional appendix Meta's server-side Parameter Builder adds
// (fb.1.<ts>.<random>.AQECAQIB). Both are valid to Meta. No `m` flag, so `$`
// anchors at the true end of the string and a trailing newline is rejected.
const FBP_FORMAT = /^fb\.\d+\.\d+\.\d+(?:\.[A-Za-z0-9_-]+)?$/;

/**
 * The Pixel's _fbp, or undefined when absent or not in Meta's format. mbuzz
 * never invents one and never rewrites what it forwards.
 */
export const readFbp = (value: unknown): string | undefined =>
  typeof value === 'string' && FBP_FORMAT.test(value) ? value : undefined;
