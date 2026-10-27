export const DEFAULT_AUTHENTICATED_URL = '/dashboard';

/**
 * Accepts only in-app absolute paths, so `?returnUrl=` cannot be used as an open redirect
 * (e.g. `//evil.example` or `https://evil.example`) or to loop back to the login page.
 */
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return DEFAULT_AUTHENTICATED_URL;
  }
  if (url === '/login' || url.startsWith('/login?') || url.startsWith('/login/')) {
    return DEFAULT_AUTHENTICATED_URL;
  }
  return url;
}
