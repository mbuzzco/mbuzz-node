// Pure validation functions

import type { TrackOptions, ConversionOptions, IdentifyOptions, SessionOptions } from './types';

const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null && String(value).trim() !== '';

const hasIdentifier = (visitorId?: string, userId?: string | number): boolean =>
  isPresent(visitorId) || isPresent(userId);

export const validateTrack = (options: TrackOptions): boolean =>
  isPresent(options.eventType) && hasIdentifier(options.visitorId, options.userId);

export const validateConversion = (options: ConversionOptions): boolean =>
  isPresent(options.conversionType) &&
  (isPresent(options.eventId) || isPresent(options.visitorId) || isPresent(options.userId));

export const validateIdentify = (options: IdentifyOptions): boolean =>
  isPresent(options.userId);

export const validateSession = (options: SessionOptions): boolean =>
  isPresent(options.visitorId) && isPresent(options.sessionId) && isPresent(options.url);
