import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApp } from './app.mjs';

const customer = {
  fullName: 'Fictional Customer',
  nationalId: '1234567890',
  mobile: '09123456789',
  dateOfBirth: '1990-01-01',
  email: 'customer@example.test',
};
const products = {
  'Third Party': { plate: 'DEMO-123', model: 'Demo Sedan', year: 2020, value: null },
  'Car Body': { plate: 'DEMO-123', model: 'Demo Sedan', year: 2020, value: 20000 },
  Life: {
    coverageAmount: 100000,
    paymentFrequency: 'Monthly',
    beneficiaries: [{ fullName: 'Demo Beneficiary', nationalId: '2345678901', share: 100 }],
  },
  Fire: {
    propertyType: 'Residential',
    propertyValue: 200000,
    address: 'Fictional property address',
  },
  Health: {
    insuredPersons: 2,
    plan: 'Standard',
    additionalPersons: [
      { fullName: 'Demo Dependent', nationalId: '2345678901', dateOfBirth: '2010-01-01' },
    ],
  },
};
const payload = (type = 'Third Party') =>
  structuredClone({
    customer,
    insuranceType: type,
    product: products[type],
    coverage: { startDate: '2027-01-01', endDate: '2028-01-01', options: ['Accident'] },
    agentId: 'u-1002',
  });
