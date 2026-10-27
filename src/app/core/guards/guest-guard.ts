import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from '../auth/auth-store';
import { DEFAULT_AUTHENTICATED_URL } from '../auth/return-url';

/** Keeps signed-in users away from guest-only pages such as login. */
export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authStore
    .ensureInitialized()
    .pipe(
      map((status) =>
        status === 'authenticated' ? router.parseUrl(DEFAULT_AUTHENTICATED_URL) : true,
      ),
    );
};
