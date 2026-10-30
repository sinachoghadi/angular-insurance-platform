import { HttpErrorResponse } from '@angular/common/http';
export type ApiErrorKind =
  | 'network'
  | 'bad-request'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';
export interface ApiError {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}
export function apiError(cause: unknown): ApiError {
  const status = cause instanceof HttpErrorResponse ? cause.status : null;
  const kind: ApiErrorKind =
    status === 0
      ? 'network'
      : status === 400
        ? 'bad-request'
        : status === 401
          ? 'unauthorized'
          : status === 403
            ? 'forbidden'
            : status === 404
              ? 'not-found'
              : status === 409
                ? 'conflict'
                : status === 422
                  ? 'validation'
                  : status !== null && status >= 500
                    ? 'server'
                    : 'unknown';
  const messages: Record<ApiErrorKind, string> = {
    network: 'Unable to reach the server. Check your connection and try again.',
    'bad-request': 'The request is invalid. Review the entered information.',
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to access this resource or action.',
    'not-found': 'The requested record was not found.',
    conflict: 'This record changed or the action is no longer allowed. Reload before continuing.',
    validation: 'Some fields are invalid. Review the entered values.',
    server: 'The server could not complete the request. Please try again.',
    unknown: 'Unable to complete this request. Please try again.',
  };
  return {
    kind,
    status,
    message: messages[kind],
    retryable: ['network', 'server', 'unknown'].includes(kind),
    cause,
  };
}
