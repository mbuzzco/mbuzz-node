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

// Add middleware - handles cookies and session tracking
app.use(mbuzz.middleware());
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | *required* | Your Mbuzz API key |
| `apiUrl` | string | `https://mbuzz.co/api/v1` | API endpoint URL |
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

## Requirements

- Node.js 16+
- Express 4+ (for automatic integration)

## Links

- [Documentation](https://mbuzz.co/docs/sdks/nodejs)
- [Dashboard](https://mbuzz.co/dashboard)

## License

MIT License
