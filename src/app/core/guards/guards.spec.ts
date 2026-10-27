import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { Role } from '../../shared/models/role';
import { AuthStatus } from '../auth/auth-models';
import { AuthStore } from '../auth/auth-store';
import { authGuard } from './auth-guard';
import { guestGuard } from './guest-guard';
import { roleGuard } from './role-guard';

type AuthStoreStub = Pick<AuthStore, 'ensureInitialized' | 'isAuthenticated' | 'hasAnyRole'>;

function setup(status: AuthStatus, role: Role | null = null): void {
  const stub: AuthStoreStub = {
    ensureInitialized: () => of(status),
    isAuthenticated: computed(() => status === 'authenticated'),
    hasAnyRole: (roles) => role !== null && roles.includes(role),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthStore, useValue: stub }],
  });
}

function runGuard(guard: CanActivateFn, url: string): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    guard(new ActivatedRouteSnapshot(), { url } as RouterStateSnapshot),
  );
  return firstValueFrom(result as Observable<boolean | UrlTree>);
}

function serialize(result: boolean | UrlTree): string | boolean {
  return result instanceof UrlTree ? result.toString() : result;
}

describe('authGuard', () => {
  it('allows authenticated users', async () => {
    setup('authenticated', 'AGENT');

    expect(await runGuard(authGuard, '/policies')).toBe(true);
  });

  it('redirects unauthenticated users to login and preserves the destination', async () => {
    setup('unauthenticated');

    expect(serialize(await runGuard(authGuard, '/claims?status=open'))).toBe(
      '/login?returnUrl=%2Fclaims%3Fstatus%3Dopen',
    );
  });

  it('omits returnUrl for the app root', async () => {
    setup('unauthenticated');

    expect(serialize(await runGuard(authGuard, '/'))).toBe('/login');
  });
});

describe('guestGuard', () => {
  it('allows guests to open the login page', async () => {
    setup('unauthenticated');

    expect(await runGuard(guestGuard, '/login')).toBe(true);
  });

  it('sends authenticated users to the dashboard', async () => {
    setup('authenticated', 'ADMIN');

    expect(serialize(await runGuard(guestGuard, '/login'))).toBe('/dashboard');
  });
});

describe('roleGuard', () => {
  const adminOnly = roleGuard(['ADMIN']);

  it('allows a user with a permitted role', async () => {
    setup('authenticated', 'ADMIN');

    expect(await runGuard(adminOnly, '/users')).toBe(true);
  });

  it('sends an authenticated user without the role to Access Denied', async () => {
    setup('authenticated', 'AGENT');

    expect(serialize(await runGuard(adminOnly, '/users'))).toBe('/access-denied');
  });

  it('sends unauthenticated users to login instead of Access Denied', async () => {
    setup('unauthenticated');

    expect(serialize(await runGuard(adminOnly, '/users'))).toBe('/login?returnUrl=%2Fusers');
  });
});
