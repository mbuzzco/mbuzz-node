import { randomBytes } from 'node:crypto';

/**
 * Generate a random 64-character hex string for use as visitor/session ID.
 * Uses cryptographically secure random bytes.
 */
export function generateId(): string {
  return randomBytes(32).toString('hex');
}
