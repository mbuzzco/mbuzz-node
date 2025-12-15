import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as mbuzz from '../src/mbuzz';
import { reset as resetConfig } from '../src/config';
import * as trackRequest from '../src/client/trackRequest';
import * as conversionRequest from '../src/client/conversionRequest';
import * as identifyRequest from '../src/client/identifyRequest';
import * as context from '../src/context';

vi.mock('../src/client/trackRequest', () => ({
  track: vi.fn(),
}));

vi.mock('../src/client/conversionRequest', () => ({
  conversion: vi.fn(),
}));

vi.mock('../src/client/identifyRequest', () => ({
  identify: vi.fn(),
}));

describe('mbuzz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetConfig();
  });

  describe('init', () => {
    it('initializes the SDK', () => {
      expect(() => mbuzz.init({ apiKey: 'sk_test_abc123' })).not.toThrow();
    });

    it('throws when apiKey missing', () => {
      expect(() => mbuzz.init({ apiKey: '' })).toThrow('apiKey is required');
    });
  });

  describe('event', () => {
    beforeEach(() => {
      mbuzz.init({ apiKey: 'sk_test_abc123' });
    });

    it('calls track with eventType and properties', async () => {
      vi.mocked(trackRequest.track).mockResolvedValue({
        success: true,
        eventId: 'evt_1',
        eventType: 'page_view',
      });

      await mbuzz.event('page_view', { url: '/pricing' });

      expect(trackRequest.track).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'page_view',
          properties: { url: '/pricing' },
        })
      );
    });

    it('enriches properties from context when available', async () => {
      vi.mocked(trackRequest.track).mockResolvedValue({
        success: true,
        eventId: 'evt_1',
        eventType: 'page_view',
      });

      const ctx = new context.RequestContext({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
        url: 'https://example.com/auto',
        referrer: 'https://google.com',
      });

      await context.withContext(ctx, async () => {
        await mbuzz.event('page_view', { custom: 'value' });
      });

      expect(trackRequest.track).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: 'visitor_abc',
          sessionId: 'session_xyz',
          properties: expect.objectContaining({
            url: 'https://example.com/auto',
            referrer: 'https://google.com',
            custom: 'value',
          }),
        })
      );
    });

    it('returns result from track', async () => {
      const expectedResult = { success: true, eventId: 'evt_123', eventType: 'test' };
      vi.mocked(trackRequest.track).mockResolvedValue(expectedResult as any);

      const result = await mbuzz.event('test');

      expect(result).toEqual(expectedResult);
    });
  });

  describe('conversion', () => {
    beforeEach(() => {
      mbuzz.init({ apiKey: 'sk_test_abc123' });
    });

    it('calls conversion with conversionType and options', async () => {
      vi.mocked(conversionRequest.conversion).mockResolvedValue({
        success: true,
        conversionId: 'conv_1',
      });

      await mbuzz.conversion('purchase', { revenue: 99.99 });

      expect(conversionRequest.conversion).toHaveBeenCalledWith(
        expect.objectContaining({
          conversionType: 'purchase',
          revenue: 99.99,
        })
      );
    });

    it('uses visitorId from context', async () => {
      vi.mocked(conversionRequest.conversion).mockResolvedValue({
        success: true,
        conversionId: 'conv_1',
      });

      const ctx = new context.RequestContext({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
      });

      await context.withContext(ctx, async () => {
        await mbuzz.conversion('purchase', { revenue: 99.99 });
      });

      expect(conversionRequest.conversion).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: 'visitor_abc',
        })
      );
    });

    it('returns result from conversion', async () => {
      const expectedResult = {
        success: true,
        conversionId: 'conv_123',
        attribution: { models: {} },
      };
      vi.mocked(conversionRequest.conversion).mockResolvedValue(expectedResult as any);

      const result = await mbuzz.conversion('purchase');

      expect(result).toEqual(expectedResult);
    });
  });

  describe('identify', () => {
    beforeEach(() => {
      mbuzz.init({ apiKey: 'sk_test_abc123' });
    });

    it('calls identify with userId and traits', async () => {
      vi.mocked(identifyRequest.identify).mockResolvedValue(true);

      await mbuzz.identify('user_123', { traits: { email: 'test@example.com' } });

      expect(identifyRequest.identify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          traits: { email: 'test@example.com' },
        })
      );
    });

    it('uses visitorId from context', async () => {
      vi.mocked(identifyRequest.identify).mockResolvedValue(true);

      const ctx = new context.RequestContext({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
      });

      await context.withContext(ctx, async () => {
        await mbuzz.identify('user_123');
      });

      expect(identifyRequest.identify).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: 'visitor_abc',
        })
      );
    });

    it('returns result from identify', async () => {
      vi.mocked(identifyRequest.identify).mockResolvedValue(true);

      const result = await mbuzz.identify('user_123');

      expect(result).toBe(true);
    });
  });

  describe('middleware', () => {
    it('exports middleware function', () => {
      mbuzz.init({ apiKey: 'sk_test_abc123' });
      expect(typeof mbuzz.middleware).toBe('function');
    });
  });

  describe('context accessors', () => {
    beforeEach(() => {
      mbuzz.init({ apiKey: 'sk_test_abc123' });
    });

    it('visitorId returns undefined outside context', () => {
      expect(mbuzz.visitorId()).toBeUndefined();
    });

    it('sessionId returns undefined outside context', () => {
      expect(mbuzz.sessionId()).toBeUndefined();
    });

    it('visitorId returns value from context', async () => {
      const ctx = new context.RequestContext({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
      });

      await context.withContext(ctx, async () => {
        expect(mbuzz.visitorId()).toBe('visitor_abc');
      });
    });

    it('sessionId returns value from context', async () => {
      const ctx = new context.RequestContext({
        visitorId: 'visitor_abc',
        sessionId: 'session_xyz',
      });

      await context.withContext(ctx, async () => {
        expect(mbuzz.sessionId()).toBe('session_xyz');
      });
    });
  });
});
