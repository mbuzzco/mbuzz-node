import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { post } from '../api';
import { generateId } from '../utils/identifier';
import { deviceFingerprint } from '../utils/fingerprint';
import { VISITOR_COOKIE, visitorCookieOptions } from './cookies';

export interface MbuzzRequest {
  visitorId: string;
  ip: string;
  userAgent: string;
  userId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      mbuzz?: MbuzzRequest;
    }
  }
}

type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

const getFullUrl = (req: Request): string => {
  const protocol = req.protocol;
  const host = req.get('host') ?? 'localhost';
  return `${protocol}://${host}${req.url}`;
};

const getReferrer = (req: Request): string | undefined => req.get('referer');

const isSecure = (req: Request): boolean => req.protocol === 'https';

const getVisitorId = (req: Request): { id: string; isNew: boolean } => {
  const existing = req.cookies?.[VISITOR_COOKIE];
  return existing ? { id: existing, isNew: false } : { id: generateId(), isNew: true };
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
};

const getUserAgent = (req: Request): string => {
  return req.headers?.['user-agent'] ?? 'unknown';
};

const setCookie = (res: Response, visitorId: string, secure: boolean): void => {
  res.cookie(VISITOR_COOKIE, visitorId, visitorCookieOptions(secure));
};

const attachMbuzz = (req: Request, visitorId: string, ip: string, userAgent: string): void => {
  req.mbuzz = { visitorId, ip, userAgent, userId: undefined };
};

/**
 * Determine whether the request is a real page navigation that should
 * create a server-side session.
 *
 * Primary signal: Sec-Fetch-* headers (modern browsers).
 * Fallback: blacklist known sub-request framework headers (old browsers).
 */
export const shouldCreateSession = (req: Request): boolean => {
  const mode = req.headers['sec-fetch-mode'];
  const dest = req.headers['sec-fetch-dest'];

  if (mode) {
    return mode === 'navigate' &&
      dest === 'document' &&
      !req.headers['sec-purpose'];
  }

  // Fallback for old browsers / bots: blacklist known sub-requests
  return !req.headers['turbo-frame'] &&
    !req.headers['hx-request'] &&
    !req.headers['x-up-version'] &&
    req.headers['x-requested-with'] !== 'XMLHttpRequest';
};

const createSessionAsync = (
  visitorId: string,
  url: string,
  referrer: string | undefined,
  ip: string,
  userAgent: string
): void => {
  const payload = {
    session: {
      visitor_id: visitorId,
      session_id: randomUUID(),
      url,
      referrer,
      device_fingerprint: deviceFingerprint(ip, userAgent),
      user_agent: userAgent,
      started_at: new Date().toISOString(),
    },
  };

  // Fire and forget — post() never throws
  void post('/sessions', payload);
};

export const createMiddleware = (): ExpressMiddleware => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.enabled) {
      return next();
    }

    if (config.shouldSkipPath(req.path)) {
      return next();
    }

    const visitor = getVisitorId(req);
    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);
    const secure = isSecure(req);

    attachMbuzz(req, visitor.id, ip, userAgent);
    setCookie(res, visitor.id, secure);

    if (shouldCreateSession(req)) {
      createSessionAsync(
        visitor.id,
        getFullUrl(req),
        getReferrer(req),
        ip,
        userAgent
      );
    }

    next();
  };
};
