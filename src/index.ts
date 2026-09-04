// Main SDK API
export {
  init,
  event,
  conversion,
  identify,
  middleware,
  visitorId,
  userId,
} from './mbuzz';

// Types
export type { MbuzzOptions } from './config';
export type { TrackResult } from './client/trackRequest';
export type { ConversionResult } from './client/conversionRequest';
export type {
  TrackOptions,
  ConversionOptions,
  IdentifyOptions,
  Identifier,
} from './client/types';

// Context (for advanced usage)
export { RequestContext, withContext, getContext, clearContext } from './context';
export type { RequestContextOptions } from './context';

// Full-page caching. middleware() answers this path itself; the constants are
// exported so an app can reference the path without hardcoding it. The handler
// stays internal — exporting it would pull Express's types into the public
// .d.ts, and express is an optional peer dependency.
export { SESSION_ENDPOINT_PATH, VISITOR_COOKIE } from './middleware/cookies';

// Utilities
export { generateId } from './utils/identifier';
