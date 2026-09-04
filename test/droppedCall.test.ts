import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { event, conversion, identify } from '../src/mbuzz';
import { init, reset } from '../src/config';
import { clearContext, withContext, RequestContext } from '../src/context';

vi.mock('../src/api', () => ({
  post: vi.fn().mockResolvedValue(true),
  postWithResponse: vi.fn().mockResolvedValue(null),
}));

// Every SDK guarded its send with a bare `return false`: no request, no log,
// nothing. Behind a full-page cache that is the whole failure — the cookie is
// never minted, so every later event fails this guard and vanishes. It cost a
// full day on a live account precisely because the silence was total from both
// sides.
//
// Deliberately NOT behind config.debug. The customers who hit this are exactly
// the ones not running in debug.

describe('dropped calls are never silent', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    clearContext();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
    reset();
  });

  const warnings = (): string =>
    warn.mock.calls.map((call) => String(call[0])).join('\n');

  it('warns when an event has no visitor and no user', async () => {
    const result = await event('add_to_cart', { sku: 'A1' });

    expect(result).toBe(false);
    expect(warnings()).toContain('add_to_cart');
    expect(warnings()).toContain('no visitorId and no userId');
  });

  // A conversion dropped here is lost revenue attribution.
  it('warns when a conversion has no visitor and no user', async () => {
    const result = await conversion('purchase', { revenue: 99.99 });

    expect(result).toBe(false);
    expect(warnings()).toContain('purchase');
    expect(warnings()).toContain('no visitorId and no userId');
  });

  // The warning has to name the fix, or it is just a different kind of dead
  // end for the customer reading their logs.
  it('points at the full-page cache fix', async () => {
    await event('add_to_cart');

    expect(warnings()).toContain('/_mbuzz/session');
    expect(warnings()).toContain('cache');
  });

  it('warns with the [mbuzz] prefix so it is greppable', async () => {
    await event('add_to_cart');

    expect(warnings()).toContain('[mbuzz]');
  });

  // A missing event type is a different bug from a missing identity, and
  // reporting it as the cache problem would send the reader somewhere useless.
  it('distinguishes a missing event type from a missing identity', async () => {
    await event('', {});

    expect(warnings()).not.toContain('/_mbuzz/session');
    expect(warnings()).toContain('eventType');
  });

  it('warns when identify has no user id', async () => {
    const result = await identify('');

    expect(result).toBe(false);
    expect(warnings()).toContain('[mbuzz]');
  });

  it('stays quiet when the call is valid', async () => {
    await withContext(
      new RequestContext({ visitorId: 'v1', ip: '203.0.113.9', userAgent: 'Chrome' }),
      () => event('add_to_cart')
    );

    expect(warnings()).not.toContain('dropped');
  });

  // An explicit visitorId on the call is enough on its own — a customer
  // tracking from a background job has no request context at all.
  it('does not warn when an explicit visitorId is passed to conversion', async () => {
    await conversion('purchase', { visitorId: 'v1', revenue: 10 });

    expect(warnings()).not.toContain('dropped');
  });
});

// The guard must sit at the OUTERMOST layer, not the one nearest the HTTP
// call. Ruby's equivalent fix was applied to the Client layer first and changed
// nothing observable, because the public entry point short-circuited before it
// — verified there by a test that stayed red. This is that test for Node: if
// the guard moved down into client/validation.ts, track() would still be
// reached and this would fail.
describe('the guard is the outermost one', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    clearContext();
  });

  afterEach(() => reset());

  it('never reaches the request layer without an identity', async () => {
    const trackRequest = await import('../src/client/trackRequest');
    const spy = vi.spyOn(trackRequest, 'track');

    await event('add_to_cart');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
