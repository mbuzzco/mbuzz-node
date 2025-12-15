// Shared types for client requests

export interface TrackOptions {
  visitorId?: string;
  sessionId?: string;
  userId?: string;
  eventType: string;
  properties?: Record<string, unknown>;
}

export interface TrackResult {
  success: true;
  eventId: string;
  eventType: string;
  visitorId?: string;
  sessionId?: string;
}

export interface ConversionOptions {
  eventId?: string;
  visitorId?: string;
  userId?: string;
  conversionType: string;
  revenue?: number;
  currency?: string;
  isAcquisition?: boolean;
  inheritAcquisition?: boolean;
  properties?: Record<string, unknown>;
}

export interface ConversionResult {
  success: true;
  conversionId: string;
  attribution?: Record<string, unknown>;
}

export interface IdentifyOptions {
  userId: string | number;
  visitorId?: string;
  traits?: Record<string, unknown>;
}

export interface SessionOptions {
  visitorId: string;
  sessionId: string;
  url: string;
  referrer?: string;
  startedAt?: Date;
}
