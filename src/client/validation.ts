// Pure validation functions
// NOTE: Session validation removed in v0.7.0 - server handles session resolution

import type { TrackOptions, ConversionOptions, IdentifyOptions } from './types';

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
