export interface MbuzzOptions {
  apiKey: string;
  enabled?: boolean;
  debug?: boolean;
  timeout?: number;
  skipPaths?: string[];
  skipExtensions?: string[];
}

const DEFAULT_API_URL = 'https://api.mbuzz.co/api/v1';
const DEFAULT_TIMEOUT = 5000;

const DEFAULT_SKIP_PATHS = [
  '/up',
  '/health',
  '/healthz',
  '/ping',
  '/cable',
  '/assets',
  '/packs',
  '/rails/active_storage',
  '/api',
];

const DEFAULT_SKIP_EXTENSIONS = [
  '.js',
  '.css',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.webp',
];

class Config {
  private _apiKey = '';
  private _apiUrl = DEFAULT_API_URL;
  private _enabled = true;
  private _debug = false;
  private _timeout = DEFAULT_TIMEOUT;
  private _skipPaths: string[] = [];
  private _skipExtensions: string[] = [];
  private _initialized = false;

  get apiKey(): string {
    return this._apiKey;
  }

  get apiUrl(): string {
    return this._apiUrl;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get debug(): boolean {
    return this._debug;
  }

  get timeout(): number {
    return this._timeout;
  }

  get skipPaths(): string[] {
    return this._skipPaths;
  }

  get skipExtensions(): string[] {
    return this._skipExtensions;
  }

  get isInitialized(): boolean {
    return this._initialized;
  }

  init(options: MbuzzOptions): void {
    if (!options.apiKey || options.apiKey.trim() === '') {
      throw new Error('apiKey is required');
    }

    this._apiKey = options.apiKey;
    this._apiUrl = DEFAULT_API_URL;
    this._enabled = options.enabled ?? true;
    this._debug = options.debug ?? false;
    this._timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this._skipPaths = [...DEFAULT_SKIP_PATHS, ...(options.skipPaths ?? [])];
    this._skipExtensions = [...DEFAULT_SKIP_EXTENSIONS, ...(options.skipExtensions ?? [])];
    this._initialized = true;
  }

  /**
   * Point the SDK at a different API host. For integration testing only.
   *
   * `apiUrl` was deliberately removed from init() in 0.8.2 so a production
   * install can never be redirected away from api.mbuzz.co by configuration.
   * That is still true: this refuses unless the configured key is `sk_test_`,
   * so only a test account can be redirected.
   */
  setApiUrlForTesting(apiUrl: string): void {
    if (!this._apiKey.startsWith('sk_test_')) {
      throw new Error(
        `setApiUrlForTesting() requires an sk_test_ key: a live install must never be redirected away from ${DEFAULT_API_URL}`
      );
    }

    this._apiUrl = apiUrl.replace(/\/+$/, '');
  }

  reset(): void {
    this._apiKey = '';
    this._apiUrl = DEFAULT_API_URL;
    this._enabled = true;
    this._debug = false;
    this._timeout = DEFAULT_TIMEOUT;
    this._skipPaths = [];
    this._skipExtensions = [];
    this._initialized = false;
  }

  shouldSkipPath(path: string): boolean {
    // Check if path starts with any skip path
    if (this._skipPaths.some((skipPath) => path.startsWith(skipPath))) {
      return true;
    }

    // Check if path has a skipped extension
    if (this._skipExtensions.some((ext) => path.endsWith(ext))) {
      return true;
    }

    return false;
  }
}

// Singleton instance
export const config = new Config();

// Convenience exports
export const init = (options: MbuzzOptions): void => config.init(options);
export const reset = (): void => config.reset();
export const setApiUrlForTesting = (apiUrl: string): void => config.setApiUrlForTesting(apiUrl);
