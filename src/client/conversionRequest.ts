import { postWithResponse } from '../api';
import { validateConversion } from './validation';
import { buildConversionPayload } from './payloads';
import type { ConversionOptions, ConversionResult } from './types';

export type { ConversionResult } from './types';

interface ConversionResponse {
  conversion: { id?: string };
  attribution?: Record<string, unknown>;
}

const isProxyAccepted = (response: unknown): boolean =>
  !!response && typeof response === 'object' && 'status' in response &&
  (response as Record<string, unknown>).status === 'accepted';

const parseResponse = (response: ConversionResponse | null): ConversionResult | false => {
  if (!response?.conversion?.id) {
    if (isProxyAccepted(response)) {
      return { success: true };
    }
    return false;
  }

  return {
    success: true,
    conversionId: response.conversion.id,
    attribution: response.attribution,
  };
};

let identifierDeprecationWarned = false;
const warnIdentifierDeprecated = (): void => {
  if (identifierDeprecationWarned) return;
  identifierDeprecationWarned = true;
  // Surface once per process, matching Node's standard deprecation pattern.
  // Can be silenced with --no-deprecation or filtered via process.on('warning', …).
  if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
    process.emitWarning(
      'The `identifier` option on conversion() is deprecated and ignored by the backend on /conversions. Pass the email or external ID as `userId` instead.',
      'DeprecationWarning',
      'MBUZZ_CONVERSION_IDENTIFIER'
    );
  }
};

export const conversion = async (
  options: ConversionOptions
): Promise<ConversionResult | false> => {
  if (options.identifier !== undefined) {
    warnIdentifierDeprecated();
  }

  if (!validateConversion(options)) {
    return false;
  }

  const payload = buildConversionPayload(options);
  const response = await postWithResponse<ConversionResponse>('/conversions', payload);

  return parseResponse(response);
};
