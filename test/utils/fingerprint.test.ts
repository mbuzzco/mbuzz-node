import { describe, it, expect } from 'vitest';
import { deviceFingerprint } from '../../src/utils/fingerprint';

describe('deviceFingerprint', () => {
  it('matches Ruby SHA256(ip|userAgent)[0:32]', () => {
    // Ruby: Digest::SHA256.hexdigest("127.0.0.1|Mozilla/5.0")[0, 32]
    expect(deviceFingerprint('127.0.0.1', 'Mozilla/5.0'))
      .toBe('ea687534a507e203bdef87cee3cc60c5');
  });

  it('is deterministic', () => {
    const a = deviceFingerprint('10.0.0.1', 'Chrome/120');
    const b = deviceFingerprint('10.0.0.1', 'Chrome/120');
    expect(a).toBe(b);
  });

  it('produces different fingerprints for different inputs', () => {
    const a = deviceFingerprint('10.0.0.1', 'Chrome/120');
    const b = deviceFingerprint('10.0.0.2', 'Chrome/120');
    const c = deviceFingerprint('10.0.0.1', 'Safari/17');
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('returns a 32-character hex string', () => {
    const result = deviceFingerprint('192.168.1.1', 'TestAgent/1.0');
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });
});
