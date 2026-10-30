import { Routes } from '@angular/router';
import { ClaimsPage } from './pages/claims-page/claims-page';

const routes: Routes = [
  { path: '', title: 'Claims', component: ClaimsPage },
  {
    path: 'new',
    title: 'Create Claim',
    loadComponent: () =>
      import('./pages/claim-create/claim-create-page').then((m) => m.ClaimCreatePage),
  },
  {
    path: ':id',
    title: 'Claim details',
    loadComponent: () =>
      import('./pages/claim-details/claim-details-page').then((m) => m.ClaimDetailsPage),
  },
];

export default routes;
