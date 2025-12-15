import { postWithResponse } from '../api';
import { validateConversion } from './validation';
import { buildConversionPayload } from './payloads';
import type { ConversionOptions, ConversionResult } from './types';

export type { ConversionResult } from './types';

interface ConversionResponse {
  conversion: { id?: string };
  attribution?: Record<string, unknown>;
}

const parseResponse = (response: ConversionResponse | null): ConversionResult | false => {
  if (!response?.conversion?.id) {
    return false;
  }

  return {
    success: true,
    conversionId: response.conversion.id,
    attribution: response.attribution,
  };
};

export const conversion = async (
  options: ConversionOptions
): Promise<ConversionResult | false> => {
  if (!validateConversion(options)) {
    return false;
  }

  const payload = buildConversionPayload(options);
  const response = await postWithResponse<ConversionResponse>('/conversions', payload);

  return parseResponse(response);
};
