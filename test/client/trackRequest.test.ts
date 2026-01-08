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
        eventType: 'page_view',
      });

      expect(result).toEqual({
        success: true,
        eventId: 'evt_abc123',
        eventType: 'page_view',
        visitorId: 'visitor_abc',
      });
    });
  });

  describe('payload', () => {
    it('sends correct structure to API', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({
        visitorId: 'visitor_abc',
        userId: 'user_123',
        eventType: 'page_view',
        properties: { url: '/pricing' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(api.postWithResponse).toHaveBeenCalledWith('/events', {
        events: [
          expect.objectContaining({
            visitor_id: 'visitor_abc',
            user_id: 'user_123',
            event_type: 'page_view',
            properties: { url: '/pricing' },
            ip: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            timestamp: expect.any(String),
          }),
        ],
      });
    });

    it('excludes undefined fields', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({ visitorId: 'visitor_abc', eventType: 'page_view' });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(payload.events[0]).not.toHaveProperty('user_id');
      expect(payload.events[0]).not.toHaveProperty('ip');
      expect(payload.events[0]).not.toHaveProperty('user_agent');
    });

    it('includes ISO8601 timestamp', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({ visitorId: 'visitor_abc', eventType: 'page_view' });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(new Date(payload.events[0].timestamp).toISOString()).toBe(payload.events[0].timestamp);
    });

    it('includes identifier when provided', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ events: [{ id: 'evt_1' }] });

      await track({
        visitorId: 'visitor_abc',
        eventType: 'page_view',
        identifier: { email: 'test@example.com' },
      });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(payload.events[0].identifier).toEqual({ email: 'test@example.com' });
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
