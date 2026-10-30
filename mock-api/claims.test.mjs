import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { createApp } from './app.mjs';
import { POLICIES } from './policies.mjs';
import { CLAIM_STATUSES, transitionClaim } from './claims.mjs';
const own = POLICIES.find(
  (p) => p.status === 'ACTIVE' && p.agentId === 'u-1002' && p.startDate < '2026-01-01',
);
const other = POLICIES.find(
  (p) => p.status === 'ACTIVE' && p.agentId === 'u-1003' && p.startDate < '2026-01-01',
);
const input = () => ({
  policyId: own.id,
  incidentDate: own.startDate,
  claimType: 'Accident',
  description: 'A fictional incident for automated tests.',
  estimatedAmount: 1000,
});
let server, url, directory, claimFile;
async function start() {
  server = createServer(createApp({ claimFile }));
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  url = `http://localhost:${server.address().port}/api`;
}
const close = () => new Promise((resolve) => server.close(resolve));
async function client(role = 'AGENT') {
  const response = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      role === 'ADMIN'
        ? { email: 'admin@demo.com', password: 'Admin123!' }
        : { email: 'agent@demo.com', password: 'Agent123!' },
    ),
  });
  const cookies = response.headers.getSetCookie(),
    cookie = cookies.map((v) => v.split(';')[0]).join('; '),
    xsrf = cookies
      .find((v) => v.startsWith('XSRF-TOKEN='))
      .split(';')[0]
      .split('=')[1];
  return async (method, path, body, headers = {}) => {
    const res = await fetch(`${url}${path}`, {
      method,
      headers: {
        Cookie: cookie,
        'X-XSRF-TOKEN': xsrf,
        'Idempotency-Key': randomUUID(),
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'claims-api-'));
  claimFile = join(directory, 'claims.json');
  await start();
});
afterEach(async () => {
  await close();
  await rm(directory, { recursive: true, force: true });
});
describe('Claims authorization and queries', () => {
  it('requires sessions and XSRF; keeps Admin/Agent roles unchanged', async () => {
    for (const path of [
      '/claims',
      '/claims/c-1001',
      '/claims/c-1001/history',
      '/claims/c-1001/notes',
    ])
      assert.equal((await fetch(`${url}${path}`)).status, 401);
    assert.equal((await fetch(`${url}/claims`, { method: 'POST' })).status, 401);
    const api = await client();
    assert.equal((await api('POST', '/claims', input(), { 'X-XSRF-TOKEN': '' })).status, 403);
  });
  it('paginates and filters/sorts the full authorized collection before slicing', async () => {
    const api = await client('ADMIN');
    const first = (await api('GET', '/claims?pageSize=25&sortBy=estimatedAmount&sortOrder=asc'))
      .body;
    const second = (
      await api('GET', '/claims?pageSize=25&page=2&sortBy=estimatedAmount&sortOrder=asc')
    ).body;
    assert.equal(first.total, 90);
    assert.equal(first.items.length, 25);
    assert.equal(second.page, 2);
    assert.ok(first.items.at(-1).estimatedAmount <= second.items[0].estimatedAmount);
    const q = first.items[0];
    const filtered = (
      await api(
        'GET',
        `/claims?status=${q.status}&claimType=${q.claimType}&dateFrom=${q.incidentDate}&dateTo=${q.incidentDate}&search=${encodeURIComponent(q.customerName)}`,
      )
    ).body;
    assert.ok(filtered.total > 0);
    assert.ok(
      filtered.items.every(
        (c) =>
          c.status === q.status && c.claimType === q.claimType && c.incidentDate === q.incidentDate,
      ),
    );
    assert.equal((await api('GET', '/claims?search=not-found')).body.total, 0);
    const invalid = (
      await api('GET', '/claims?page=-1&pageSize=777&sortBy=secret&dateFrom=2026-02-31')
    ).body;
    assert.equal(invalid.page, 1);
    assert.equal(invalid.pageSize, 10);
    assert.equal((await api('GET', '/claims?page=999&pageSize=50')).body.page, 2);
  });
  it('scopes Agent reads by linked policy, including Admin-created claims', async () => {
    const admin = await client('ADMIN'),
      agent = await client();
    const accessible = (await admin('POST', '/claims', input())).body;
    const forbidden = (
      await admin('POST', '/claims', {
        ...input(),
        policyId: other.id,
        incidentDate: other.startDate,
      })
    ).body;
    assert.equal(accessible.createdBy, 'u-1001');
    assert.equal((await agent('GET', `/claims/${accessible.id}`)).status, 200);
    for (const suffix of ['', '/history', '/notes'])
      assert.equal((await agent('GET', `/claims/${forbidden.id}${suffix}`)).status, 403);
    const list = (await agent('GET', '/claims?pageSize=50&agentId=u-1003')).body;
    assert.ok(list.items.length > 0);
    assert.ok(
      list.items.every((c) => POLICIES.some((p) => p.id === c.policyId && p.agentId === 'u-1002')),
    );
    assert.ok(!list.items.some((c) => c.id === forbidden.id));
  });
});
describe('Claim creation and review', () => {
  it('validates active policy eligibility, ownership, incident dates and financial input', async () => {
    const api = await client();
    assert.equal(
      (
        await api('POST', '/claims', {
          ...input(),
          policyId: other.id,
          incidentDate: other.startDate,
        })
      ).status,
      403,
    );
    const inactive = POLICIES.find((p) => p.agentId === 'u-1002' && p.status === 'DRAFT');
    for (const data of [
      null,
      {},
      { ...input(), policyId: inactive.id },
      { ...input(), incidentDate: '2999-01-01' },
      { ...input(), incidentDate: '2026-02-31' },
      { ...input(), incidentDate: '1900-01-01' },
      { ...input(), incidentDate: '2026-10-01' },
      { ...input(), estimatedAmount: 0 },
      { ...input(), estimatedAmount: 1.001 },
      { ...input(), description: '   ' },
      { ...input(), claimType: 'bad' },
    ])
      assert.equal((await api('POST', '/claims', data)).status, 422);
    assert.equal((await api('POST', '/claims', { ...input(), policyId: 'missing' })).status, 404);
  });
  it('deduplicates concurrent creation and never trusts server-managed fields', async () => {
    const api = await client(),
      key = randomUUID();
    const body = {
      ...input(),
      status: 'APPROVED',
      createdBy: 'u-1001',
      approvedAmount: 1000,
      history: [{ newStatus: 'CLOSED' }],
      notes: ['forged'],
    };
    const responses = await Promise.all([
      api('POST', '/claims', body, { 'Idempotency-Key': key }),
      api('POST', '/claims', body, { 'Idempotency-Key': key }),
    ]);
    const c = responses[0].body;
    assert.equal(responses[0].status, 201);
    assert.equal(c.id, responses[1].body.id);
    assert.equal(c.status, 'SUBMITTED');
    assert.equal(c.createdBy, 'u-1002');
    assert.equal(c.approvedAmount, null);
    assert.ok(!('creationKey' in c));
    assert.ok(!('notes' in c));
    const history = (await api('GET', `/claims/${c.id}/history`)).body.items;
    assert.equal(history.length, 1);
    assert.equal(history[0].newStatus, 'SUBMITTED');
    assert.equal(history[0].changedBy, 'u-1002');
    assert.equal(
      (await api('POST', '/claims', { ...input(), estimatedAmount: 2 }, { 'Idempotency-Key': key }))
        .status,
      409,
    );
  });
  it('enforces every transition in the state machine', () => {
    const expected = new Set([
      'SUBMITTED:UNDER_REVIEW',
      'UNDER_REVIEW:APPROVED',
      'UNDER_REVIEW:REJECTED',
      'APPROVED:CLOSED',
      'REJECTED:CLOSED',
    ]);
    for (const from of CLAIM_STATUSES)
      for (const to of CLAIM_STATUSES) {
        const claim = {
            id: 'c-test',
            status: from,
            version: 1,
            estimatedAmount: 1000,
            updatedAt: '2025-01-01T00:00:00Z',
          },
          data = { history: [] };
        const act = () =>
          transitionClaim(
            data,
            claim,
            { status: to, version: 1, reason: 'Test reason', approvedAmount: 500 },
            { id: 'u-1001', name: 'Admin' },
          );
        if (expected.has(`${from}:${to}`)) {
          act();
          assert.equal(data.history.length, 1);
          assert.equal(data.history[0].previousStatus, from);
          assert.equal(data.history[0].newStatus, to);
        } else {
          assert.throws(act, (e) => e.status === 409);
          assert.equal(data.history.length, 0);
        }
      }
  });
  it('allows Admin approval/closure, rejects stale and Agent reviews, and records server-generated history', async () => {
    const agent = await client(),
      admin = await client('ADMIN');
    const c = (await agent('POST', '/claims', input())).body;
    const path = `/claims/${c.id}/transition`;
    for (const status of ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'])
      assert.equal(
        (await agent('POST', path, { status, version: 1, reason: 'forged' })).status,
        403,
      );
    assert.equal(
      (await admin('POST', path, { status: 'APPROVED', version: 1, approvedAmount: 500 })).status,
      409,
    );
    assert.equal((await admin('POST', path, { status: 'UNDER_REVIEW', version: 1 })).status, 200);
    assert.equal(
      (await admin('POST', path, { status: 'APPROVED', version: 1, approvedAmount: 500 })).status,
      409,
    );
    assert.equal(
      (await admin('POST', path, { status: 'APPROVED', version: 2, approvedAmount: 1001 })).status,
      422,
    );
    const outcomes = await Promise.all([
      admin('POST', path, {
        status: 'APPROVED',
        version: 2,
        approvedAmount: 500,
        changedBy: 'u-1002',
      }),
      admin('POST', path, { status: 'APPROVED', version: 2, approvedAmount: 500 }),
    ]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await admin('POST', path, { status: 'CLOSED', version: 3 })).status, 200);
    assert.equal((await admin('POST', path, { status: 'UNDER_REVIEW', version: 4 })).status, 409);
    const history = (await agent('GET', `/claims/${c.id}/history`)).body.items;
    assert.deepEqual(
      history.map((h) => h.newStatus),
      ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CLOSED'],
    );
    assert.equal(history[2].changedBy, 'u-1001');
    assert.equal((await agent('GET', `/claims/${c.id}`)).body.approvedAmount, 500);
    assert.equal(
      (await admin('POST', `/claims/${c.id}/history`, { newStatus: 'APPROVED' })).status,
      405,
    );
  });
  it('requires a rejection reason and keeps review notes internal and persistent', async () => {
    let admin = await client('ADMIN'),
      agent = await client();
    const c = (await agent('POST', '/claims', input())).body,
      path = `/claims/${c.id}`;
    await admin('POST', `${path}/transition`, { status: 'UNDER_REVIEW', version: 1 });
    for (const reason of ['', '   ', null, 1])
      assert.equal(
        (await admin('POST', `${path}/transition`, { status: 'REJECTED', version: 2, reason }))
          .status,
        422,
      );
    assert.equal(
      (
        await admin('POST', `${path}/transition`, {
          status: 'REJECTED',
          version: 2,
          reason: 'Supporting evidence was insufficient.',
        })
      ).status,
      200,
    );
    assert.equal(
      (await admin('POST', `${path}/transition`, { status: 'CLOSED', version: 3 })).status,
      200,
    );
    for (const content of ['', '   ', 'x'.repeat(2001)])
      assert.equal((await admin('POST', `${path}/notes`, { content })).status, 422);
    const note = await admin('POST', `${path}/notes`, {
      content: 'Internal investigator context',
      authorId: 'u-1002',
    });
    assert.equal(note.status, 201);
    assert.equal(note.body.authorId, 'u-1001');
    assert.equal((await agent('GET', `${path}/notes`)).status, 403);
    assert.equal((await agent('POST', `${path}/notes`, { content: 'not allowed' })).status, 403);
    assert.ok(!JSON.stringify((await agent('GET', path)).body).includes('investigator'));
    assert.ok(
      !JSON.stringify((await agent('GET', `${path}/history`)).body).includes('investigator'),
    );
    await close();
    await start();
    admin = await client('ADMIN');
    assert.equal((await admin('GET', path)).body.status, 'CLOSED');
    assert.equal((await admin('GET', `${path}/history`)).body.items.length, 4);
    assert.equal(
      (await admin('GET', `${path}/notes`)).body.items[0].content,
      'Internal investigator context',
    );
  });
  it('returns 404 for missing details/history/notes', async () => {
    const api = await client('ADMIN');
    for (const suffix of ['', '/history', '/notes'])
      assert.equal((await api('GET', `/claims/missing${suffix}`)).status, 404);
  });
});
