import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth-store';
import { ADMIN_USER, AGENT_USER, UNAUTHORIZED, sessionFor } from './testing/auth-fixtures';

describe('AuthStore', () => {
  let store: AuthStore;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const credentials = { email: 'admin@demo.com', password: 'Admin123!' };

  async function signIn(session = sessionFor(ADMIN_USER)): Promise<void> {
    const result = firstValueFrom(store.login(credentials));
    http.expectOne('/api/auth/login').flush(session);
    await result;
  }

  it('starts in the initializing state', () => {
    expect(store.status()).toBe('unknown');
    expect(store.isInitializing()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
  });

  describe('session restoration', () => {
    it('restores an existing session from GET /auth/me', async () => {
      const status = firstValueFrom(store.ensureInitialized());
      http.expectOne({ method: 'GET', url: '/api/auth/me' }).flush(sessionFor(AGENT_USER));

      expect(await status).toBe('authenticated');
      expect(store.user()).toEqual(AGENT_USER);
      expect(store.role()).toBe('AGENT');
      expect(store.isInitializing()).toBe(false);
    });

    it('becomes unauthenticated when there is no valid session', async () => {
      const status = firstValueFrom(store.ensureInitialized());
      http.expectOne('/api/auth/me').flush(null, UNAUTHORIZED);

      expect(await status).toBe('unauthenticated');
      expect(store.user()).toBeNull();
    });

    it('shares one request between concurrent callers and does not repeat it', async () => {
      const first = firstValueFrom(store.ensureInitialized());
      const second = firstValueFrom(store.ensureInitialized());
      http.expectOne('/api/auth/me').flush(sessionFor(ADMIN_USER));

      expect(await first).toBe('authenticated');
      expect(await second).toBe('authenticated');
      expect(await firstValueFrom(store.ensureInitialized())).toBe('authenticated');
    });
  });

  describe('login', () => {
    it('starts only on subscription, shares concurrent submissions and cleans up cancellation', () => {
      const operation = store.login(credentials);
      expect(store.loginPending()).toBe(false);
      http.expectNone('/api/auth/login');
      const first = operation.subscribe(),
        second = store.login(credentials).subscribe();
      const request = http.expectOne('/api/auth/login');
      expect(store.loginPending()).toBe(true);
      first.unsubscribe();
      expect(request.cancelled).toBe(false);
      second.unsubscribe();
      expect(request.cancelled).toBe(true);
      expect(store.loginPending()).toBe(false);
      expect(store.loginStatus()).toBe('idle');
    });
    it('authenticates and exposes the user on success', async () => {
      const result = firstValueFrom(store.login(credentials));

      expect(store.loginPending()).toBe(true);
      const request = http.expectOne({ method: 'POST', url: '/api/auth/login' });
      expect(request.request.body).toEqual(credentials);
      request.flush(sessionFor(ADMIN_USER));

      expect(await result).toBe(true);
      expect(store.isAuthenticated()).toBe(true);
      expect(store.user()).toEqual(ADMIN_USER);
      expect(store.hasAnyRole(['ADMIN'])).toBe(true);
      expect(store.loginPending()).toBe(false);
      expect(store.loginError()).toBeNull();
    });

    it('exposes an error message for invalid credentials', async () => {
      const result = firstValueFrom(store.login({ ...credentials, password: 'wrong' }));
      http.expectOne('/api/auth/login').flush({ message: 'Invalid' }, UNAUTHORIZED);

      expect(await result).toBe(false);
      expect(store.isAuthenticated()).toBe(false);
      expect(store.loginError()).toBe('Invalid email or password.');
      expect(store.loginPending()).toBe(false);
    });

    it('reports network failures separately from invalid credentials', async () => {
      const result = firstValueFrom(store.login(credentials));
      http.expectOne('/api/auth/login').error(new ProgressEvent('error'), { status: 0 });

      expect(await result).toBe(false);
      expect(store.loginError()).toContain('Unable to reach the server');
    });
  });

  describe('logout', () => {
    it('blocks a reentrant login from a canceled subscriber during logout', () => {
      store.login(credentials).subscribe((valid) => {
        if (!valid) store.login(credentials).subscribe();
      });
      const pending = http.expectOne('/api/auth/login');
      store.logout().subscribe();
      expect(pending.cancelled).toBe(true);
      http.expectNone('/api/auth/login');
      http.expectOne('/api/auth/logout').flush(null);
      expect(store.isAuthenticated()).toBe(false);
    });
    it('cancels pending login so a late response cannot restore the session', async () => {
      const login = firstValueFrom(store.login(credentials));
      const pending = http.expectOne('/api/auth/login');
      const done = firstValueFrom(store.logout());
      expect(pending.cancelled).toBe(true);
      expect(await login).toBe(false);
      http.expectOne('/api/auth/logout').flush(null);
      await done;
      expect(store.user()).toBeNull();
      expect(store.status()).toBe('unauthenticated');
    });
    it('cancels session restoration on logout and shares the logout operation', async () => {
      const restore = firstValueFrom(store.ensureInitialized());
      const pending = http.expectOne('/api/auth/me');
      const first = firstValueFrom(store.logout()),
        second = firstValueFrom(store.logout());
      expect(pending.cancelled).toBe(true);
      http.expectOne('/api/auth/logout').flush(null);
      await Promise.all([first, second]);
      expect(await restore).toBe('unauthenticated');
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    });
    it('invalidates the session on the server, clears state, and goes to login', async () => {
      await signIn();

      const done = firstValueFrom(store.logout());
      http
        .expectOne({ method: 'POST', url: '/api/auth/logout' })
        .flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(store.status()).toBe('unauthenticated');
      expect(store.user()).toBeNull();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('still clears the local session when the server call fails', async () => {
      await signIn();

      const done = firstValueFrom(store.logout());
      http.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });
      await done;

      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('session expiry', () => {
    it('clears the session and redirects once when the API reports 401', async () => {
      await signIn();

      store.handleUnauthorized();
      store.handleUnauthorized();

      expect(store.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'expired', returnUrl: '/' },
      });
    });

    it('signs the user out when the session lifetime elapses', async () => {
      vi.useFakeTimers();
      await signIn(sessionFor(ADMIN_USER, 60));

      vi.advanceTimersByTime(59_000);
      expect(store.isAuthenticated()).toBe(true);

      vi.advanceTimersByTime(1_000);
      expect(store.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'expired', returnUrl: '/' },
      });
    });

    it('cancels the expiry timer on logout', async () => {
      vi.useFakeTimers();
      await signIn(sessionFor(ADMIN_USER, 60));

      const done = firstValueFrom(store.logout());
      http.expectOne('/api/auth/logout').flush(null);
      await done;
      vi.advanceTimersByTime(120_000);

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