let server, url, directory, policyFile;
async function start() {
  server = createServer(createApp({ policyFile }));
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  url = `http://localhost:${server.address().port}/api`;
}
const close = () => new Promise((resolve) => server.close(resolve));
async function client(role = 'AGENT') {
  const login = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      role === 'ADMIN'
        ? { email: 'admin@demo.com', password: 'Admin123!' }
        : { email: 'agent@demo.com', password: 'Agent123!' },
    ),
  });
  const cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(';')[0])
    .join('; ');
  const xsrf = login.headers
    .getSetCookie()
    .find((v) => v.startsWith('XSRF-TOKEN='))
    .split(';')[0]
    .split('=')[1];
  return async (method, path, body, headers = {}) => {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        Cookie: cookie,
        'X-XSRF-TOKEN': xsrf,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  };
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'policy-workflow-'));
  policyFile = join(directory, 'policies.json');
  await start();
});
afterEach(async () => {
  await close();
  await rm(directory, { recursive: true, force: true });
});
describe('Policy draft workflow', () => {
  it('requires session and XSRF protection on writes', async () => {
    assert.equal((await fetch(`${url}/policies`, { method: 'POST' })).status, 401);
    const api = await client();
    assert.equal((await api('POST', '/policies', payload(), { 'X-XSRF-TOKEN': '' })).status, 403);
    assert.equal(
      (await api('POST', '/policies', payload(), { 'Idempotency-Key': '' })).status,
      400,
    );
  });
  it('saves an incomplete draft, derives the agent from the session and whitelists writable fields', async () => {
    const api = await client();
    const body = payload();
    body.customer.fullName = '';
    body.coverage.startDate = '';
    body.product.model = '';
    const result = await api('POST', '/policies', {
      ...body,
      agentId: 'u-1003',
      status: 'ACTIVE',
      premium: 1,
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.status, 'DRAFT');
    assert.equal(result.body.agentId, 'u-1002');
    assert.equal(result.body.premium, 400);
    assert.equal(result.body.version, 1);
    assert.equal('creationKey' in result.body, false);
    assert.equal(
      (await api('POST', `/policies/${result.body.id}/submit`, { version: 1 })).status,
      422,
    );
    const list = (await api('GET', '/policies?search=Unnamed')).body;
    assert.equal(list.total, 1);
    assert.equal('creationKey' in list.items[0], false);
  });
  it('lets admins assign a draft and prevents all agent modifications to other agents drafts', async () => {
    const admin = await client('ADMIN'),
      agent = await client();
    const result = await admin('POST', '/policies', { ...payload(), agentId: 'u-1003' });
    assert.equal(result.status, 201);
    for (const [method, suffix, body] of [
      ['PATCH', '', { ...payload(), version: 1 }],
      ['DELETE', '', { version: 1 }],
      ['POST', '/submit', { version: 1 }],
    ]) {
      assert.equal((await agent(method, `/policies/${result.body.id}${suffix}`, body)).status, 403);
    }
    assert.equal(
      (
        await admin('PATCH', `/policies/${result.body.id}`, {
          ...payload(),
          agentId: 'u-1002',
          version: 1,
        })
      ).status,
      200,
    );
    assert.equal((await agent('GET', `/policies/${result.body.id}`)).status, 200);
    assert.equal(
      (await admin('POST', '/policies', { ...payload(), agentId: 'u-1001' })).status,
      422,
    );
  });
  it('persists drafts over restart, restores fields and supports versioned updates', async () => {
    let api = await client();
    const draft = (await api('POST', '/policies', payload('Life'))).body;
    await close();
    await start();
    api = await client();
    const restored = (await api('GET', `/policies/${draft.id}`)).body;
    assert.deepEqual(restored.formData.product, products.Life);
    const edited = {
      ...payload('Life'),
      customer: { ...customer, fullName: 'Edited Demo Customer' },
      version: 1,
    };
    const saved = await api('PATCH', `/policies/${draft.id}`, edited);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.version, 2);
    assert.equal(saved.body.customerName, 'Edited Demo Customer');
    assert.equal((await api('PATCH', `/policies/${draft.id}`, edited)).status, 409);
  });
  it('deduplicates concurrent create retries with an idempotency key', async () => {
    const api = await client();
    const key = randomUUID();
    const results = await Promise.all([
      api('POST', '/policies', payload(), { 'Idempotency-Key': key }),
      api('POST', '/policies', payload(), { 'Idempotency-Key': key }),
    ]);
    assert.equal(results[0].body.id, results[1].body.id);
    assert.equal((await api('GET', '/policies')).body.total, 61);
    assert.equal(
      (
        await api(
          'POST',
          '/policies',
          { ...payload(), customer: { ...customer, fullName: 'Different Data' } },
          { 'Idempotency-Key': key },
        )
      ).status,
      409,
    );
    const admin = await client('ADMIN');
    await admin('PATCH', `/policies/${results[0].body.id}`, {
      ...payload(),
      agentId: 'u-1003',
      version: 1,
    });
    assert.equal(
      (await api('POST', '/policies', payload(), { 'Idempotency-Key': key })).status,
      403,
    );
  });
  it('validates every product, submits once and rejects all subsequent modifications', async () => {
    const api = await client();
    for (const type of Object.keys(products)) {
      const draft = (await api('POST', '/policies', payload(type))).body;
      const responses = await Promise.all([
        api('POST', `/policies/${draft.id}/submit`, { version: 1 }),
        api('POST', `/policies/${draft.id}/submit`, { version: 1 }),
      ]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
      const pending = (await api('GET', `/policies/${draft.id}`)).body;
      assert.equal(pending.status, 'PENDING');
      assert.equal(
        (await api('PATCH', `/policies/${draft.id}`, { ...payload(type), version: 2 })).status,
        409,
      );
      assert.equal((await api('DELETE', `/policies/${draft.id}`, { version: 2 })).status, 409);
    }
  });
  it('rejects malformed structures and validates customer/product/cross-field rules on submission', async () => {
    const api = await client();
    for (const body of [
      null,
      {},
      { ...payload(), product: [] },
      { ...payload(), coverage: { ...payload().coverage, options: ['unknown'] } },
    ])
      assert.equal((await api('POST', '/policies', body)).status, 422);
    const bad = [
      { ...payload(), customer: { ...customer, nationalId: 'bad' } },
      { ...payload(), customer: { ...customer, mobile: '123' } },
      { ...payload(), customer: { ...customer, email: 'bad' } },
      { ...payload(), customer: { ...customer, dateOfBirth: '2999-01-01' } },
      { ...payload(), coverage: { ...payload().coverage, endDate: '2026-01-01' } },
      { ...payload('Car Body'), product: { ...products['Car Body'], value: null } },
      {
        ...payload('Life'),
        product: {
          ...products.Life,
          beneficiaries: [{ ...products.Life.beneficiaries[0], share: 30 }],
        },
      },
      { ...payload('Health'), product: { ...products.Health, insuredPersons: 3 } },
      {
        ...payload('Health'),
        product: {
          ...products.Health,
          additionalPersons: [
            { ...products.Health.additionalPersons[0], nationalId: customer.nationalId },
          ],
        },
      },
    ];
    for (const body of bad) {
      const draft = await api('POST', '/policies', body);
      assert.equal(draft.status, 201);
      const result = await api('POST', `/policies/${draft.body.id}/submit`, { version: 1 });
      assert.equal(result.status, 422);
      assert.equal(result.body.status, 422);
      assert.equal(typeof result.body.message, 'string');
    }
  });
  it('discards only drafts and persists removal', async () => {
    let api = await client();
    const draft = (await api('POST', '/policies', payload())).body;
    assert.equal((await api('DELETE', `/policies/${draft.id}`, { version: 2 })).status, 409);
    assert.equal((await api('DELETE', `/policies/${draft.id}`, { version: 1 })).status, 204);
    await close();
    await start();
    api = await client();
    assert.equal((await api('GET', `/policies/${draft.id}`)).status, 404);
  });
});
