import { createHash, randomBytes } from 'node:crypto';

const SESSION_TIMEOUT_SECONDS = 1800;
const SESSION_ID_LENGTH = 64;
const FINGERPRINT_LENGTH = 32;

/**
 * Generate deterministic session ID for returning visitors (have visitor cookie).
 * Same visitor_id + time bucket = same session ID.
 */
export function generateDeterministic(
  visitorId: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const timeBucket = Math.floor(timestamp / SESSION_TIMEOUT_SECONDS);
  const raw = `${visitorId}_${timeBucket}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, SESSION_ID_LENGTH);
}

/**
 * Generate session ID for new visitors using IP+UA fingerprint.
 * Same fingerprint + time bucket = same session ID.
 */
export function generateFromFingerprint(
  clientIp: string,
  userAgent: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const fingerprint = createHash('sha256')
    .update(`${clientIp}|${userAgent}`)
    .digest('hex')
    .slice(0, FINGERPRINT_LENGTH);
  const timeBucket = Math.floor(timestamp / SESSION_TIMEOUT_SECONDS);
  const raw = `${fingerprint}_${timeBucket}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, SESSION_ID_LENGTH);
}

/**
 * Generate random session ID (fallback).
 */
export function generateRandom(): string {
  return randomBytes(32).toString('hex');
}
