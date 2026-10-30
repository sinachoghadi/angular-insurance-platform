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

describe('Policy endpoints', () => {
  it('requires a session on list and details', async () => {
    const api = client();
    assert.equal((await api.request('GET', '/policies')).status, 401);
    assert.equal((await api.request('GET', '/policies/p-1001')).status, 401);
  });
  it('paginates all 180 records for admins and clamps invalid pages', async () => {
    const api = client();
    await api.login(ADMIN);
    const first = (await api.request('GET', '/policies?pageSize=25&page=1')).body;
    const second = (await api.request('GET', '/policies?pageSize=25&page=2')).body;
    assert.equal(first.total, 180);
    assert.equal(first.items.length, 25);
    assert.equal(second.page, 2);
    assert.ok(first.items.every((p) => !second.items.some((q) => q.id === p.id)));
    const last = (await api.request('GET', '/policies?page=999&pageSize=50')).body;
    assert.equal(last.page, 4);
    assert.equal(last.items.length, 30);
    const invalid = (await api.request('GET', '/policies?page=-1&pageSize=999')).body;
    assert.equal(invalid.page, 1);
    assert.equal(invalid.pageSize, 10);
  });
  it('derives agent scope from the session and ignores forged agentId', async () => {
    const api = client();
    await api.login(AGENT);
    const result = (await api.request('GET', '/policies?agentId=u-1003&pageSize=50')).body;
    assert.equal(result.total, 60);
    assert.ok(result.items.every((p) => p.agentId === 'u-1002'));
    assert.equal((await api.request('GET', '/policies/p-1002')).status, 403);
    assert.equal((await api.request('GET', '/policies/p-1001')).status, 200);
  });
  it('combines filters before pagination and searches across all records', async () => {
    const api = client();
    await api.login(ADMIN);
    const result = (
      await api.request(
        'GET',
        '/policies?insuranceType=Life&status=ACTIVE&agentId=u-1002&startFrom=2025-01-01&startTo=2026-12-31',
      )
    ).body;
    assert.ok(result.total > 0);
    assert.ok(
      result.items.every(
        (p) =>
          p.insuranceType === 'Life' &&
          p.status === 'ACTIVE' &&
          p.agentId === 'u-1002' &&
          p.startDate >= '2025-01-01' &&
          p.startDate <= '2026-12-31',
      ),
    );
    for (const search of ['DEMO-000180', 'Jamie', 'INS-2026-00180']) {
      const found = (await api.request('GET', `/policies?search=${search}`)).body;
      assert.ok(found.total > 0);
    }
    assert.equal((await api.request('GET', '/policies?search=unfindable')).body.total, 0);
  });
  it('sorts globally in both directions with deterministic ties', async () => {
    const api = client();
    await api.login(ADMIN);
    for (const field of ['premium', 'policyNumber', 'startDate', 'endDate', 'createdAt']) {
      for (const direction of ['asc', 'desc']) {
        const one = (
          await api.request('GET', `/policies?sortBy=${field}&sortOrder=${direction}&pageSize=50`)
        ).body;
        const two = (
          await api.request(
            'GET',
            `/policies?sortBy=${field}&sortOrder=${direction}&pageSize=50&page=2`,
          )
        ).body;
        const items = [...one.items, ...two.items];
        for (let i = 1; i < items.length; i++) {
          assert.ok(
            direction === 'asc'
              ? items[i - 1][field] <= items[i][field]
              : items[i - 1][field] >= items[i][field],
          );
          if (items[i - 1][field] === items[i][field]) assert.ok(items[i - 1].id < items[i].id);
        }
      }
    }
  });
  it('loads admin details and returns 404 for missing IDs', async () => {
    const api = client();
    await api.login(ADMIN);
    assert.equal((await api.request('GET', '/policies/p-1002')).body.id, 'p-1002');
    assert.equal((await api.request('GET', '/policies/invalid')).status, 404);
  });
});
