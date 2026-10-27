import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../../../shared/components/feature-placeholder/feature-placeholder';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-users-page',
  imports: [PageHeader, FeaturePlaceholder],
  templateUrl: './users-page.html',
})
export class UsersPage {
  protected readonly plannedItems = [
    'User listing',
    'Role assignment',
    'Activate and deactivate accounts',
    'Admin-only access',
  ] as const;
}
