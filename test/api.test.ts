import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { post, postWithResponse } from '../src/api';
import { init, reset } from '../src/config';
import * as https from 'node:https';

// Mock https module
vi.mock('node:https', () => ({
  request: vi.fn(),
}));

describe('api', () => {
  beforeEach(() => {
    init({ apiKey: 'sk_test_abc123' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    reset();
  });

  describe('post', () => {
    it('returns true on successful response', async () => {
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(JSON.stringify({ success: true }));
          if (event === 'end') callback();
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn().mockReturnThis(),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation((url, options, callback) => {
        if (callback) callback(mockResponse as any);
        return mockRequest as any;
      });

      const result = await post('/events', { event_type: 'test' });
      expect(result).toBe(true);
    });

    it('returns false on error response', async () => {
      const mockResponse = {
        statusCode: 500,
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(JSON.stringify({ error: 'Server error' }));
          if (event === 'end') callback();
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn().mockReturnThis(),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation((url, options, callback) => {
        if (callback) callback(mockResponse as any);
        return mockRequest as any;
      });

      const result = await post('/events', { event_type: 'test' });
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      const mockRequest = {
        on: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('Connection refused'));
          return mockRequest;
        }),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation(() => {
        return mockRequest as any;
      });

      const result = await post('/events', { event_type: 'test' });
      expect(result).toBe(false);
    });

    it('sends correct headers', async () => {
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, callback) => {
          if (event === 'data') callback('{}');
          if (event === 'end') callback();
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn().mockReturnThis(),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation((url, options, callback) => {
        if (callback) callback(mockResponse as any);
        return mockRequest as any;
      });

      await post('/events', { event_type: 'test' });

      expect(https.request).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk_test_abc123',
            'Content-Type': 'application/json',
          }),
        }),
        expect.any(Function)
      );
    });

    it('returns false when SDK is disabled', async () => {
      reset();
      init({ apiKey: 'sk_test_abc123', enabled: false });

      const result = await post('/events', { event_type: 'test' });
      expect(result).toBe(false);
      expect(https.request).not.toHaveBeenCalled();
    });

    it('returns false when SDK is not initialized', async () => {
      reset();

      const result = await post('/events', { event_type: 'test' });
      expect(result).toBe(false);
      expect(https.request).not.toHaveBeenCalled();
    });
  });

  describe('postWithResponse', () => {
    it('returns parsed JSON on success', async () => {
      const responseData = { events: [{ id: 'evt_123' }] };
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(JSON.stringify(responseData));
          if (event === 'end') callback();
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn().mockReturnThis(),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation((url, options, callback) => {
        if (callback) callback(mockResponse as any);
        return mockRequest as any;
      });

      const result = await postWithResponse('/events', { event_type: 'test' });
      expect(result).toEqual(responseData);
    });

    it('returns null on error response', async () => {
      const mockResponse = {
        statusCode: 400,
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(JSON.stringify({ error: 'Bad request' }));
          if (event === 'end') callback();
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn().mockReturnThis(),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation((url, options, callback) => {
        if (callback) callback(mockResponse as any);
        return mockRequest as any;
      });

      const result = await postWithResponse('/events', { event_type: 'test' });
      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      const mockRequest = {
        on: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('Connection refused'));
          return mockRequest;
        }),
        write: vi.fn(),
        end: vi.fn(),
      };

      vi.mocked(https.request).mockImplementation(() => {
        return mockRequest as any;
      });

      const result = await postWithResponse('/events', { event_type: 'test' });
      expect(result).toBeNull();
    });

    it('returns null when SDK is disabled', async () => {
      reset();
      init({ apiKey: 'sk_test_abc123', enabled: false });

      const result = await postWithResponse('/events', { event_type: 'test' });
      expect(result).toBeNull();
      expect(https.request).not.toHaveBeenCalled();
    });
  });
});
