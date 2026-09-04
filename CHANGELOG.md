# Changelog

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
