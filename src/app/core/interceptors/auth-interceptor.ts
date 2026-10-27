import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL, isApiUrl } from '../services/api-config';

/**
 * Sends the HttpOnly session cookie with requests to our API only.
 *
 * `withCredentials` is what makes the browser attach cookies when the API is on another
 * origin; third-party requests never receive it. The XSRF header for mutating requests is
 * added by HttpClient's built-in XSRF interceptor.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req.url, inject(API_BASE_URL))) {
    return next(req);
  }
  return next(req.clone({ withCredentials: true }));
};
