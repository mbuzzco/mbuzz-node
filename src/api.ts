import * as https from 'node:https';
import * as http from 'node:http';
import { config } from './config';

const VERSION = '0.1.0';

function debugLog(message: string, data?: unknown): void {
  if (config.debug) {
    console.log(`[mbuzz] ${message}`, data ?? '');
  }
}

function makeRequest(
  path: string,
  payload: Record<string, unknown>
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    // Ensure base URL ends with / and path doesn't start with /
    const baseUrl = config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(cleanPath, baseUrl);
    const body = JSON.stringify(payload);

    const options: https.RequestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `mbuzz-node/${VERSION}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: config.timeout,
    };

    debugLog(`POST ${url.toString()}`, payload);

    // Use http or https based on the URL protocol
    const requestModule = url.protocol === 'https:' ? https : http;
    const req = requestModule.request(url, options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        debugLog(`Response ${res.statusCode}`, responseBody);
        resolve({ statusCode: res.statusCode ?? 0, body: responseBody });
      });
    });

    req.on('error', (error) => {
      debugLog('Request error', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      debugLog('Request timeout');
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Make a POST request to the API.
 * Returns true on success (2xx), false on any failure.
 * Never throws exceptions.
 */
export async function post(
  path: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!config.isInitialized) {
    debugLog('SDK not initialized');
    return false;
  }

  if (!config.enabled) {
    debugLog('SDK disabled');
    return false;
  }

  try {
    const { statusCode } = await makeRequest(path, payload);
    return statusCode >= 200 && statusCode < 300;
  } catch {
    return false;
  }
}

/**
 * Make a POST request to the API and return the parsed response.
 * Returns the parsed JSON on success, null on any failure.
 * Never throws exceptions.
 */
export async function postWithResponse<T = Record<string, unknown>>(
  path: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  if (!config.isInitialized) {
    debugLog('SDK not initialized');
    return null;
  }

  if (!config.enabled) {
    debugLog('SDK disabled');
    return null;
  }

  try {
    const { statusCode, body } = await makeRequest(path, payload);

    if (statusCode < 200 || statusCode >= 300) {
      return null;
    }

    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}
