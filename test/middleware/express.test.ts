import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMiddleware, shouldCreateSession } from '../../src/middleware/express';
import { init, reset } from '../../src/config';

vi.mock('../../src/api', () => ({
  post: vi.fn().mockResolvedValue(true),
}));

import { post } from '../../src/api';

const mockRequest = (overrides = {}) => ({
  path: '/users',
  url: '/users?page=1',
  protocol: 'https',
  ip: '192.168.1.100',
  socket: { remoteAddress: '192.168.1.100' },
  headers: {
    'user-agent': 'Mozilla/5.0 Test Browser',
  },
  get: vi.fn((header: string) => {
    const headers: Record<string, string> = {
      host: 'example.com',
      referer: 'https://google.com',
    };
    return headers[header.toLowerCase()];
  }),
  cookies: {},
  ...overrides,
});

const mockResponse = () => {
  const res: any = {};
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

describe('express middleware', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  describe('createMiddleware', () => {
    it('returns a middleware function', () => {
      const middleware = createMiddleware();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('skip paths', () => {
    it('skips paths in skipPaths', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ path: '/health' });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('skips paths with skipped extensions', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ path: '/assets/app.js' });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('processes normal paths', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ path: '/users' });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('visitor cookie', () => {
    it('uses existing visitor cookie', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ cookies: { _mbuzz_vid: 'existing_visitor' } });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz.visitorId).toBe('existing_visitor');
    });

    it('generates new visitor id when cookie missing', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ cookies: {} });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz.visitorId).toHaveLength(64);
    });

    it('sets visitor cookie with correct options', async () => {
      const middleware = createMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(res.cookie).toHaveBeenCalledWith(
        '_mbuzz_vid',
        expect.any(String),
        expect.objectContaining({
          maxAge: 63072000000,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });

    it('only sets visitor cookie (no session cookie)', async () => {
      const middleware = createMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      // Should only set visitor cookie, not session cookie
      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        '_mbuzz_vid',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('visitor cookie set on all requests including non-navigations', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
        },
      });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(res.cookie).toHaveBeenCalledWith(
        '_mbuzz_vid',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('req.mbuzz', () => {
    it('attaches mbuzz object with visitorId, ip, and userAgent', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        cookies: { _mbuzz_vid: 'visitor_abc' },
        ip: '10.0.0.1',
        headers: { 'user-agent': 'Chrome/120' },
      });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz).toEqual({
        visitorId: 'visitor_abc',
        ip: '10.0.0.1',
        userAgent: 'Chrome/120',
        userId: undefined,
      });
    });

    it('extracts IP from X-Forwarded-For header', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        cookies: { _mbuzz_vid: 'visitor_abc' },
        headers: {
          'x-forwarded-for': '203.0.113.50, 198.51.100.1',
          'user-agent': 'Safari/17',
        },
      });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz.ip).toBe('203.0.113.50');
    });

    it('falls back to req.ip when no X-Forwarded-For', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        cookies: { _mbuzz_vid: 'visitor_abc' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test' },
      });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz.ip).toBe('127.0.0.1');
    });
  });

  describe('SDK disabled', () => {
    it('passes through when SDK disabled', async () => {
      reset();
      init({ apiKey: 'sk_test_abc123', enabled: false });

      const middleware = createMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('navigation detection', () => {
    describe('shouldCreateSession (whitelist: Sec-Fetch-* present)', () => {
      it('creates session for real page navigation', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'document',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(true);
      });

      it('skips session for turbo frame', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'same-origin',
            'sec-fetch-dest': 'empty',
            'turbo-frame': 'content_frame',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for htmx request', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'same-origin',
            'sec-fetch-dest': 'empty',
            'hx-request': 'true',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for fetch/XHR', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for prefetch', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'document',
            'sec-purpose': 'prefetch',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for iframe', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'iframe',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });
    });

    describe('shouldCreateSession (blacklist fallback: no Sec-Fetch-*)', () => {
      it('creates session for old browser without framework headers', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/4.0 (compatible; MSIE 8.0)',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(true);
      });

      it('skips session for old browser with Turbo-Frame', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/4.0',
            'turbo-frame': 'lazy_banner',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for old browser with HX-Request', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/4.0',
            'hx-request': 'true',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for old browser with XHR', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/4.0',
            'x-requested-with': 'XMLHttpRequest',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });

      it('skips session for old browser with Unpoly', () => {
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/4.0',
            'x-up-version': '3.0',
          },
        });

        expect(shouldCreateSession(req as any)).toBe(false);
      });
    });

    describe('session creation via middleware', () => {
      it('calls POST /sessions for real page navigation', async () => {
        const middleware = createMiddleware();
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'document',
          },
        });
        const res = mockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next);

        expect(post).toHaveBeenCalledWith(
          '/sessions',
          expect.objectContaining({
            session: expect.objectContaining({
              visitor_id: expect.any(String),
              session_id: expect.any(String),
              url: 'https://example.com/users?page=1',
              device_fingerprint: expect.stringMatching(/^[a-f0-9]{32}$/),
              started_at: expect.any(String),
            }),
          })
        );
      });

      it('does not call POST /sessions for sub-requests', async () => {
        const middleware = createMiddleware();
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
          },
        });
        const res = mockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next);

        expect(post).not.toHaveBeenCalled();
      });

      it('does not call POST /sessions for turbo frame requests', async () => {
        const middleware = createMiddleware();
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'same-origin',
            'sec-fetch-dest': 'empty',
            'turbo-frame': 'content_frame',
          },
        });
        const res = mockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next);

        expect(post).not.toHaveBeenCalled();
      });

      it('includes referrer in session payload when present', async () => {
        const middleware = createMiddleware();
        const req = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'document',
          },
        });
        const res = mockResponse();
        const next = vi.fn();

        await middleware(req as any, res as any, next);

        expect(post).toHaveBeenCalledWith(
          '/sessions',
          expect.objectContaining({
            session: expect.objectContaining({
              referrer: 'https://google.com',
            }),
          })
        );
      });

      it('always calls next() regardless of session creation', async () => {
        const middleware = createMiddleware();
        const next = vi.fn();

        // Navigation request
        const navReq = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'document',
          },
        });
        await middleware(navReq as any, mockResponse() as any, next);
        expect(next).toHaveBeenCalledTimes(1);

        vi.clearAllMocks();

        // Sub-request
        const subReq = mockRequest({
          headers: {
            'user-agent': 'Mozilla/5.0',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
          },
        });
        await middleware(subReq as any, mockResponse() as any, next);
        expect(next).toHaveBeenCalledTimes(1);
      });
    });
  });
});
