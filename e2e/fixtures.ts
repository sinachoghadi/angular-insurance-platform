import { test as base, expect, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../mock-api/app.mjs';
import { POLICIES } from '../mock-api/policies.mjs';
export const ownActive = POLICIES.find(
  (p) => p.status === 'ACTIVE' && p.agentId === 'u-1002' && p.startDate < '2026-01-01',
)!;
export const otherActive = POLICIES.find(
  (p) => p.status === 'ACTIVE' && p.agentId === 'u-1003' && p.startDate < '2026-01-01',
)!;
export const test = base.extend<{ apiOrigin: string }>({
  apiOrigin: async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'insurance-e2e-'));
    const server = createServer(
      createApp({
        policyFile: join(directory, 'policies.json'),
        claimFile: join(directory, 'claims.json'),
        latencyMs: 0,
      }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('API failed to bind');
    try {
      await use(`http://127.0.0.1:${address.port}`);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  },
  page: async ({ page, apiOrigin }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // A real, per-test HTTP backend, proxied at the browser boundary. Cookies/XSRF remain same-origin.
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: apiOrigin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    await page.route(
      (url) => !['127.0.0.1', 'localhost'].includes(url.hostname),
      (route) => route.abort(),
    );
    await use(page);
    expect(errors, 'uncaught browser errors').toEqual([]);
  },
});
export { expect };
export async function login(page: Page, role: 'ADMIN' | 'AGENT' = 'ADMIN') {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill(role === 'ADMIN' ? 'admin@demo.com' : 'agent@demo.com');
  await page
    .getByLabel('Password', { exact: true })
    .fill(role === 'ADMIN' ? 'Admin123!' : 'Agent123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
export async function createClaim(page: Page) {
  await page.goto('/claims/new');
  const response = page.waitForResponse(
    (r) =>
      r.url().includes('/api/policies?') &&
      new URL(r.url()).searchParams.get('search') === ownActive.policyNumber,
  );
  await page.getByLabel('Find policy').fill(ownActive.policyNumber);
  await response;
  await page.getByRole('combobox', { name: 'Active policy', exact: true }).click();
  await page.getByRole('option', { name: new RegExp(ownActive.policyNumber) }).click();
  await page.getByLabel('Incident date', { exact: true }).fill(ownActive.startDate);
  await page.getByLabel('Incident description').fill('Fictional browser test incident report.');
  await page.getByLabel('Estimated amount (USD)').fill('1000');
  await page.getByRole('button', { name: 'Submit Claim', exact: true }).click();
  await expect(page).toHaveURL(/\/claims\/c-/);
  await expect(page.getByRole('heading', { name: /CLM-/ })).toBeVisible();
  return page.url();
}
