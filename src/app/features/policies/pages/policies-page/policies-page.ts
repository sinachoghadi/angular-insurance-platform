import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../../../shared/components/feature-placeholder/feature-placeholder';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-policies-page',
  imports: [PageHeader, FeaturePlaceholder],
  templateUrl: './policies-page.html',
})
export class PoliciesPage {
  protected readonly plannedItems = [
    'Policy list with server-side pagination',
    'Sorting, filtering, and debounced search',
    'Policy details',
    'Multi-step create and edit workflow with draft saving',
  ] as const;
}
