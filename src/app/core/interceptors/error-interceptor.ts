import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, from, mergeMap, of, tap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth-store';
import { API_BASE_URL, isApiUrl } from '../services/api-config';
import { SKIP_SESSION_HANDLING, HANDLE_API_ERROR_LOCALLY } from './http-context';

export const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action.';

/**
 * 401: the session is gone, so clear it and send the user to login.
 * 403: the session is valid but lacks permission, so keep it and notify the user.
 * The error is always re-thrown so callers can still render their own error state.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req.url, inject(API_BASE_URL)) || req.context.get(SKIP_SESSION_HANDLING)) {
    return next(req);
  }

  const authStore = inject(AuthStore);
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          authStore.handleUnauthorized();
        } else if (error.status === 403 && !req.context.get(HANDLE_API_ERROR_LOCALLY)) {
          // A rare, unowned permission toast must not pull Material overlay into startup JS.
          return from(import('@angular/material/snack-bar')).pipe(
            tap(({ MatSnackBar }) =>
              injector.get(MatSnackBar).open(FORBIDDEN_MESSAGE, 'Dismiss', { duration: 6000 }),
            ),
            catchError(() => of(null)), // Preserve the original HTTP error if the UI chunk cannot load.
            mergeMap(() => throwError(() => error)),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
