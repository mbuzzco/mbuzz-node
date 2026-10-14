# Changelog

## [0.11.0] - 2026-10-14

### Added

- **Meta's `_fbp` is forwarded on the session call.** The SDK reads the `_fbp` cookie the customer's
  Meta Pixel already set and sends it as `fbp` on the session payload, on both paths (the session
  endpoint and the page middleware). Meta merges a server event with the browser Pixel's event on
  `event_name` + `fbp` when the event IDs differ, so without it every server `Lead` counted as a
  second one. Accepts Meta's `fb.<n>.<ts>.<random>` and the optional appendix its server-side
  Parameter Builder adds (`...AQECAQIB`); anything else is dropped. Never written, never invented.
  The key is omitted, not null, when the cookie is absent or malformed. No install change needed
  beyond `cookie-parser`, which `middleware()` already requires.
- **`setApiUrlForTesting(url)`.** Points the SDK at a local API for integration tests. Refuses
  unless the configured key is `sk_test_`, so a live install still cannot be redirected by
  configuration (`apiUrl` stays removed from `init()` since 0.8.2).

## [0.10.1] - 2026-09-17

### Fixed — the visitor's IP now reaches mbuzz on session create

- **`POST /api/v1/sessions` now carries `ip`.** Both middlewares already had the visitor's address —
  it is half of `device_fingerprint = SHA256(ip|user_agent)` — and both left it out of the session
  payload. Events and conversions have always sent one; only sessions did not.
- **Why it matters.** mbuzz sends Meta's Conversions API `client_ip_address`, which Meta documents as
  **required** for website events, and a session with no address means every event resolved through
  it carries none either. Upgrading improves Event Match Quality for anyone using conversion
  feedback; it changes nothing else.
- **No API change.** Both `createSessionAsync` call sites already received the IP, so no caller
  changes and no configuration is needed.

Found by the SDK integration harness against the Ruby SDK — every layer was correct on its own, so
only a real request through a real app could tell the visitor's address from the app server's — and
the same omission was here.

## [0.10.0] - 2026-09-08

### BREAKING — the page snippet is now required

- **A page response no longer sets the visitor cookie.** Only `POST /_mbuzz/session` mints, and the inline snippet in the README's "Full-page caching" section is what calls it. **Upgrading without adding that snippet stops tracking entirely** — no cookie is ever minted, so no visitor exists and every event is dropped.

### Fixed

- **A cached page no longer hands every visitor the same id.** The page response carried a `Set-Cookie`, and a full-page cache stored it and replayed it to everyone — so unrelated people merged into a single journey. Corruption rather than loss: every row still exists, each attributed to the wrong person, and nothing looks missing. The page path now uses only the cookie the browser already holds; the uncached session endpoint is the sole place a visitor is minted.

  Found by the cache harness at `sdk_integration_tests/scenarios/page_cache_test.rb`, and it could not have been found any other way: in isolation "reuse the cookie the browser presents" is correct — it is what lets a returning visitor keep their id. The bug exists only once a cache has handed one cookie to many people. The WordPress plugin reached the same conclusion first (`CookieBootstrap::CONTEXT_PAGE`).

## [0.9.0] - 2026-09-04

### Fixed

- **Attribution behind a full-page cache.** A cached page is answered without entering the Express stack, so the middleware never ran, no visitor cookie was set, and every later event was dropped for having no one to attribute it to — silently, with the page rendering perfectly and nothing logged. `mbuzz.middleware()` now also answers `POST /_mbuzz/session`, a path caches don't store, and the **server** mints the cookie on that response. Call it once per page with a small inline `fetch` — see the README's "Full-page caching" section. The visitor id is never created or read in JavaScript, so it stays `HttpOnly` and keeps its full two-year life; a `document.cookie` id would be capped at 7 days under Safari's ITP, and 24 hours after an ad click. Nothing extra to mount, and the endpoint is checked ahead of `skipPaths` so a customer's own config cannot swallow the one request that still reaches the app.

### Added

- **A dropped call now says why, instead of nothing at all.** `event()`, `conversion()` and `identify()` guarded their send with a bare `return false`: no request, no log. Behind a full-page cache that is the whole failure, and the silence is what made it cost a full day on a live account. They now warn on `console.warn` — deliberately not behind `debug`, since the customers who hit this are exactly the ones not running in debug — naming the call, the reason, and the fix. The guard sits at the public entry point, not at the request layer, so nothing is dropped further in without a warning.

## [0.8.3] - 2026-05-25

### Deprecated

- **`identifier` option on `conversion()`.** Pass the email or external ID as `userId` instead. The backend `/conversions` endpoint has never permitted this field — Rails strong params strip it — and the events endpoint treats `identifier.email` exactly as `user_id`. The field still serializes into the payload (backwards-compatible — existing callers keep working). `ConversionOptions.identifier` is now marked `@deprecated`, and `conversion()` emits a one-shot `process.emitWarning` with code `MBUZZ_CONVERSION_IDENTIFIER` when the option is passed. Silenceable via `--no-deprecation` or `process.on('warning', …)`. Will be removed in a future major release. Matched by deprecation in `mbuzz-php` 1.2.1 and `mbuzz-python` 0.8.3.

## [0.8.2] - 2026-03-15

### Changed

- **Removed `apiUrl` from `init()` options** — the proxy URL (`https://api.mbuzz.co/api/v1`) is now hardcoded. This prevents accidental bypass of the edge ingest proxy.

### Fixed

- **`event()` and `conversion()` now handle proxy-buffered responses gracefully** — when the edge proxy accepts a request but Rails is temporarily unreachable, the SDK returns `{ success: true }` with nil IDs instead of `false`.

## [0.8.0] - 2026-03-13

### Changed

- **Default API URL updated to `https://api.mbuzz.co/api/v1`** — traffic now routes through the edge ingest proxy for improved reliability.

## [0.7.4] - 2026-02-17

### Fixed

- **`identify()` now writes `userId` back to context** — after a successful API call, `userId` is stored in the `AsyncLocalStorage` context so that subsequent `conversion()` calls in the same request can resolve it.
- **`RequestContext.userId` is now mutable** — was `readonly`, preventing `identify()` from updating it.

## [0.7.3] - 2026-02-04

### Added

- **Navigation-aware session creation** — middleware now calls `POST /sessions`
  for real page navigations, gated by `Sec-Fetch-*` headers (whitelist) with
  framework-specific blacklist fallback.
  - Turbo Frame, htmx, Unpoly, XHR, prefetch, and iframe requests are filtered.
- `shouldCreateSession()` exported from middleware for testing.
- `deviceFingerprint()` utility matching server-side `SHA256(ip|user_agent)[0:32]`.

### Changed

- Middleware now creates sessions for page navigations (re-added after v0.7.0
  removal, now properly gated by navigation detection).

## [0.7.0] - 2026-01-09

### Breaking Changes

- Session cookie removed — server handles session resolution.
- Session ID generation removed from SDK.

### Added

- Server-side session resolution via ip/user_agent forwarding.
- `RequestContext` with `AsyncLocalStorage` for request-scoped data.
- Cross-device identity resolution via `identifier` parameter.
