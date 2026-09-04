import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMiddleware } from '../../src/middleware/express';
import { SESSION_ENDPOINT_PATH } from '../../src/middleware/cookies';
import { init, reset } from '../../src/config';

vi.mock('../../src/api', () => ({
  post: vi.fn().mockResolvedValue(true),
}));

import { post } from '../../src/api';

// Attribution behind a full-page cache.
//
// A cached page is answered by the cache without ever entering the Express
// stack, so the tracking middleware never runs: no visitor cookie is set, and
// every later event is rejected for having no one to attribute it to. The bug
// is silent — the page renders perfectly and nothing is logged.
//
// The fix is an endpoint the cache never stores. The browser calls it, and the
// SERVER mints the cookie on that response. The id is never created or read in
// JS, so it stays HttpOnly and keeps its full two-year life (a cookie written
// by document.cookie is capped at 7 days under Safari's ITP, and 24 hours after
// an ad click — a JS-owned id would be worse than the bug it fixes).

const mockRequest = (overrides: Record<string, unknown> = {}) => ({
  method: 'POST',
  path: SESSION_ENDPOINT_PATH,
  url: SESSION_ENDPOINT_PATH,
  protocol: 'https',
  ip: '203.0.113.9',
  socket: { remoteAddress: '203.0.113.9' },
  headers: { 'user-agent': 'Mozilla/5.0 Test Browser' },
  get: vi.fn((header: string) => {
    const headers: Record<string, string> = { host: 'example.com' };
    return headers[header.toLowerCase()];
  }),
  cookies: {},
  body: {},
  ...overrides,
});

const mockResponse = () => {
  const res: any = { statusCode: 200, headers: {} };
  res.cookie = vi.fn().mockReturnValue(res);
  res.set = vi.fn((key: string, value: string) => {
    res.headers[key.toLowerCase()] = value;
    return res;
  });
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

const sessionPayload = () => {
  const call = (post as any).mock.calls.find((c: unknown[]) => c[0] === '/sessions');
  return call ? call[1].session : undefined;
};

describe('session endpoint', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  it('mints the visitor cookie', async () => {
    const res = mockResponse();

    await createMiddleware()(mockRequest() as any, res as any, vi.fn());

    expect(res.cookie).toHaveBeenCalledWith(
      '_mbuzz_vid',
      expect.any(String),
      expect.any(Object)
    );
  });

  it('keeps the cookie httpOnly and long-lived', async () => {
    const res = mockResponse();

    await createMiddleware()(mockRequest() as any, res as any, vi.fn());

    expect(res.cookie).toHaveBeenCalledWith(
      '_mbuzz_vid',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, maxAge: 63072000000 })
    );
  });

  // The endpoint is called by a script ON the page, so its own URL is useless.
  // The session must be recorded against the page the visitor is actually on.
  it('records the page url and referrer, not its own', async () => {
    const req = mockRequest({
      body: { url: 'https://example.com/pricing', referrer: 'https://google.com' },
    });

    await createMiddleware()(req as any, mockResponse() as any, vi.fn());

    expect(sessionPayload()).toMatchObject({
      url: 'https://example.com/pricing',
      referrer: 'https://google.com',
    });
  });

  // A returning visitor must keep their id, or every cached page view looks
  // like a new person and the journey is cut into fragments.
  it('preserves an existing visitor id', async () => {
    const req = mockRequest({ cookies: { _mbuzz_vid: 'returning456' } });

    await createMiddleware()(req as any, mockResponse() as any, vi.fn());

    expect(sessionPayload()).toMatchObject({ visitor_id: 'returning456' });
  });

  // A cached Set-Cookie handing every visitor the same id is corruption, not
  // loss, and far harder to notice than a missing row.
  it('gives two cookieless visitors distinct ids', async () => {
    const middleware = createMiddleware();
    const first = mockResponse();
    const second = mockResponse();

    await middleware(mockRequest() as any, first as any, vi.fn());
    await middleware(mockRequest() as any, second as any, vi.fn());

    expect(first.cookie.mock.calls[0][1]).not.toBe(second.cookie.mock.calls[0][1]);
  });

  it('answers 204 without a body', async () => {
    const res = mockResponse();

    await createMiddleware()(mockRequest() as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('does not call next for the endpoint', async () => {
    const next = vi.fn();

    await createMiddleware()(mockRequest() as any, mockResponse() as any, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('is not cacheable', async () => {
    const res = mockResponse();

    await createMiddleware()(mockRequest() as any, res as any, vi.fn());

    expect(res.headers['cache-control']).toMatch(/no-store/);
  });

  // A GET would be cacheable by an intermediary, which is the bug all over
  // again. The endpoint only answers POST.
  it('ignores a GET, falling through to the app', async () => {
    const next = vi.fn();
    const res = mockResponse();

    await createMiddleware()(
      mockRequest({ method: 'GET' }) as any,
      res as any,
      next
    );

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(204);
  });

  // Non-endpoint traffic must fall through untouched, or mounting the endpoint
  // would swallow the host application.
  it('leaves other paths to the tracking middleware', async () => {
    const next = vi.fn();
    const res = mockResponse();

    await createMiddleware()(
      mockRequest({ path: '/products', url: '/products' }) as any,
      res as any,
      next
    );

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(204);
  });

  // config.skipPaths must not swallow the one request that always reaches the
  // app on a cached page. `/_mbuzz` is not in the defaults today, but a
  // customer's own skipPaths could be.
  it('mints even when the path is configured as skipped', async () => {
    reset();
    init({ apiKey: 'sk_test_abc123', skipPaths: ['/_mbuzz'] });
    const res = mockResponse();

    await createMiddleware()(mockRequest() as any, res as any, vi.fn());

    expect(res.cookie).toHaveBeenCalledWith(
      '_mbuzz_vid',
      expect.any(String),
      expect.any(Object)
    );
  });

  // The endpoint is the session's only trigger on a cached page — the
  // Sec-Fetch-* navigation check that gates the page path must not gate it,
  // because a fetch() is never `navigate`/`document`.
  it('creates a session even though the request is not a navigation', async () => {
    const req = mockRequest({
      headers: {
        'user-agent': 'Mozilla/5.0',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
      },
    });

    await createMiddleware()(req as any, mockResponse() as any, vi.fn());

    expect(post).toHaveBeenCalledWith('/sessions', expect.any(Object));
  });

  it('does nothing when the SDK is disabled', async () => {
    reset();
    init({ apiKey: 'sk_test_abc123', enabled: false });
    const next = vi.fn();
    const res = mockResponse();

    await createMiddleware()(mockRequest() as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  // Express only populates req.body when a body parser is mounted, and the
  // endpoint must work without one — the customer's parser config is not
  // something the fix can depend on.
  it('mints without a parsed body', async () => {
    const req = mockRequest({ body: undefined });
    const res = mockResponse();

    await createMiddleware()(req as any, res as any, vi.fn());

    expect(res.cookie).toHaveBeenCalled();
    expect(sessionPayload()).toMatchObject({ url: undefined });
  });
});
