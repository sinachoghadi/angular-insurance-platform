import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  Observable,
  Subject,
  Subscription,
  catchError,
  defaultIfEmpty,
  defer,
  finalize,
  map,
  of,
  shareReplay,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import { createRequestState } from '../http/request-state';
import { Role } from '../../shared/models/role';
import { User } from '../../shared/models/user';
import { AuthApi } from './auth-api';
import { AuthStatus, LoginCredentials, SessionResponse } from './auth-models';
interface AuthState {
  readonly status: AuthStatus;
  readonly user: User | null;
}
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<AuthState>({ status: 'unknown', user: null });
  private readonly restoreRequest = createRequestState();
  private readonly loginRequest = createRequestState();
  private readonly logoutRequest = createRequestState();
  private readonly invalidated$ = new Subject<void>();
  private restore$: Observable<AuthStatus> | null = null;
  private login$: Observable<boolean> | null = null;
  private logout$: Observable<void> | null = null;
  private expiryTimer: Subscription | null = null;
  private epoch = 0;
  readonly status = computed(() => this.state().status);
  readonly user = computed(() => this.state().user);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isInitializing = computed(() => this.status() === 'unknown');
  readonly isAuthenticated = computed(() => this.status() === 'authenticated');
  readonly restoreStatus = this.restoreRequest.status;
  readonly loginStatus = this.loginRequest.status;
  readonly logoutStatus = this.logoutRequest.status;
  readonly loginPending = this.loginRequest.loading;
  readonly loginFailure = this.loginRequest.error;
  readonly restoreFailure = this.restoreRequest.error;
  readonly logoutFailure = this.logoutRequest.error;
  readonly loginError = computed(() => {
    const error = this.loginFailure();
    return !error ? null : error.status === 401 ? 'Invalid email or password.' : error.message;
  });
  constructor() {
    this.destroyRef.onDestroy(() => this.expiryTimer?.unsubscribe());
  }
  hasAnyRole(roles: readonly Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }
  ensureInitialized(): Observable<AuthStatus> {
    return defer(() => {
      if (this.status() !== 'unknown') return of(this.status());
      if (this.login$) return this.login$.pipe(map(() => this.status()));
      if (this.restore$) return this.restore$;
      const epoch = this.epoch;
      const request = this.restoreRequest.track(this.api.me()).pipe(
        takeUntil(this.invalidated$),
        takeUntilDestroyed(this.destroyRef),
        tap((session) => {
          if (epoch === this.epoch) this.startSession(session);
        }),
        catchError(() => {
          if (epoch === this.epoch) this.clearSessionState();
          return of(null);
        }),
        defaultIfEmpty(null),
        map(() => this.status()),
        finalize(() => {
          if (this.restore$ === request) this.restore$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.restore$ = request;
      return request;
    });
  }
  /** Cold, single-flight login. Concurrent submissions share the first in-flight operation. */
  login(credentials: LoginCredentials): Observable<boolean> {
    return defer(() => {
      if (this.logout$) return of(false);
      if (this.login$) return this.login$;
      this.epoch++;
      const epoch = this.epoch;
      const request = this.loginRequest.track(this.api.login(credentials)).pipe(
        takeUntil(this.invalidated$),
        takeUntilDestroyed(this.destroyRef),
        tap((session) => {
          if (epoch === this.epoch) this.startSession(session);
        }),
        map(() => true),
        catchError(() => of(false)),
        defaultIfEmpty(false),
        finalize(() => {
          if (this.login$ === request) this.login$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.login$ = request;
      this.invalidated$.next();
      return request;
    });
  }
  clearLoginError(): void {
    if (!this.loginPending()) this.loginRequest.reset();
  }
  logout(): Observable<void> {
    return defer(() => {
      if (this.logout$) return this.logout$;
      const request = this.logoutRequest.track(this.api.logout()).pipe(
        catchError(() => of(undefined)),
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          void this.router.navigateByUrl('/login');
        }),
        finalize(() => {
          if (this.logout$ === request) this.logout$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.logout$ = request;
      this.invalidateSession();
      return request;
    });
  }
  handleUnauthorized(): void {
    if (this.isAuthenticated()) this.expireSession();
  }
  private startSession(session: SessionResponse): void {
    this.state.set({ status: 'authenticated', user: session.user });
    this.expiryTimer?.unsubscribe();
    this.expiryTimer = timer(Math.max(0, session.expiresIn * 1000)).subscribe(() =>
      this.expireSession(),
    );
  }
  private clearSessionState(): void {
    this.expiryTimer?.unsubscribe();
    this.expiryTimer = null;
    this.state.set({ status: 'unauthenticated', user: null });
  }
  private invalidateSession(): void {
    this.clearSessionState();
    this.epoch++;
    this.invalidated$.next();
    this.restoreRequest.reset();
    this.loginRequest.reset();
  }
  private expireSession(): void {
    const returnUrl = this.router.url;
    this.invalidateSession();
    void this.router.navigate(['/login'], { queryParams: { reason: 'expired', returnUrl } });
  }
}
