# Changelog

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
