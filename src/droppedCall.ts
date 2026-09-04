import { SESSION_ENDPOINT_PATH } from './middleware/cookies';

/**
 * Says out loud when a call is dropped for having nothing to attribute it to.
 *
 * Every SDK guarded its send with a bare `return false`: no request, no log,
 * nothing. Behind a full-page cache that is the whole failure — the cookie is
 * never minted, so every later event fails this guard and vanishes. It cost a
 * full day on a live account precisely because the silence was total from both
 * sides.
 *
 * Deliberately NOT behind config.debug. The customers who hit this are exactly
 * the ones not running in debug, so a debug-gated warning would be silent for
 * everyone who needs it.
 */

const MISSING_IDENTITY =
  'no visitorId and no userId. If your pages are served from a full-page cache, ' +
  `mount mbuzz.middleware() and call POST ${SESSION_ENDPOINT_PATH} from the page ` +
  "— see the README's \"Full-page caching\" section.";

const emit = (message: string): void => {
  // eslint-disable-next-line no-console
  console.warn(`[mbuzz] ${message}`);
};

export const warnMissingIdentity = (kind: string, name: string): void => {
  emit(`dropped ${kind} "${name}": ${MISSING_IDENTITY}`);
};

export const warnInvalid = (kind: string, name: string, reason: string): void => {
  emit(`dropped ${kind} "${name}": ${reason}.`);
};
