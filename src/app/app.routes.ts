import { Routes } from '@angular/router';
import { ACCESS_RULES } from './core/auth/access-rules';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login-page/login-page'),
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    // `canActivateChild` re-checks the session on every navigation inside the shell,
    // not just when the shell is first activated.
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes'),
      },
      {
        path: 'policies',
        loadChildren: () => import('./features/policies/policies.routes'),
      },
      {
        path: 'claims',
        loadChildren: () => import('./features/claims/claims.routes'),
      },
      {
        path: 'users',
        canActivate: [roleGuard(ACCESS_RULES.usersManagement)],
        loadChildren: () => import('./features/users/users.routes'),
      },
      {
        path: 'access-denied',
        title: 'Access denied',
        loadComponent: () =>
          import('./features/access-denied/pages/access-denied-page/access-denied-page'),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('./features/not-found/pages/not-found-page/not-found-page'),
      },
    ],
  },
];
