export interface MbuzzOptions {
  apiKey: string;
  apiUrl?: string;
  enabled?: boolean;
  debug?: boolean;
  timeout?: number;
  skipPaths?: string[];
  skipExtensions?: string[];
}

const DEFAULT_API_URL = 'https://mbuzz.co/api/v1';
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
    this._apiUrl = options.apiUrl ?? DEFAULT_API_URL;
    this._enabled = options.enabled ?? true;
    this._debug = options.debug ?? false;
    this._timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this._skipPaths = [...DEFAULT_SKIP_PATHS, ...(options.skipPaths ?? [])];
    this._skipExtensions = [...DEFAULT_SKIP_EXTENSIONS, ...(options.skipExtensions ?? [])];
    this._initialized = true;
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
