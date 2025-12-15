// Pure payload builder functions

import type { TrackOptions, ConversionOptions, IdentifyOptions, SessionOptions } from './types';

const timestamp = (): string => new Date().toISOString();

const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;

export const buildTrackPayload = (options: TrackOptions) => ({
  events: [
    compact({
      visitor_id: options.visitorId,
      session_id: options.sessionId,
      user_id: options.userId,
      event_type: options.eventType,
      properties: options.properties ?? {},
      timestamp: timestamp(),
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
  }),
});

export const buildIdentifyPayload = (options: IdentifyOptions) => ({
  user_id: String(options.userId),
  visitor_id: options.visitorId,
  traits: options.traits ?? {},
  timestamp: timestamp(),
});

export const buildSessionPayload = (options: SessionOptions) => ({
  session: {
    visitor_id: options.visitorId,
    session_id: options.sessionId,
    url: options.url,
    referrer: options.referrer,
    started_at: (options.startedAt ?? new Date()).toISOString(),
  },
});
