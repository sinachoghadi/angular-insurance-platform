import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from '../auth/auth-store';
import { loginRedirect } from './login-redirect';

/** Allows authenticated users; sends everyone else to login with a `returnUrl`. */
export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authStore
    .ensureInitialized()
    .pipe(map((status) => (status === 'authenticated' ? true : loginRedirect(router, state.url))));
};
