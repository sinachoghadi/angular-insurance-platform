import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import { createRequestState } from './request-state';
import { apiError } from './api-error';
describe('Request lifecycle', () => {
  it('tracks idle/loading/success and clears previous failures', () => {
    const state = createRequestState(),
      source = new Subject<number>();
    expect(state.status()).toBe('idle');
    state.track(source).subscribe();
    expect(state.loading()).toBe(true);
    source.next(1);
    source.complete();
    expect(state.status()).toBe('success');
    state
      .track(throwError(() => new HttpErrorResponse({ status: 500 })))
      .subscribe({ error: () => {} });
    expect(state.status()).toBe('error');
    state.track(of(2)).subscribe();
    expect(state.error()).toBeNull();
    expect(state.status()).toBe('success');
  });
  it('ends loading on cancellation or empty completion', () => {
    const state = createRequestState(),
      source = new Subject<void>();
    const subscription = state.track(source).subscribe();
    subscription.unsubscribe();
    expect(state.status()).toBe('idle');
    state.track(EMPTY).subscribe();
    expect(state.loading()).toBe(false);
    expect(state.status()).toBe('idle');
  });
  it('ignores old errors and finalizers after a newer request begins', () => {
    const state = createRequestState(),
      old = new Subject<number>(),
      current = new Subject<number>();
    const oldSubscription = state.track(old).subscribe({ error: () => {} });
    state.track(current).subscribe();
    old.error(new HttpErrorResponse({ status: 500 }));
    oldSubscription.unsubscribe();
    expect(state.status()).toBe('loading');
    expect(state.error()).toBeNull();
    current.next(1);
    current.complete();
    expect(state.status()).toBe('success');
  });
  it('does not expose writable signals', () => {
    const state = createRequestState();
    expect('set' in state.status).toBe(false);
    expect('set' in state.error).toBe(false);
  });
  it.each([0, 400, 401, 403, 404, 409, 422, 500])(
    'normalizes HTTP %s without exposing private server text',
    (status) => {
      const cause = new HttpErrorResponse({
          status,
          error: { message: 'private-token stack trace' },
        }),
        error = apiError(cause);
      expect(error.status).toBe(status);
      expect(error.cause).toBe(cause);
      expect(error.message).not.toContain('private-token');
      expect(error.retryable).toBe(status === 0 || status >= 500);
    },
  );
});
