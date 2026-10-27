import { InjectionToken } from '@angular/core';

/** Base URL of the backend API. Relative by default so the dev-server proxy keeps requests same-origin. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

/** True only for requests to our own API, never for third-party or look-alike URLs. */
export function isApiUrl(url: string, apiBaseUrl: string): boolean {
  const base = apiBaseUrl.replace(/\/+$/, '');
  return url === base || url.startsWith(`${base}/`);
}
