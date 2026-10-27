import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  Subscription,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  tap,
  timer,
} from 'rxjs';
import { Role } from '../../shared/models/role';
import { User } from '../../shared/models/user';
import { AuthApi } from './auth-api';
import { AuthStatus, LoginCredentials, SessionResponse } from './auth-models';

interface AuthState {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly loginPending: boolean;
  readonly loginError: string | null;
}

const INITIAL_STATE: AuthState = {
  status: 'unknown',
  user: null,
  loginPending: false,
  loginError: null,
};

const SIGNED_OUT_STATE: AuthState = { ...INITIAL_STATE, status: 'unauthenticated' };

/**
 * Single source of truth for the client-side session.
 *
 * The session itself lives in an HttpOnly cookie the app cannot read; this store only mirrors
 * what the API reports, so a page refresh restores state by calling `GET /auth/me`.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly state = signal<AuthState>(INITIAL_STATE);

  readonly status = computed(() => this.state().status);
  readonly user = computed(() => this.state().user);
  readonly loginPending = computed(() => this.state().loginPending);
  readonly loginError = computed(() => this.state().loginError);

  readonly isInitializing = computed(() => this.status() === 'unknown');
  readonly isAuthenticated = computed(() => this.status() === 'authenticated');
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  private restore$: Observable<AuthStatus> | null = null;
  private expiryTimer: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.expiryTimer?.unsubscribe());
  }

  hasAnyRole(roles: readonly Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  /**
   * Restores the session once per app load. Concurrent callers (e.g. several guards)
   * share the same request; later callers get the already-known status.
   */
  ensureInitialized(): Observable<AuthStatus> {
    if (this.status() !== 'unknown') {
      return of(this.status());
    }
    this.restore$ ??= this.api.me().pipe(
      tap((session) => this.startSession(session)),
      catchError(() => {
        this.endSession();
        return of(null);
      }),
      map(() => this.status()),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.restore$;
  }

  /** Emits `true` on success. Failures are exposed through `loginError` instead of erroring. */
  login(credentials: LoginCredentials): Observable<boolean> {
    this.patch({ loginPending: true, loginError: null });

    return this.api.login(credentials).pipe(
      tap((session) => this.startSession(session)),
      map(() => true),
      catchError((error: unknown) => {
        this.patch({ loginError: loginErrorMessage(error) });
        return of(false);
      }),
      finalize(() => this.patch({ loginPending: false })),
    );
  }

  clearLoginError(): void {
    this.patch({ loginError: null });
  }

  /** Ends the session on the server, then locally, even if the server call fails. */
  logout(): Observable<void> {
    return this.api.logout().pipe(
      catchError(() => of(undefined)),
      map(() => {
        this.endSession();
        void this.router.navigateByUrl('/login');
      }),
    );
  }

  /** Called when the API reports the session is no longer valid. Idempotent. */
  handleUnauthorized(): void {
    if (this.isAuthenticated()) {
      this.expireSession();
    }
  }

  private startSession(session: SessionResponse): void {
    this.state.set({ ...SIGNED_OUT_STATE, status: 'authenticated', user: session.user });
    this.scheduleExpiry(session.expiresIn * 1000);
  }

  private endSession(): void {
    this.expiryTimer?.unsubscribe();
    this.expiryTimer = null;
    this.state.set(SIGNED_OUT_STATE);
  }

  private expireSession(): void {
    const returnUrl = this.router.url;
    this.endSession();
    void this.router.navigate(['/login'], {
      queryParams: { reason: 'expired', returnUrl },
    });
  }

  private scheduleExpiry(delayMs: number): void {
    this.expiryTimer?.unsubscribe();
    this.expiryTimer = timer(Math.max(0, delayMs)).subscribe(() => this.expireSession());
  }

  private patch(partial: Partial<AuthState>): void {
    this.state.update((state) => ({ ...state, ...partial }));
  }
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 0)
      return 'Unable to reach the server. Check your connection and try again.';
  }
  return 'Something went wrong while signing in. Please try again.';
}
