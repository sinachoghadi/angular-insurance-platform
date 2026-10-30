// Development-only mock API with cookie-based sessions and role-based authorization.
// Uses only Node.js built-ins so the project needs no extra backend dependencies.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { USERS, toUserDto } from './users.mjs';
import { POLICIES, listPolicies } from './policies.mjs';

export const SESSION_COOKIE = 'ins_session';
export const XSRF_COOKIE = 'XSRF-TOKEN';
export const XSRF_HEADER = 'x-xsrf-token';

const MAX_BODY_BYTES = 10 * 1024;
const DUMMY_HASH = `scrypt$${randomBytes(16).toString('base64')}$${randomBytes(32).toString('base64')}`;

class HttpError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {{ sessionTtlMs?: number; latencyMs?: number; now?: () => number }} [options]
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void}
 */
export function createApp({ sessionTtlMs = 30 * 60 * 1000, latencyMs = 0, now = Date.now } = {}) {
  /** @type {Map<string, { userId: string; xsrfToken: string; expiresAt: number }>} */
  const sessions = new Map();

  function createSession(userId) {
    const id = randomBytes(32).toString('base64url');
    const session = {
      userId,
      xsrfToken: randomBytes(32).toString('base64url'),
      expiresAt: now() + sessionTtlMs,
    };
    sessions.set(id, session);
    return { id, session };
  }

  /** Resolves the request's session, discarding it when expired. */
  function readSession(req) {
    const id = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!id) return null;

    const session = sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= now()) {
      sessions.delete(id);
      return null;
    }
    const user = USERS.find((candidate) => candidate.id === session.userId);
    return user ? { id, session, user } : null;
  }

  /** Throws 401 without a valid session and 403 when the user's role is not allowed. */
  function authorize(req, allowedRoles) {
    const current = readSession(req);
    if (!current) throw new HttpError(401, 'Authentication required.');
    if (allowedRoles && !allowedRoles.includes(current.user.role)) {
      throw new HttpError(403, 'You do not have permission to access this resource.');
    }
    return current;
  }

  function sessionBody(user, session) {
    return {
      user: toUserDto(user),
      expiresAt: new Date(session.expiresAt).toISOString(),
      expiresIn: Math.max(0, Math.floor((session.expiresAt - now()) / 1000)),
    };
  }

  /** @type {Record<string, (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void> | void>} */
  const routes = {
    'GET /api/policies': (req, res) => {
      const { user } = authorize(req);
      sendJson(res, 200, listPolicies(new URL(req.url, 'http://localhost').searchParams, user));
    },
    'POST /api/auth/login': async (req, res) => {
      const body = await readJson(req);
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
      const password = typeof body?.password === 'string' ? body.password : null;
      if (!email || !password) throw new HttpError(400, 'Email and password are required.');

      const user = USERS.find((candidate) => candidate.email === email);
      // Verify against a dummy hash for unknown users so response timing does not reveal accounts.
      const valid = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !user.passwordHash || !valid) {
        throw new HttpError(401, 'Invalid email or password.');
      }

      const previous = readSession(req);
      if (previous) sessions.delete(previous.id);

      const { id, session } = createSession(user.id);
      setSessionCookies(res, id, session.xsrfToken, sessionTtlMs);
      sendJson(res, 200, sessionBody(user, session));
    },

    'POST /api/auth/logout': (req, res) => {
      const current = readSession(req);
      if (current) {
        if (req.headers[XSRF_HEADER] !== current.session.xsrfToken) {
          throw new HttpError(403, 'Invalid or missing XSRF token.');
        }
        sessions.delete(current.id);
      }
      clearSessionCookies(res);
      res.writeHead(204).end();
    },

    'GET /api/auth/me': (req, res) => {
      const { user, session } = authorize(req);
      sendJson(res, 200, sessionBody(user, session));
    },

    'GET /api/users': (req, res) => {
      authorize(req, ['ADMIN']);
      sendJson(res, 200, { data: USERS.map(toUserDto) });
    },
  };

  return (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const detail = /^\/api\/policies\/[^/]+$/.test(pathname);
    const handler =
      routes[`${req.method} ${pathname}`] ??
      (detail && req.method === 'GET'
        ? (req, res) => {
            const { user } = authorize(req);
            const policy = POLICIES.find((p) => p.id === pathname.split('/').at(-1));
            if (!policy) throw new HttpError(404, 'Policy not found.');
            if (user.role !== 'ADMIN' && policy.agentId !== user.id)
              throw new HttpError(403, 'This policy is assigned to another agent.');
            sendJson(res, 200, policy);
          }
        : undefined);

    setTimeout(async () => {
      try {
        if (!handler) {
          const knownPath = Object.keys(routes).some((key) => key.endsWith(` ${pathname}`));
          throw new HttpError(
            knownPath ? 405 : 404,
            knownPath ? 'Method not allowed.' : 'Not found.',
          );
        }
        await handler(req, res);
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        const message = error instanceof HttpError ? error.message : 'Internal server error.';
        if (status === 500) console.error(error);
        sendJson(res, status, { status, message });
      }
    }, latencyMs);
  };
}

function verifyPassword(password, storedHash) {
  const [scheme, salt, key] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

function parseCookies(header = '') {
  /** @type {Record<string, string>} */
  const cookies = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0)
      cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

// `Secure` is omitted because the dev server runs over plain HTTP; it is required behind HTTPS.
function setSessionCookies(res, sessionId, xsrfToken, ttlMs) {
  const maxAge = Math.floor(ttlMs / 1000);
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${sessionId}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`,
    // Readable by the SPA so Angular's HttpClient can echo it in the X-XSRF-TOKEN header.
    `${XSRF_COOKIE}=${xsrfToken}; Path=/; SameSite=Strict; Max-Age=${maxAge}`,
  ]);
}

function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0`,
    `${XSRF_COOKIE}=; Path=/; SameSite=Strict; Max-Age=0`,
  ]);
}

async function readJson(req) {
  if (!String(req.headers['content-type']).startsWith('application/json')) {
    throw new HttpError(415, 'Expected an application/json request body.');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Malformed JSON body.');
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
