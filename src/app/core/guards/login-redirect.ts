import { Router, UrlTree } from '@angular/router';

/** Login URL that remembers where the user was going, unless that was the app root. */
export function loginRedirect(router: Router, attemptedUrl: string): UrlTree {
  const queryParams = attemptedUrl && attemptedUrl !== '/' ? { returnUrl: attemptedUrl } : {};
  return router.createUrlTree(['/login'], { queryParams });
}
