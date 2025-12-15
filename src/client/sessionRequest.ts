import { post } from '../api';
import { validateSession } from './validation';
import { buildSessionPayload } from './payloads';
import type { SessionOptions } from './types';

export const createSession = async (options: SessionOptions): Promise<boolean> => {
  if (!validateSession(options)) {
    return false;
  }

  const payload = buildSessionPayload(options);
  return post('/sessions', payload);
};
