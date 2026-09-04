import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { post } from '../api';
import { generateId } from '../utils/identifier';
import { deviceFingerprint } from '../utils/fingerprint';
import {
  VISITOR_COOKIE,
  SESSION_ENDPOINT_PATH,
  visitorCookieOptions,
} from './cookies';

/**
 * Establishes the visitor from a page a cache served.
 *
 * A cached page never enters the Express stack, so the tracking middleware
 * never runs and no visitor cookie is set — every later event is then rejected
 * for having no one to attribute it to, silently, while the page renders
 * perfectly.
 *
 * This endpoint is the one request on such a page that always reaches the app.
 * A small script on the page POSTs here; the SERVER mints the cookie on the
 * response. The id is never created or read in JS, so it stays HttpOnly and
 * keeps its full two-year life — a cookie written by document.cookie is capped
 * at 7 days under Safari's ITP, and 24 hours after an ad click.
 */

// Nothing to return: the response exists for its Set-Cookie header.
const NO_CONTENT_STATUS = 204;

const NO_STORE = 'no-store, no-cache, must-revalidate, private';

interface SessionBody {
  url?: string;
  referrer?: string;
}

/**
 * POST only: a GET is cacheable by an intermediary, which would reintroduce the
 * very bug this endpoint exists to fix.
 */
export const isSessionRequest = (req: Request): boolean =>
  req.method === 'POST' && req.path === SESSION_ENDPOINT_PATH;

// Express only populates req.body when a body parser is mounted. The endpoint
// must work without one — the customer's parser config is not something the fix
// can depend on.
const parseBody = (req: Request): SessionBody => {
  const body = req.body as unknown;
  return body && typeof body === 'object' ? (body as SessionBody) : {};
};

const createSessionAsync = (
  visitorId: string,
  body: SessionBody,
  ip: string,
  userAgent: string
): void => {
  const payload = {
    session: {
      visitor_id: visitorId,
      session_id: randomUUID(),
      // The page's URL, not ours — a script on the page called us, so our own
      // path would attribute every session to this endpoint.
      url: body.url,
      referrer: body.referrer,
      device_fingerprint: deviceFingerprint(ip, userAgent),
      user_agent: userAgent,
      started_at: new Date().toISOString(),
    },
  };

  // Fire and forget — post() never throws
  void post('/sessions', payload);
};

/**
 * Answer the session request: mint the cookie, record the session against the
 * page, and return an empty, uncacheable 204.
 */
export const handleSessionRequest = (
  req: Request,
  res: Response,
  visitorId: string,
  ip: string,
  userAgent: string,
  secure: boolean
): void => {
  createSessionAsync(visitorId, parseBody(req), ip, userAgent);

  res.cookie(VISITOR_COOKIE, visitorId, visitorCookieOptions(secure));
  res.set('Cache-Control', NO_STORE);
  res.status(NO_CONTENT_STATUS).end();
};

export { SESSION_ENDPOINT_PATH, generateId };
