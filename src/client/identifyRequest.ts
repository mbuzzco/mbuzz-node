import { post } from '../api';
import { validateIdentify } from './validation';
import { buildIdentifyPayload } from './payloads';
import type { IdentifyOptions } from './types';

export const identify = async (options: IdentifyOptions): Promise<boolean> => {
  if (!validateIdentify(options)) {
    return false;
  }

  const payload = buildIdentifyPayload(options);
  return post('/identify', payload);
};
