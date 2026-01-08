// Pure payload builder functions
// NOTE: Session ID removed in v0.7.0 - server handles session resolution

import type { TrackOptions, ConversionOptions, IdentifyOptions } from './types';

const timestamp = (): string => new Date().toISOString();

const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;

export const buildTrackPayload = (options: TrackOptions) => ({
  events: [
    compact({
      visitor_id: options.visitorId,
      user_id: options.userId,
      event_type: options.eventType,
      properties: options.properties ?? {},
      timestamp: timestamp(),
      ip: options.ip,
      user_agent: options.userAgent,
      identifier: options.identifier,
    }),
  ],
});

export const buildConversionPayload = (options: ConversionOptions) => ({
  conversion: compact({
    event_id: options.eventId,
    visitor_id: options.visitorId,
    user_id: options.userId,
    conversion_type: options.conversionType,
    revenue: options.revenue,
    currency: options.currency ?? 'USD',
    is_acquisition: options.isAcquisition,
    inherit_acquisition: options.inheritAcquisition,
    properties: options.properties ?? {},
    timestamp: timestamp(),
    ip: options.ip,
    user_agent: options.userAgent,
    identifier: options.identifier,
  }),
});

export const buildIdentifyPayload = (options: IdentifyOptions) => ({
  user_id: String(options.userId),
  visitor_id: options.visitorId,
  traits: options.traits ?? {},
  timestamp: timestamp(),
});
