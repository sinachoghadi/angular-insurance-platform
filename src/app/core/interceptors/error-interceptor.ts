import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth-store';
import { API_BASE_URL, isApiUrl } from '../services/api-config';
import { SKIP_SESSION_HANDLING } from './http-context';

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
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          authStore.handleUnauthorized();
        } else if (error.status === 403) {
          snackBar.open(FORBIDDEN_MESSAGE, 'Dismiss', { duration: 6000 });
        }
      }
      return throwError(() => error);
    }),
  );
};
