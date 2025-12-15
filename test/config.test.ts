import { describe, it, expect, beforeEach } from 'vitest';
import { config, init, reset } from '../src/config';

describe('config', () => {
  beforeEach(() => {
    reset();
  });

  describe('init', () => {
    it('sets apiKey from options', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.apiKey).toBe('sk_test_abc123');
    });

    it('throws error when apiKey is missing', () => {
      expect(() => init({} as any)).toThrow('apiKey is required');
    });

    it('throws error when apiKey is empty string', () => {
      expect(() => init({ apiKey: '' })).toThrow('apiKey is required');
    });

    it('sets default apiUrl', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.apiUrl).toBe('https://mbuzz.co/api/v1');
    });

    it('allows custom apiUrl', () => {
      init({ apiKey: 'sk_test_abc123', apiUrl: 'https://custom.example.com/api' });
      expect(config.apiUrl).toBe('https://custom.example.com/api');
    });

    it('sets default enabled to true', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.enabled).toBe(true);
    });

    it('allows disabling SDK', () => {
      init({ apiKey: 'sk_test_abc123', enabled: false });
      expect(config.enabled).toBe(false);
    });

    it('sets default debug to false', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.debug).toBe(false);
    });

    it('allows enabling debug mode', () => {
      init({ apiKey: 'sk_test_abc123', debug: true });
      expect(config.debug).toBe(true);
    });

    it('sets default timeout to 5000ms', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.timeout).toBe(5000);
    });

    it('allows custom timeout', () => {
      init({ apiKey: 'sk_test_abc123', timeout: 10000 });
      expect(config.timeout).toBe(10000);
    });

    it('sets default skipPaths', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.skipPaths).toContain('/health');
      expect(config.skipPaths).toContain('/healthz');
      expect(config.skipPaths).toContain('/ping');
    });

    it('merges custom skipPaths with defaults', () => {
      init({ apiKey: 'sk_test_abc123', skipPaths: ['/admin', '/internal'] });
      expect(config.skipPaths).toContain('/health');
      expect(config.skipPaths).toContain('/admin');
      expect(config.skipPaths).toContain('/internal');
    });

    it('sets default skipExtensions', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.skipExtensions).toContain('.js');
      expect(config.skipExtensions).toContain('.css');
      expect(config.skipExtensions).toContain('.png');
      expect(config.skipExtensions).toContain('.ico');
    });

    it('merges custom skipExtensions with defaults', () => {
      init({ apiKey: 'sk_test_abc123', skipExtensions: ['.pdf', '.doc'] });
      expect(config.skipExtensions).toContain('.js');
      expect(config.skipExtensions).toContain('.pdf');
      expect(config.skipExtensions).toContain('.doc');
    });
  });

  describe('isInitialized', () => {
    it('returns false before init', () => {
      expect(config.isInitialized).toBe(false);
    });

    it('returns true after init', () => {
      init({ apiKey: 'sk_test_abc123' });
      expect(config.isInitialized).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all config values', () => {
      init({ apiKey: 'sk_test_abc123', debug: true });
      reset();
      expect(config.isInitialized).toBe(false);
      expect(config.apiKey).toBe('');
    });
  });

  describe('shouldSkipPath', () => {
    beforeEach(() => {
      init({ apiKey: 'sk_test_abc123' });
    });

    it('returns true for paths in skipPaths', () => {
      expect(config.shouldSkipPath('/health')).toBe(true);
      expect(config.shouldSkipPath('/healthz')).toBe(true);
    });

    it('returns false for paths not in skipPaths', () => {
      expect(config.shouldSkipPath('/users')).toBe(false);
      expect(config.shouldSkipPath('/dashboard')).toBe(false);
    });

    it('returns true for paths with skipped extensions', () => {
      expect(config.shouldSkipPath('/assets/app.js')).toBe(true);
      expect(config.shouldSkipPath('/styles/main.css')).toBe(true);
      expect(config.shouldSkipPath('/images/logo.png')).toBe(true);
    });

    it('returns false for paths with non-skipped extensions', () => {
      expect(config.shouldSkipPath('/users/data.json')).toBe(false);
      expect(config.shouldSkipPath('/page.html')).toBe(false);
    });

    it('handles paths starting with skipped paths', () => {
      expect(config.shouldSkipPath('/health/check')).toBe(true);
      expect(config.shouldSkipPath('/healthz/live')).toBe(true);
    });
  });
});
