import AxeBuilder from '@axe-core/playwright';
import { test, expect, login, createClaim, ownActive, otherActive } from './fixtures';

test('protected routes, invalid credentials, Admin login and logout', async ({ page }) => {
  await page.goto('/policies');
  await expect(page).toHaveURL(/\/login\?returnUrl/);
  await page.getByLabel('Email', { exact: true }).fill('admin@demo.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  await login(page, 'ADMIN');
  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/claims');
  await expect(page).toHaveURL(/\/login\?returnUrl/);
});

test('Agent login, route authorization and assigned policy scope', async ({ page, apiOrigin }) => {
  await login(page, 'AGENT');
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Users' })).toHaveCount(0);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  await page.goto(`/policies/${otherActive.id}`);
  await expect(page.getByRole('alert')).toContainText('permission');
  const result = await page.request.get(`${apiOrigin}/api/policies?agentId=u-1003&pageSize=50`);
  expect(result.status()).toBe(200);
  const body = await result.json();
  expect(body.items.length).toBeGreaterThan(0);
  expect(body.items.every((p: { agentId: string }) => p.agentId === 'u-1002')).toBe(true);
  expect((await page.request.get(`${apiOrigin}/api/users`)).status()).toBe(403);
});

test('policy filtering, debounce, URL restoration, pagination and detail deep refresh', async ({
  page,
}) => {
  await login(page);
  await page.goto('/policies');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'ACTIVE', exact: true }).click();
  await expect(page).toHaveURL(/status=ACTIVE/);
  await expect(page).toHaveURL(/page=1(?:&|$)/);
  const search = page.getByLabel('Search policies');
  await search.fill('not-a-customer');
  await search.fill(ownActive.policyNumber);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText(ownActive.policyNumber);
  await page.reload();
  await expect(search).toHaveValue(ownActive.policyNumber);
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toContainText('ACTIVE');
  await page
    .locator('tbody')
    .getByRole('link', { name: ownActive.policyNumber, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: ownActive.policyNumber, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: ownActive.policyNumber, exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: /Back to Policies/ }).click();
  await expect(search).toHaveValue(ownActive.policyNumber);
});

test('save, restore and submit a draft through the real four-step form', async ({ page }) => {
  await login(page, 'AGENT');
  await page.goto('/policies/new');
  await page.getByLabel('Full name', { exact: true }).fill('Browser Demo Customer');
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  await expect(page).toHaveURL(/draft=p-/);
  await expect(page.getByRole('heading', { name: 'Continue Draft', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Browser Demo Customer');
  await page.getByLabel('National ID', { exact: true }).fill('1234567890');
  await page.getByLabel('Mobile number', { exact: true }).fill('09123456789');
  await page.getByLabel('Date of birth', { exact: true }).fill('1990-01-01');
  await page.getByRole('button', { name: 'Next: Product', exact: true }).click();
  await page.getByLabel('Vehicle plate number').fill('DEMO-123');
  await page.getByLabel('Vehicle model').fill('Demo Sedan');
  await page.getByLabel('Manufacturing year (Gregorian)').fill('2020');
  await page.getByRole('button', { name: 'Next: Coverage', exact: true }).click();
  await page.getByLabel('Policy start date').fill('2027-01-01');
  await page.getByLabel('Policy end date').fill('2028-01-01');
  await page.getByRole('button', { name: 'Next: Review', exact: true }).click();
  await expect(page.locator('app-policy-review')).toContainText('Browser Demo Customer');
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
  await expect(page).toHaveURL(/\/policies\/p-[^?]+$/);
  await expect(page.locator('app-policy-status-badge')).toContainText('PENDING');
  await expect(page.getByRole('link', { name: 'Continue Draft', exact: true })).toHaveCount(0);
});

test('claim creation, Admin approval, note persistence and chronological history', async ({
  page,
}) => {
  await login(page);
  const url = await createClaim(page);
  await page.getByRole('button', { name: 'Start review', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm Start review', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Approve claim', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Approve claim', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Approved amount (USD)').fill('500');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm Approve claim', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Close claim', exact: true })).toBeVisible();
  await page.getByLabel('New internal note').fill('Browser-only fictional internal context.');
  await page.getByRole('button', { name: 'Add internal note', exact: true }).click();
  await expect(page.locator('app-claim-review-notes')).toContainText(
    'Browser-only fictional internal context.',
  );
  await page.getByRole('button', { name: 'Close claim', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm Close claim', exact: true })
    .click();
  await expect(page.locator('app-claim-history li')).toHaveCount(4);
  await page.goto(url);
  await expect(page.locator('app-claim-history li')).toHaveCount(4);
  await expect(page.locator('app-claim-review-notes')).toContainText(
    'Browser-only fictional internal context.',
  );
});

test('rejection requires a reason and its public history survives refresh', async ({ page }) => {
  await login(page);
  await createClaim(page);
  await page.getByRole('button', { name: 'Start review', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm Start review', exact: true })
    .click();
  await page.getByRole('button', { name: 'Reject claim', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Confirm Reject claim', exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel('Rejection reason').fill('   ');
  await expect(
    dialog.getByRole('button', { name: 'Confirm Reject claim', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel('Rejection reason')
    .fill('Fictional supporting information is incomplete.');
  await dialog.getByRole('button', { name: 'Confirm Reject claim', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close claim', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('app-claim-history')).toContainText(
    'Fictional supporting information is incomplete.',
  );
});

test('Agent claim eligibility and backend review/note restrictions', async ({
  page,
  apiOrigin,
}) => {
  await login(page, 'AGENT');
  await page.goto('/claims/new');
  await page.getByRole('button', { name: 'Submit Claim', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('eligible policy');
  await createClaim(page);
  await expect(page.locator('app-claim-review-notes')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start review', exact: true })).toHaveCount(0);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const xsrf = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')!.value;
  const review = await page.request.post(`${apiOrigin}/api/claims/${id}/transition`, {
    headers: { 'X-XSRF-TOKEN': xsrf },
    data: { status: 'APPROVED', version: 1, approvedAmount: 1000 },
  });
  expect(review.status()).toBe(403);
  expect((await review.json()).message).toContain('Admin-only');
  expect((await page.request.get(`${apiOrigin}/api/claims/${id}/notes`)).status()).toBe(403);
});

test('API errors are visible and Retry recovers without restarting the app', async ({ page }) => {
  await login(page);
  await page.route(
    '**/api/policies?**',
    (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 500, message: 'Fictional failure' }),
      }),
    { times: 1 },
  );
  await page.goto('/policies');
  await expect(page.getByRole('alert')).toContainText('Unable to load policies');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
});

test('keyboard, mobile overflow and automated WCAG checks on critical pages/dialog', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  const scan = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  };
  await scan();
  await login(page);
  await page.goto('/policies');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await scan();
  await page.keyboard.press('Tab'); // The skip control is also explicitly exercised below.
  await page.getByRole('button', { name: 'Skip to main content', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await scan();
  await page.setViewportSize({ width: 1280, height: 900 });
  await createClaim(page);
  await scan();
  await page.getByRole('button', { name: 'Start review', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await scan();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start review', exact: true })).toBeFocused();
});
