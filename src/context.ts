import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextOptions {
  visitorId: string;
  sessionId: string;
  userId?: string;
  url?: string;
  referrer?: string;
}

/**
 * Request context that holds visitor/session/user IDs and request metadata.
 * Used to automatically enrich events with URL and referrer.
 */
export class RequestContext {
  readonly visitorId: string;
  readonly sessionId: string;
  readonly userId?: string;
  readonly url?: string;
  readonly referrer?: string;

  constructor(options: RequestContextOptions) {
    this.visitorId = options.visitorId;
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.url = options.url;
    this.referrer = options.referrer;
  }

  /**
   * Enrich custom properties with url and referrer from context.
   * Custom properties override context properties.
   */
  enrichProperties(custom: Record<string, unknown>): Record<string, unknown> {
    const base: Record<string, unknown> = {};

    if (this.url) {
      base.url = this.url;
    }

    if (this.referrer) {
      base.referrer = this.referrer;
    }

    return { ...base, ...custom };
  }
}

// AsyncLocalStorage for request context isolation
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a callback with the given request context.
 * Context is automatically available via getContext() within the callback.
 */
export function withContext<T>(
  context: RequestContext,
  callback: () => T | Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    asyncLocalStorage.run(context, async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Get the current request context.
 * Returns undefined if called outside of withContext.
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Clear the current context.
 * Useful for testing or manual cleanup.
 */
export function clearContext(): void {
  // AsyncLocalStorage doesn't have a direct clear method,
  // but we can exit the store by running outside of it.
  // For testing, this effectively makes getStore() return undefined.
  asyncLocalStorage.disable();
}
