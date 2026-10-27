import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import { SESSION_COOKIE, XSRF_COOKIE, createApp } from './app.mjs';

const ADMIN = { email: 'admin@demo.com', password: 'Admin123!' };
const AGENT = { email: 'agent@demo.com', password: 'Agent123!' };
const SESSION_TTL_MS = 60_000;

let clock = 0;
let server;
let baseUrl;

before(async () => {
  server = createServer(createApp({ sessionTtlMs: SESSION_TTL_MS, now: () => clock }));
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  baseUrl = `http://localhost:${server.address().port}/api`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  clock = 1_000_000;
});

/** Minimal cookie-jar client so tests exercise the real Set-Cookie flow. */
function client() {
  const jar = new Map();
  return {
    jar,
    async request(method, path, { body, headers = {} } = {}) {
      const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const setCookie of response.headers.getSetCookie()) {
        const [pair] = setCookie.split(';');
        const [name, value] = pair.split('=');
        if (value) jar.set(name, value);
        else jar.delete(name);
      }
      const text = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        body: text ? JSON.parse(text) : null,
      };
    },
    login(credentials) {
      return this.request('POST', '/auth/login', { body: credentials });
    },
  };
}

describe('POST /api/auth/login', () => {
  it('issues an HttpOnly session cookie for valid credentials', async () => {
    const api = client();
    const response = await api.login(ADMIN);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.user, {
      id: 'u-1001',
      name: 'Avery Admin',
      email: 'admin@demo.com',
      role: 'ADMIN',
    });
    assert.equal(response.body.expiresIn, SESSION_TTL_MS / 1000);

    const cookies = response.headers.getSetCookie();
    const session = cookies.find((value) => value.startsWith(`${SESSION_COOKIE}=`));
    assert.match(session, /HttpOnly/);
    assert.match(session, /SameSite=Strict/);
    assert.match(session, /Path=\/api/);
    assert.ok(
      cookies.some((value) => value.startsWith(`${XSRF_COOKIE}=`) && !/HttpOnly/.test(value)),
    );
  });

  it('accepts emails case-insensitively', async () => {
    const response = await client().login({ ...AGENT, email: ' Agent@Demo.com ' });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, 'AGENT');
  });

  it('rejects a wrong password and unknown accounts with the same 401 message', async () => {
    const wrongPassword = await client().login({ ...ADMIN, password: 'nope' });
    const unknownUser = await client().login({ email: 'ghost@demo.com', password: 'Admin123!' });
    const noCredentials = await client().login({ email: 'riley.morgan@demo.com', password: 'x' });

    for (const response of [wrongPassword, unknownUser, noCredentials]) {
      assert.equal(response.status, 401);
      assert.equal(response.body.message, 'Invalid email or password.');
      assert.equal(response.headers.getSetCookie().length, 0);
    }
  });

  it('rejects malformed payloads with 400', async () => {
    const response = await client().login({ email: 'admin@demo.com' });

    assert.equal(response.status, 400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session', async () => {
    const response = await client().request('GET', '/auth/me');

    assert.equal(response.status, 401);
  });

  it('restores the current user from the session cookie', async () => {
    const api = client();
    await api.login(AGENT);

    const response = await api.request('GET', '/auth/me');

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, 'agent@demo.com');
  });

  it('returns 401 once the session has expired', async () => {
    const api = client();
    await api.login(ADMIN);

    clock += SESSION_TTL_MS;
    const response = await api.request('GET', '/auth/me');

    assert.equal(response.status, 401);
  });
});

describe('POST /api/auth/logout', () => {
  it('invalidates the session on the server', async () => {
    const api = client();
    await api.login(ADMIN);
    const sessionId = api.jar.get(SESSION_COOKIE);
    const xsrfToken = api.jar.get(XSRF_COOKIE);

    const logout = await api.request('POST', '/auth/logout', {
      headers: { 'X-XSRF-TOKEN': xsrfToken },
    });
    assert.equal(logout.status, 204);
    assert.equal(api.jar.has(SESSION_COOKIE), false);

    // Replaying the old cookie must not work after logout.
    api.jar.set(SESSION_COOKIE, sessionId);
    const me = await api.request('GET', '/auth/me');
    assert.equal(me.status, 401);
  });

  it('rejects logout without the XSRF token and keeps the session', async () => {
    const api = client();
    await api.login(ADMIN);

    const logout = await api.request('POST', '/auth/logout');
    assert.equal(logout.status, 403);

    const me = await api.request('GET', '/auth/me');
    assert.equal(me.status, 200);
  });
});

describe('GET /api/users (ADMIN only)', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const response = await client().request('GET', '/users');

    assert.equal(response.status, 401);
  });

  it('returns 403 when an agent requests the admin-only endpoint', async () => {
    const api = client();
    await api.login(AGENT);

    const response = await api.request('GET', '/users');

    assert.equal(response.status, 403);
    assert.equal(response.body.message, 'You do not have permission to access this resource.');
  });

  it('returns users without password hashes for an admin', async () => {
    const api = client();
    await api.login(ADMIN);

    const response = await api.request('GET', '/users');

    assert.equal(response.status, 200);
    assert.ok(response.body.data.length >= 2);
    for (const user of response.body.data) {
      assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name', 'role']);
    }
  });
});

describe('routing', () => {
  it('returns 404 for unknown paths and 405 for wrong methods', async () => {
    const api = client();

    assert.equal((await api.request('GET', '/nope')).status, 404);
    assert.equal((await api.request('GET', '/auth/login')).status, 405);
  });
});
