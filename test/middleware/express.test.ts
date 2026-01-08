import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMiddleware } from '../../src/middleware/express';
import { init, reset } from '../../src/config';

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
});
