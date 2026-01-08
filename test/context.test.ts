import { describe, it, expect, beforeEach } from 'vitest';
import {
  RequestContext,
  withContext,
  getContext,
  clearContext,
} from '../src/context';

describe('context', () => {
  beforeEach(() => {
    clearContext();
  });

  describe('RequestContext', () => {
    it('stores visitorId', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(ctx.visitorId).toBe('visitor_abc');
    });

    it('stores ip', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(ctx.ip).toBe('192.168.1.1');
    });

    it('stores userAgent', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(ctx.userAgent).toBe('Mozilla/5.0');
    });

    it('stores userId when provided', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        userId: 'user_123',
      });
      expect(ctx.userId).toBe('user_123');
    });

    it('stores url when provided', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        url: 'https://example.com/page',
      });
      expect(ctx.url).toBe('https://example.com/page');
    });

    it('stores referrer when provided', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://google.com',
      });
      expect(ctx.referrer).toBe('https://google.com');
    });
  });

  describe('enrichProperties', () => {
    it('adds url and referrer to properties', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        url: 'https://example.com/page',
        referrer: 'https://google.com',
      });

      const enriched = ctx.enrichProperties({ custom: 'value' });

      expect(enriched).toEqual({
        url: 'https://example.com/page',
        referrer: 'https://google.com',
        custom: 'value',
      });
    });

    it('does not include url if not set', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const enriched = ctx.enrichProperties({ custom: 'value' });

      expect(enriched).toEqual({ custom: 'value' });
      expect('url' in enriched).toBe(false);
    });

    it('does not include referrer if not set', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        url: 'https://example.com/page',
      });

      const enriched = ctx.enrichProperties({});

      expect(enriched).toEqual({ url: 'https://example.com/page' });
      expect('referrer' in enriched).toBe(false);
    });

    it('custom properties override context properties', () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        url: 'https://example.com/auto',
      });

      const enriched = ctx.enrichProperties({ url: 'https://custom.com' });

      expect(enriched.url).toBe('https://custom.com');
    });
  });

  describe('withContext', () => {
    it('provides context within callback', async () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      await withContext(ctx, () => {
        const current = getContext();
        expect(current).toBe(ctx);
        expect(current?.visitorId).toBe('visitor_abc');
      });
    });

    it('returns callback result', async () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result = await withContext(ctx, () => {
        return 'result_value';
      });

      expect(result).toBe('result_value');
    });

    it('supports async callbacks', async () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result = await withContext(ctx, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getContext()?.visitorId;
      });

      expect(result).toBe('visitor_abc');
    });

    it('clears context after callback', async () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      await withContext(ctx, () => {});

      expect(getContext()).toBeUndefined();
    });

    it('isolates context between concurrent calls', async () => {
      const ctx1 = new RequestContext({
        visitorId: 'visitor_1',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      const ctx2 = new RequestContext({
        visitorId: 'visitor_2',
        ip: '192.168.1.2',
        userAgent: 'Chrome/120',
      });
      const ctx3 = new RequestContext({
        visitorId: 'visitor_3',
        ip: '192.168.1.3',
        userAgent: 'Safari/17',
      });

      const results = await Promise.all([
        withContext(ctx1, async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return getContext()?.visitorId;
        }),
        withContext(ctx2, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return getContext()?.visitorId;
        }),
        withContext(ctx3, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return getContext()?.visitorId;
        }),
      ]);

      expect(results).toEqual(['visitor_1', 'visitor_2', 'visitor_3']);
    });
  });

  describe('getContext', () => {
    it('returns undefined outside of withContext', () => {
      expect(getContext()).toBeUndefined();
    });
  });

  describe('clearContext', () => {
    it('clears the current context', async () => {
      const ctx = new RequestContext({
        visitorId: 'visitor_abc',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      await withContext(ctx, () => {
        clearContext();
        expect(getContext()).toBeUndefined();
      });
    });
  });
});
