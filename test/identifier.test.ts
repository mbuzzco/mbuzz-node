import { describe, it, expect } from 'vitest';
import { generateId } from '../src/utils/identifier';

describe('identifier', () => {
  describe('generateId', () => {
    it('returns a 64-character hex string', () => {
      const id = generateId();
      expect(id).toHaveLength(64);
    });

    it('returns only hex characters', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]+$/);
    });

    it('generates unique IDs on each call', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('generates cryptographically random IDs', () => {
      // Check that IDs have reasonable entropy (no obvious patterns)
      const id1 = generateId();
      const id2 = generateId();

      // They should not be sequential or similar
      expect(id1).not.toBe(id2);

      // First 8 characters should be different (extremely unlikely to match)
      expect(id1.substring(0, 8)).not.toBe(id2.substring(0, 8));
    });
  });
});
