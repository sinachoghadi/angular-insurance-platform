import { Routes } from '@angular/router';
import { PoliciesPage } from './pages/policies-page/policies-page';
import { unsavedPolicyGuard } from './forms/unsaved-policy-guard';

const routes: Routes = [
  { path: '', title: 'Policies', component: PoliciesPage },
  {
    path: 'new',
    title: 'Create Policy',
    canDeactivate: [unsavedPolicyGuard],
    loadComponent: () =>
      import('./pages/policy-form/policy-form-page').then((m) => m.PolicyFormPage),
  },
  {
    path: ':id/edit',
    title: 'Edit Draft',
    canDeactivate: [unsavedPolicyGuard],
    loadComponent: () =>
      import('./pages/policy-form/policy-form-page').then((m) => m.PolicyFormPage),
  },
  {
    path: ':id',
    title: 'Policy details',
    loadComponent: () =>
      import('./pages/policy-details/policy-details').then((m) => m.PolicyDetails),
  },
];

export default routes;
