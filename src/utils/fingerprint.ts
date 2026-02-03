import { createHash } from 'node:crypto';

/**
 * Compute a device fingerprint from IP and User-Agent.
 * Matches server-side: SHA256("ip|userAgent")[0:32]
 */
export function deviceFingerprint(ip: string, userAgent: string): string {
  return createHash('sha256')
    .update(`${ip}|${userAgent}`)
    .digest('hex')
    .substring(0, 32);
}
