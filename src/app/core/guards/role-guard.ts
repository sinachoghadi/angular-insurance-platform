import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Role } from '../../shared/models/role';
import { AuthStore } from '../auth/auth-store';
import { loginRedirect } from './login-redirect';

/**
 * Factory for a guard that allows only the given roles. Typed arguments are used instead of
 * untyped `route.data`, so a misspelled role is a compile error.
 */
export function roleGuard(allowedRoles: readonly Role[]): CanActivateFn {
  return (_route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    return authStore.ensureInitialized().pipe(
      map(() => {
        if (!authStore.isAuthenticated()) {
          return loginRedirect(router, state.url);
        }
        return authStore.hasAnyRole(allowedRoles) ? true : router.parseUrl('/access-denied');
      }),
    );
  };
}
