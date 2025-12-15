import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSession } from '../../src/client/sessionRequest';
import { init, reset } from '../../src/config';
import * as api from '../../src/api';

vi.mock('../../src/api', () => ({
  post: vi.fn(),
}));

describe('createSession', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  describe('validation', () => {
    it('returns false when visitorId is empty', async () => {
      const result = await createSession({
        visitorId: '',
        sessionId: 'session_xyz',
        url: 'https://example.com',
      });
      expect(result).toBe(false);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('returns false when sessionId is empty', async () => {
      const result = await createSession({
        visitorId: 'visitor_abc',
        sessionId: '',
        url: 'https://example.com',
      });
      expect(result).toBe(false);
    });

    it('returns false when url is empty', async () => {
      const result = await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: '',
      });
      expect(result).toBe(false);
    });
  });

  describe('success', () => {
    it('returns true on API success', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      const result = await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com/page',
      });

      expect(result).toBe(true);
    });
  });

  describe('payload', () => {
    it('sends correct structure to API', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com/page',
        referrer: 'https://google.com',
      });

      expect(api.post).toHaveBeenCalledWith('/sessions', {
        session: {
          visitor_id: 'visitor_abc',
          session_id: 'session_xyz',
          url: 'https://example.com/page',
          referrer: 'https://google.com',
          started_at: expect.any(String),
        },
      });
    });

    it('uses current time as started_at by default', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      const before = new Date();
      await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com',
      });
      const after = new Date();

      const payload = vi.mocked(api.post).mock.calls[0][1] as any;
      const startedAt = new Date(payload.session.started_at);

      expect(startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('uses provided startedAt when given', async () => {
      vi.mocked(api.post).mockResolvedValue(true);
      const customTime = new Date('2025-01-15T10:30:00Z');

      await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com',
        startedAt: customTime,
      });

      const payload = vi.mocked(api.post).mock.calls[0][1] as any;
      expect(payload.session.started_at).toBe('2025-01-15T10:30:00.000Z');
    });

    it('omits referrer when not provided', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com',
      });

      const payload = vi.mocked(api.post).mock.calls[0][1] as any;
      expect(payload.session.referrer).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('returns false on API failure', async () => {
      vi.mocked(api.post).mockResolvedValue(false);

      const result = await createSession({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com',
      });

      expect(result).toBe(false);
    });
  });
});
