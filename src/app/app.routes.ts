import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
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
        loadChildren: () => import('./features/users/users.routes'),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('./features/not-found/pages/not-found-page/not-found-page'),
      },
    ],
  },
];
