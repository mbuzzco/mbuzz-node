import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMiddleware } from '../../src/middleware/express';
import { SESSION_ENDPOINT_PATH, FBP_COOKIE, VISITOR_COOKIE, readFbp } from '../../src/middleware/cookies';
import { init, reset } from '../../src/config';

vi.mock('../../src/api', () => ({
  post: vi.fn().mockResolvedValue(true),
}));

import { post } from '../../src/api';

// Meta merges a server event with the browser Pixel's event for the same action
// on event_name + fbp when the event IDs differ. The SDK reads the cookie the
// Pixel already set and forwards it verbatim: never set, changed or invented.
//
// End to end: sdk_integration_tests/scenarios/fbp_capture_test.rb.

const FBP = 'fb.1.1758585600000.1234567890';
const VISITOR = 'a1b2c3d4'.repeat(8);

describe('readFbp', () => {
  it('reads a well-formed value', () => {
    expect(readFbp(FBP)).toBe(FBP);
  });

  it("reads a value with Meta's appendix", () => {
    expect(readFbp(`${FBP}.AQECAQIB`)).toBe(`${FBP}.AQECAQIB`);
  });

  it('is undefined when absent', () => {
    expect(readFbp(undefined)).toBeUndefined();
    expect(readFbp('')).toBeUndefined();
    expect(readFbp(42)).toBeUndefined();
  });

  it.each([
    'not-a-meta-cookie',
    `${FBP}.`,
    `${FBP}.a b`,
    `${FBP}.AQEC.AQEC`,
    `${FBP}.AQEC\n`,
    'fb.1.1758585600000.abc.AQEC',
    'xx.1.1758585600000.1234567890.AQEC',
  ])('drops a malformed value: %j', (value) => {
    expect(readFbp(value)).toBeUndefined();
  });

  it('names the cookie _fbp', () => {
    expect(FBP_COOKIE).toBe('_fbp');
  });
});

describe('the session call carries fbp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    init({ apiKey: 'sk_test_123' });
  });

  afterEach(() => reset());

  const request = (overrides: Record<string, unknown>, cookies: Record<string, string>) => ({
    method: 'GET',
    path: '/',
    url: '/',
    protocol: 'https',
    ip: '203.0.113.9',
    socket: { remoteAddress: '203.0.113.9' },
    headers: {
      'user-agent': 'Mozilla/5.0 Test Browser',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
    },
    get: vi.fn((header: string) => ({ host: 'example.com' } as Record<string, string>)[header.toLowerCase()]),
    cookies,
    body: {},
    ...overrides,
  });

  const response = () => {
    const res: any = {};
    res.cookie = vi.fn().mockReturnValue(res);
    res.set = vi.fn().mockReturnValue(res);
    res.status = vi.fn().mockReturnValue(res);
    res.end = vi.fn();
    return res;
  };

  const sessionPayload = (): Record<string, unknown> => {
    const calls = vi.mocked(post).mock.calls.filter(([path]) => path === '/sessions');
    expect(calls).toHaveLength(1);
    return (calls[0][1] as { session: Record<string, unknown> }).session;
  };

  it('on the page path', () => {
    createMiddleware()(
      request({}, { [VISITOR_COOKIE]: VISITOR, [FBP_COOKIE]: `${FBP}.AQECAQIB` }) as any,
      response(),
      vi.fn()
    );

    expect(sessionPayload().fbp).toBe(`${FBP}.AQECAQIB`);
  });

  it('on the session endpoint', () => {
    createMiddleware()(
      request(
        { method: 'POST', path: SESSION_ENDPOINT_PATH, url: SESSION_ENDPOINT_PATH, body: { url: 'https://shop.test/' } },
        { [FBP_COOKIE]: FBP }
      ) as any,
      response(),
      vi.fn()
    );

    expect(sessionPayload().fbp).toBe(FBP);
  });

  it('omits the key (not null) when the cookie is absent', () => {
    createMiddleware()(request({}, { [VISITOR_COOKIE]: VISITOR }) as any, response(), vi.fn());

    expect('fbp' in sessionPayload()).toBe(false);
  });

  it('omits the key when the cookie is malformed', () => {
    createMiddleware()(
      request({}, { [VISITOR_COOKIE]: VISITOR, [FBP_COOKIE]: 'not-a-meta-cookie' }) as any,
      response(),
      vi.fn()
    );

    expect('fbp' in sessionPayload()).toBe(false);
  });
});
