import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { generateId } from '../utils/identifier';
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

    next();
  };
};
