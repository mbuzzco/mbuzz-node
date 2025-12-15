import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { conversion } from '../../src/client/conversionRequest';
import { init, reset } from '../../src/config';
import * as api from '../../src/api';

vi.mock('../../src/api', () => ({
  postWithResponse: vi.fn(),
}));

describe('conversion', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  describe('validation', () => {
    it('returns false when conversionType is empty', async () => {
      const result = await conversion({ visitorId: 'visitor_abc', conversionType: '' });
      expect(result).toBe(false);
      expect(api.postWithResponse).not.toHaveBeenCalled();
    });

    it('returns false when no identifier provided', async () => {
      const result = await conversion({ conversionType: 'purchase' });
      expect(result).toBe(false);
    });

    it('accepts eventId as identifier', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_1' },
        attribution: {},
      });
      const result = await conversion({ eventId: 'evt_123', conversionType: 'purchase' });
      expect(result).not.toBe(false);
    });

    it('accepts visitorId as identifier', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_1' },
        attribution: {},
      });
      const result = await conversion({ visitorId: 'visitor_abc', conversionType: 'purchase' });
      expect(result).not.toBe(false);
    });

    it('accepts userId as identifier', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_1' },
        attribution: {},
      });
      const result = await conversion({ userId: 'user_123', conversionType: 'purchase' });
      expect(result).not.toBe(false);
    });
  });

  describe('success', () => {
    it('returns result with conversionId and attribution', async () => {
      const attributionData = {
        models: { first_touch: [{ channel: 'organic', credit: 1.0 }] },
      };

      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_abc123' },
        attribution: attributionData,
      });

      const result = await conversion({
        visitorId: 'visitor_abc',
        conversionType: 'purchase',
        revenue: 99.99,
      });

      expect(result).toEqual({
        success: true,
        conversionId: 'conv_abc123',
        attribution: attributionData,
      });
    });
  });

  describe('payload', () => {
    it('sends correct structure to API', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_1' },
        attribution: {},
      });

      await conversion({
        eventId: 'evt_123',
        visitorId: 'visitor_abc',
        userId: 'user_123',
        conversionType: 'purchase',
        revenue: 99.99,
        currency: 'EUR',
        isAcquisition: true,
        properties: { orderId: 'order_456' },
      });

      expect(api.postWithResponse).toHaveBeenCalledWith('/conversions', {
        conversion: expect.objectContaining({
          event_id: 'evt_123',
          visitor_id: 'visitor_abc',
          user_id: 'user_123',
          conversion_type: 'purchase',
          revenue: 99.99,
          currency: 'EUR',
          is_acquisition: true,
          properties: { orderId: 'order_456' },
          timestamp: expect.any(String),
        }),
      });
    });

    it('defaults currency to USD', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_1' },
        attribution: {},
      });

      await conversion({ visitorId: 'visitor_abc', conversionType: 'purchase' });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(payload.conversion.currency).toBe('USD');
    });

    it('includes inheritAcquisition when set', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({
        conversion: { id: 'conv_1' },
        attribution: {},
      });

      await conversion({
        userId: 'user_123',
        conversionType: 'payment',
        inheritAcquisition: true,
      });

      const payload = vi.mocked(api.postWithResponse).mock.calls[0][1] as any;
      expect(payload.conversion.inherit_acquisition).toBe(true);
    });
  });

  describe('failure', () => {
    it('returns false on API failure', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue(null);
      const result = await conversion({ visitorId: 'visitor_abc', conversionType: 'purchase' });
      expect(result).toBe(false);
    });

    it('returns false when conversion id missing', async () => {
      vi.mocked(api.postWithResponse).mockResolvedValue({ conversion: {}, attribution: {} });
      const result = await conversion({ visitorId: 'visitor_abc', conversionType: 'purchase' });
      expect(result).toBe(false);
    });
  });
});
