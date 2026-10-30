import { computed, signal } from '@angular/core';
import { defer, finalize, Observable, tap } from 'rxjs';
import { ApiError, apiError } from './api-error';
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';
/** Lifecycle only: feature stores retain ownership of data, cancellation and business rules. */
export function createRequestState() {
  const status = signal<RequestStatus>('idle'),
    error = signal<ApiError | null>(null);
  let generation = 0;
  return {
    status: status.asReadonly(),
    error: error.asReadonly(),
    loading: computed(() => status() === 'loading'),
    reset() {
      generation++;
      status.set('idle');
      error.set(null);
    },
    track<T>(source: Observable<T>): Observable<T> {
      return defer(() => {
        const current = ++generation;
        status.set('loading');
        error.set(null);
        return source.pipe(
          tap({
            next: () => {
              if (current === generation) status.set('success');
            },
            error: (cause: unknown) => {
              if (current === generation) {
                error.set(apiError(cause));
                status.set('error');
              }
            },
          }),
          finalize(() => {
            if (current === generation && status() === 'loading') status.set('idle');
          }),
        );
      });
    },
  };
}
