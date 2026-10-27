import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../../../shared/components/feature-placeholder/feature-placeholder';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-claims-page',
  imports: [PageHeader, FeaturePlaceholder],
  templateUrl: './claims-page.html',
})
export class ClaimsPage {
  protected readonly plannedItems = [
    'Claims list and details',
    'Create a claim for an active policy',
    'Validated status transitions with review notes',
    'Claim history timeline',
  ] as const;
}
