// Shared types for client requests
// NOTE: Session ID removed in v0.7.0 - server handles session resolution

export interface Identifier {
  email?: string;
  user_id?: string;
  [key: string]: string | undefined;
}

export interface TrackOptions {
  visitorId?: string;
  userId?: string;
  eventType: string;
  properties?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  identifier?: Identifier;
}

export interface TrackResult {
  success: true;
  eventId?: string;
  eventType: string;
  visitorId?: string;
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
  ip?: string;
  userAgent?: string;
  identifier?: Identifier;
}

export interface ConversionResult {
  success: true;
  conversionId?: string;
  attribution?: Record<string, unknown>;
}

export interface IdentifyOptions {
  userId: string | number;
  visitorId?: string;
  traits?: Record<string, unknown>;
}
