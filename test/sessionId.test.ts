import { describe, it, expect } from 'vitest';
import {
  generateDeterministic,
  generateFromFingerprint,
  generateRandom,
} from '../src/utils/sessionId';

describe('sessionId', () => {
  const sampleVisitorId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  const sampleTimestamp = 1735500000;
  const sampleIp = '203.0.113.42';
  const sampleUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  describe('generateDeterministic', () => {
    it('returns 64-char hex string', () => {
      const result = generateDeterministic(sampleVisitorId, sampleTimestamp);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is consistent for same inputs', () => {
      const result1 = generateDeterministic(sampleVisitorId, sampleTimestamp);
      const result2 = generateDeterministic(sampleVisitorId, sampleTimestamp);
      expect(result1).toBe(result2);
    });

    it('returns same ID within time bucket', () => {
      // bucket = timestamp / 1800
      // 1735500000 / 1800 = 964166
      // 1735500599 / 1800 = 964166 (last second of bucket)
      const timestamp1 = 1735500000;
      const timestamp2 = 1735500001;
      const timestamp3 = 1735500599;

      const result1 = generateDeterministic(sampleVisitorId, timestamp1);
      const result2 = generateDeterministic(sampleVisitorId, timestamp2);
      const result3 = generateDeterministic(sampleVisitorId, timestamp3);

      expect(result1).toBe(result2);
      expect(result1).toBe(result3);
    });

    it('returns different ID across time buckets', () => {
      const timestamp1 = 1735500000;
      const timestamp2 = 1735501800; // Next bucket

      const result1 = generateDeterministic(sampleVisitorId, timestamp1);
      const result2 = generateDeterministic(sampleVisitorId, timestamp2);

      expect(result1).not.toBe(result2);
    });

    it('returns different ID for different visitors', () => {
      const result1 = generateDeterministic('visitor_a', sampleTimestamp);
      const result2 = generateDeterministic('visitor_b', sampleTimestamp);

      expect(result1).not.toBe(result2);
    });
  });

  describe('generateFromFingerprint', () => {
    it('returns 64-char hex string', () => {
      const result = generateFromFingerprint(sampleIp, sampleUserAgent, sampleTimestamp);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is consistent for same inputs', () => {
      const result1 = generateFromFingerprint(sampleIp, sampleUserAgent, sampleTimestamp);
      const result2 = generateFromFingerprint(sampleIp, sampleUserAgent, sampleTimestamp);
      expect(result1).toBe(result2);
    });

    it('returns same ID within time bucket', () => {
      const timestamp1 = 1735500000;
      const timestamp2 = 1735500001;

      const result1 = generateFromFingerprint(sampleIp, sampleUserAgent, timestamp1);
      const result2 = generateFromFingerprint(sampleIp, sampleUserAgent, timestamp2);

      expect(result1).toBe(result2);
    });

    it('returns different ID across time buckets', () => {
      const timestamp1 = 1735500000;
      const timestamp2 = 1735501800;

      const result1 = generateFromFingerprint(sampleIp, sampleUserAgent, timestamp1);
      const result2 = generateFromFingerprint(sampleIp, sampleUserAgent, timestamp2);

      expect(result1).not.toBe(result2);
    });

    it('returns different ID for different IPs', () => {
      const result1 = generateFromFingerprint('192.168.1.1', sampleUserAgent, sampleTimestamp);
      const result2 = generateFromFingerprint('192.168.1.2', sampleUserAgent, sampleTimestamp);

      expect(result1).not.toBe(result2);
    });

    it('returns different ID for different user agents', () => {
      const result1 = generateFromFingerprint(sampleIp, 'Mozilla/5.0 Chrome', sampleTimestamp);
      const result2 = generateFromFingerprint(sampleIp, 'Mozilla/5.0 Safari', sampleTimestamp);

      expect(result1).not.toBe(result2);
    });
  });

  describe('generateRandom', () => {
    it('returns 64-char hex string', () => {
      const result = generateRandom();
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns unique IDs', () => {
      const result1 = generateRandom();
      const result2 = generateRandom();
      expect(result1).not.toBe(result2);
    });
  });

  describe('cross-method', () => {
    it('deterministic and fingerprint produce different IDs', () => {
      const deterministic = generateDeterministic(sampleVisitorId, sampleTimestamp);
      const fingerprint = generateFromFingerprint(sampleIp, sampleUserAgent, sampleTimestamp);

      expect(deterministic).not.toBe(fingerprint);
    });
  });
});
