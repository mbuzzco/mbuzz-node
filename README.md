# mbuzz

Server-side multi-touch attribution for Node.js. Track customer journeys, attribute conversions, know which channels drive revenue.

## Installation

```bash
npm install mbuzz
# or
yarn add mbuzz
```

## Quick Start

### 1. Initialize

```javascript
// app.js or server.js
const mbuzz = require('mbuzz');

mbuzz.init({
  apiKey: process.env.MBUZZ_API_KEY,
  debug: process.env.NODE_ENV === 'development'
});
```

### 2. Track Events

```javascript
// Track user interactions
mbuzz.event('page_view', { url: '/pricing' });
mbuzz.event('add_to_cart', { productId: 'SKU-123', price: 49.99 });
```

### 3. Track Conversions

```javascript
// Track conversions with revenue
mbuzz.conversion('purchase', {
  revenue: 99.99,
  orderId: order.id
});

// Acquisition conversion (marks signup as THE acquisition moment)
mbuzz.conversion('signup', {
  userId: user.id,
  isAcquisition: true
});

// Recurring revenue (inherits attribution from acquisition)
mbuzz.conversion('payment', {
  userId: user.id,
  revenue: 49.00,
  inheritAcquisition: true
});
```

### 4. Identify Users

```javascript
// On signup or login - links visitor to user
mbuzz.identify(user.id, {
  traits: {
    email: user.email,
    name: user.name,
    plan: user.plan
  }
});
```

## Express Integration

```javascript
const express = require('express');
const mbuzz = require('mbuzz');

const app = express();

// Initialize SDK
mbuzz.init({
  apiKey: process.env.MBUZZ_API_KEY
});

// Add middleware - handles visitor cookies and context
app.use(mbuzz.middleware());
```

## Full-page caching

If pages are served from a full-page cache (Cloudflare, Varnish, nginx, a CDN), the cache
answers the request **without entering the Express stack**, so the middleware never runs, no
visitor cookie is set, and every later event is dropped for having no one to attribute it to.
The page renders perfectly and nothing is logged — the failure is silent.

`mbuzz.middleware()` already fixes this. It answers `POST /_mbuzz/session`, a path caches don't
store, and the **server** sets the cookie on that response. There is nothing extra to mount.

Then call it once per page, from your layout:

```html
<script>
  fetch('/_mbuzz/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: location.href, referrer: document.referrer || '' }),
    credentials: 'same-origin',
    keepalive: true
  }).catch(function () {});
</script>
```

Two things to keep as they are:

- **Inline the script, don't load it as a file.** Asset optimisers delay external scripts until
  the visitor first interacts. A visitor who lands and converts without clicking anything first
  would never be established.
- **`credentials: 'same-origin'` is required**, or the cookie never comes back.

The visitor id is never created or read in JavaScript. It stays `HttpOnly` and server-set, which
is what preserves its full two-year life — a cookie written by `document.cookie` is capped at
7 days under Safari's ITP, and 24 hours after an ad click.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | *required* | Your Mbuzz API key |
| `apiUrl` | string | `https://api.mbuzz.co/api/v1` | API endpoint URL |
| `enabled` | boolean | `true` | Enable/disable tracking |
| `debug` | boolean | `false` | Enable debug logging |
| `timeout` | number | `5000` | Request timeout in ms |
| `skipPaths` | string[] | `['/health', ...]` | Paths to skip tracking |
| `skipExtensions` | string[] | `['.js', '.css', ...]` | File extensions to skip |

## The 4-Call Model

| Method | When to Use |
|--------|-------------|
| `init` | Once on app boot |
| `event` | User interactions, funnel steps |
| `conversion` | Purchases, signups, any revenue event |
| `identify` | Login, signup, when you know the user |

## Error Handling

The SDK never throws exceptions. All methods return `false` or `null` on failure.

```javascript
// Check return values if needed
const result = mbuzz.event('test');
if (!result) {
  console.log('Tracking failed (check debug logs)');
}
```

A call dropped for having no one to attribute it to warns on `console.warn`, not silently, and
not only in debug mode:

```
[mbuzz] dropped event "add_to_cart": no visitorId and no userId. If your pages are served from a
full-page cache, mount mbuzz.middleware() and call POST /_mbuzz/session from the page — see the
README's "Full-page caching" section.
```

## Requirements

- Node.js 16+
- Express 4+ (for automatic integration)

## Links

- [Documentation](https://mbuzz.co/docs/sdks/nodejs)
- [Dashboard](https://mbuzz.co/dashboard)

## License

MIT License
