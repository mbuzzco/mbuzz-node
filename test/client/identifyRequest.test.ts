import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { identify } from '../../src/client/identifyRequest';
import { init, reset } from '../../src/config';
import * as api from '../../src/api';

vi.mock('../../src/api', () => ({
  post: vi.fn(),
}));

describe('identify', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  describe('validation', () => {
    it('returns false when userId is empty string', async () => {
      const result = await identify({ userId: '' });
      expect(result).toBe(false);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('returns false when userId is whitespace', async () => {
      const result = await identify({ userId: '   ' });
      expect(result).toBe(false);
    });

    it('accepts string userId', async () => {
      vi.mocked(api.post).mockResolvedValue(true);
      const result = await identify({ userId: 'user_123' });
      expect(result).toBe(true);
    });

    it('accepts numeric userId', async () => {
      vi.mocked(api.post).mockResolvedValue(true);
      const result = await identify({ userId: 12345 });
      expect(result).toBe(true);
    });
  });

  describe('success', () => {
    it('returns true on API success', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      const result = await identify({
        userId: 'user_123',
        visitorId: 'visitor_abc',
        traits: { email: 'user@example.com' },
      });

      expect(result).toBe(true);
    });
  });

  describe('payload', () => {
    it('sends correct structure to API', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      await identify({
        userId: 'user_123',
        visitorId: 'visitor_abc',
        traits: { email: 'user@example.com', name: 'Jane' },
      });

      expect(api.post).toHaveBeenCalledWith('/identify', {
        user_id: 'user_123',
        visitor_id: 'visitor_abc',
        traits: { email: 'user@example.com', name: 'Jane' },
        timestamp: expect.any(String),
      });
    });

    it('converts numeric userId to string', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      await identify({ userId: 12345 });

      const payload = vi.mocked(api.post).mock.calls[0][1] as any;
      expect(payload.user_id).toBe('12345');
    });

    it('defaults traits to empty object', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      await identify({ userId: 'user_123' });

      const payload = vi.mocked(api.post).mock.calls[0][1] as any;
      expect(payload.traits).toEqual({});
    });

    it('omits visitorId when not provided', async () => {
      vi.mocked(api.post).mockResolvedValue(true);

      await identify({ userId: 'user_123' });

      const payload = vi.mocked(api.post).mock.calls[0][1] as any;
      expect(payload.visitor_id).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('returns false on API failure', async () => {
      vi.mocked(api.post).mockResolvedValue(false);
      const result = await identify({ userId: 'user_123' });
      expect(result).toBe(false);
    });
  });
});
