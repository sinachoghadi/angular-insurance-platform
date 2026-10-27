import { DEFAULT_AUTHENTICATED_URL, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/policies', '/claims?status=open', '/users#top'])('keeps in-app path %s', (url) => {
    expect(safeReturnUrl(url)).toBe(url);
  });

  it.each([
    undefined,
    null,
    '',
    'policies',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/login',
    '/login?returnUrl=%2Fusers',
  ])('falls back to the dashboard for %s', (url) => {
    expect(safeReturnUrl(url)).toBe(DEFAULT_AUTHENTICATED_URL);
  });
});
