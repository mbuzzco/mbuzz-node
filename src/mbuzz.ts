import { init as initConfig, MbuzzOptions } from './config';
import { getContext } from './context';
import { track } from './client/trackRequest';
import { conversion as createConversion } from './client/conversionRequest';
import { identify as identifyUser } from './client/identifyRequest';
import { createMiddleware } from './middleware/express';
import type { TrackResult } from './client/trackRequest';
import type { ConversionResult } from './client/conversionRequest';
import type { Identifier } from './client/types';

// Re-export types
export type { MbuzzOptions, TrackResult, ConversionResult, Identifier };

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
  const enrichedProps = ctx ? ctx.enrichProperties(properties) : properties;

  return track({
    visitorId: ctx?.visitorId,
    userId: ctx?.userId,
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

  return createConversion({
    conversionType,
    visitorId: options.visitorId ?? ctx?.visitorId,
    userId: options.userId ?? ctx?.userId,
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
