import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMiddleware } from '../../src/middleware/express';
import { init, reset, config } from '../../src/config';
import * as sessionRequest from '../../src/client/sessionRequest';

vi.mock('../../src/client/sessionRequest', () => ({
  createSession: vi.fn(),
}));

const mockRequest = (overrides = {}) => ({
  path: '/users',
  url: '/users?page=1',
  protocol: 'https',
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
    vi.mocked(sessionRequest.createSession).mockResolvedValue(true);
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
  });

  describe('session cookie', () => {
    it('uses existing session cookie', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        cookies: { _mbuzz_vid: 'visitor', _mbuzz_sid: 'existing_session' },
      });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz.sessionId).toBe('existing_session');
    });

    it('generates new session id when cookie missing', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ cookies: { _mbuzz_vid: 'visitor' } });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz.sessionId).toHaveLength(64);
    });

    it('sets session cookie with 30 minute expiry', async () => {
      const middleware = createMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect(res.cookie).toHaveBeenCalledWith(
        '_mbuzz_sid',
        expect.any(String),
        expect.objectContaining({
          maxAge: 1800000,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });
  });

  describe('session creation', () => {
    it('creates session when new session id generated', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({ cookies: { _mbuzz_vid: 'visitor' } });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      // Wait for setImmediate to execute
      await new Promise((resolve) => setImmediate(resolve));

      expect(sessionRequest.createSession).toHaveBeenCalledWith({
        visitorId: 'visitor',
        sessionId: expect.any(String),
        url: 'https://example.com/users?page=1',
        referrer: 'https://google.com',
      });
    });

    it('does not create session when session cookie exists', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        cookies: { _mbuzz_vid: 'visitor', _mbuzz_sid: 'session' },
      });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      // Wait for any potential setImmediate to execute
      await new Promise((resolve) => setImmediate(resolve));

      expect(sessionRequest.createSession).not.toHaveBeenCalled();
    });
  });

  describe('req.mbuzz', () => {
    it('attaches mbuzz object to request', async () => {
      const middleware = createMiddleware();
      const req = mockRequest({
        cookies: { _mbuzz_vid: 'visitor_abc', _mbuzz_sid: 'session_xyz' },
      });
      const res = mockResponse();
      const next = vi.fn();

      await middleware(req as any, res as any, next);

      expect((req as any).mbuzz).toEqual({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        userId: undefined,
      });
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
