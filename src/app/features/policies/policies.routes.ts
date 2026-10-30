import { Routes } from '@angular/router';
import { PoliciesPage } from './pages/policies-page/policies-page';

const routes: Routes = [
  { path: '', title: 'Policies', component: PoliciesPage },
  {
    path: ':id',
    title: 'Policy details',
    loadComponent: () =>
      import('./pages/policy-details/policy-details').then((m) => m.PolicyDetails),
  },
];

export default routes;
