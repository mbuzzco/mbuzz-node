import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { track } from '../../src/client/trackRequest';
import { init, reset } from '../../src/config';
import * as api from '../../src/api';

vi.mock('../../src/api', () => ({
  postWithResponse: vi.fn(),
}));

describe('track', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  describe('validation', () => {
    it('returns false when eventType is empty', async () => {
      const result = await track({ visitorId: 'visitor_abc', eventType: '' });
      expect(result).toBe(false);
      expect(api.postWithResponse).not.toHaveBeenCalled();
    });

    it('returns false when eventType is whitespace', async () => {
      const result = await track({ visitorId: 'visitor_abc', eventType: '   ' });
      expect(result).toBe(false);
    });

    it('returns false when no identifier provided', async () => {
      const result = await track({ eventType: 'page_view' });
      expect(result).toBe(false);
    });

    it('accepts userId without visitorId', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });
      const result = await track({ userId: 'user_123', eventType: 'page_view' });
      expect(result).not.toBe(false);
    });
  });

  describe('success', () => {
    it('returns result with eventId', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        events: [{ id: 'evt_abc123' }],
      });

      const result = await track({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        eventType: 'page_view',
      });

      expect(result).toEqual({
        success: true,
        eventId: 'evt_abc123',
        eventType: 'page_view',
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
      });
    });
  });

  describe('payload', () => {
    it('sends correct structure to API', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        userId: 'user_123',
        eventType: 'page_view',
        properties: { url: '/pricing' },
      });

      expect(api.postWithResponse).toHaveBeenCalledWith('/events', {
        events: [
          expect.objectContaining({
            visitor_id: 'visitor_abc',
            session_id: 'session_xyz',
            user_id: 'user_123',
            event_type: 'page_view',
            properties: { url: '/pricing' },
            timestamp: expect.any(String),
          }),
        ],
      });
    });

    it('excludes undefined fields', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({ visitorId: 'visitor_abc', eventType: 'page_view' });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(payload.events[0]).not.toHaveProperty('session_id');
      expect(payload.events[0]).not.toHaveProperty('user_id');
    });

    it('includes ISO8601 timestamp', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({ visitorId: 'visitor_abc', eventType: 'page_view' });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(new Date(payload.events[0].timestamp).toISOString()).toBe(payload.events[0].timestamp);
    });
  });

  describe('failure', () => {
    it('returns false on API failure', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue(null);
      const result = await track({ visitorId: 'visitor_abc', eventType: 'page_view' });
      expect(result).toBe(false);
    });

    it('returns false on empty events array', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [] });
      const result = await track({ visitorId: 'visitor_abc', eventType: 'page_view' });
      expect(result).toBe(false);
    });
  });
});
