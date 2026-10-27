import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../../../shared/components/feature-placeholder/feature-placeholder';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-dashboard-page',
  imports: [PageHeader, FeaturePlaceholder],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  protected readonly plannedItems = [
    'Total active policies and pending claims',
    'Monthly premium summary',
    'Policy distribution by type',
    'Recent activity feed',
  ] as const;
}
