import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { generateId } from '../utils/identifier';
import { generateDeterministic, generateFromFingerprint } from '../utils/sessionId';
import { createSession } from '../client/sessionRequest';
import {
  VISITOR_COOKIE,
  SESSION_COOKIE,
  visitorCookieOptions,
  sessionCookieOptions,
} from './cookies';

export interface MbuzzRequest {
  visitorId: string;
  sessionId: string;
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

const getSessionId = (req: Request, existingVisitorId: string | null): { id: string; isNew: boolean } => {
  const existing = req.cookies?.[SESSION_COOKIE];
  if (existing) {
    return { id: existing, isNew: false };
  }

  const sessionId = existingVisitorId
    ? generateDeterministic(existingVisitorId)
    : generateFromFingerprint(getClientIp(req), getUserAgent(req));

  return { id: sessionId, isNew: true };
};

const setCookies = (
  res: Response,
  visitorId: string,
  sessionId: string,
  secure: boolean
): void => {
  res.cookie(VISITOR_COOKIE, visitorId, visitorCookieOptions(secure));
  res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions(secure));
};

const attachMbuzz = (req: Request, visitorId: string, sessionId: string): void => {
  req.mbuzz = { visitorId, sessionId, userId: undefined };
};

const createSessionAsync = (
  visitorId: string,
  sessionId: string,
  url: string,
  referrer?: string
): void => {
  setImmediate(() => {
    createSession({ visitorId, sessionId, url, referrer });
  });
};

export const createMiddleware = (): ExpressMiddleware => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.enabled) {
      return next();
    }

    if (config.shouldSkipPath(req.path)) {
      return next();
    }

    const existingVisitorId = req.cookies?.[VISITOR_COOKIE] ?? null;
    const visitor = getVisitorId(req);
    const session = getSessionId(req, existingVisitorId);
    const secure = isSecure(req);

    attachMbuzz(req, visitor.id, session.id);
    setCookies(res, visitor.id, session.id, secure);

    if (session.isNew) {
      createSessionAsync(visitor.id, session.id, getFullUrl(req), getReferrer(req));
    }

    next();
  };
};
