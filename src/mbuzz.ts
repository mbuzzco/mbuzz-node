import { init as initConfig, MbuzzOptions } from './config';
import { getContext } from './context';
import { track } from './client/trackRequest';
import { conversion as createConversion } from './client/conversionRequest';
import { identify as identifyUser } from './client/identifyRequest';
import { createMiddleware } from './middleware/express';
import type { TrackResult } from './client/trackRequest';
import type { ConversionResult } from './client/conversionRequest';
import type { Identifier } from './client/types';
import { warnMissingIdentity, warnInvalid } from './droppedCall';

// Re-export types
export type { MbuzzOptions, TrackResult, ConversionResult, Identifier };

const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null && String(value).trim() !== '';

// Initialize SDK
export const init = (options: MbuzzOptions): void => initConfig(options);

// Context accessors
// NOTE: sessionId removed in v0.7.0 - server handles session resolution
export const visitorId = (): string | undefined => getContext()?.visitorId;
export const userId = (): string | undefined => getContext()?.userId;

// Middleware
export const middleware = createMiddleware;

// Event tracking
export interface EventOptions {
  visitorId?: string;
  userId?: string;
  identifier?: Identifier;
  [key: string]: unknown;
}

export const event = async (
  eventType: string,
  properties: Record<string, unknown> = {}
): Promise<TrackResult | false> => {
  const ctx = getContext();
  const resolvedVisitorId = ctx?.visitorId;
  const resolvedUserId = ctx?.userId;

  if (!isPresent(eventType)) {
    warnInvalid('event', eventType, 'eventType is required');
    return false;
  }

  // Must have at least one identifier. Warn rather than drop in silence: with
  // no visitor and no user there is nothing to attribute this to, and behind a
  // full-page cache that is the normal case, not an edge one.
  if (!resolvedVisitorId && !resolvedUserId) {
    warnMissingIdentity('event', eventType);
    return false;
  }

  const enrichedProps = ctx ? ctx.enrichProperties(properties) : properties;

  return track({
    visitorId: resolvedVisitorId,
    userId: resolvedUserId,
    eventType,
    properties: enrichedProps,
    ip: ctx?.ip,
    userAgent: ctx?.userAgent,
  });
};

// Conversion tracking
export interface ConversionOptions {
  eventId?: string;
  visitorId?: string;
  userId?: string;
  revenue?: number;
  currency?: string;
  isAcquisition?: boolean;
  inheritAcquisition?: boolean;
  properties?: Record<string, unknown>;
  identifier?: Identifier;
}

export const conversion = async (
  conversionType: string,
  options: ConversionOptions = {}
): Promise<ConversionResult | false> => {
  const ctx = getContext();
  const resolvedVisitorId = options.visitorId ?? ctx?.visitorId;
  const resolvedUserId = options.userId ?? ctx?.userId;

  if (!isPresent(conversionType)) {
    warnInvalid('conversion', conversionType, 'conversionType is required');
    return false;
  }

  // A conversion dropped here is lost revenue attribution, so it is never
  // silent. An eventId alone is enough — it carries its own attribution.
  if (!resolvedVisitorId && !resolvedUserId && !isPresent(options.eventId)) {
    warnMissingIdentity('conversion', conversionType);
    return false;
  }

  return createConversion({
    conversionType,
    visitorId: resolvedVisitorId,
    userId: resolvedUserId,
    eventId: options.eventId,
    revenue: options.revenue,
    currency: options.currency,
    isAcquisition: options.isAcquisition,
    inheritAcquisition: options.inheritAcquisition,
    properties: options.properties,
    ip: ctx?.ip,
    userAgent: ctx?.userAgent,
    identifier: options.identifier,
  });
};

// User identification
export interface IdentifyOptions {
  visitorId?: string;
  traits?: Record<string, unknown>;
}

export const identify = async (
  userIdValue: string | number,
  options: IdentifyOptions = {}
): Promise<boolean> => {
  const ctx = getContext();

  if (!isPresent(userIdValue)) {
    warnInvalid('identify', String(userIdValue), 'userId is required');
    return false;
  }

  const result = await identifyUser({
    userId: userIdValue,
    visitorId: options.visitorId ?? ctx?.visitorId,
    traits: options.traits,
  });

  if (result && ctx) {
    ctx.userId = String(userIdValue);
  }

  return result;
};
