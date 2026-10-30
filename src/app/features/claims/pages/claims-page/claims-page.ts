import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButton } from '@angular/material/button';
import { Sort } from '@angular/material/sort';
import { ClaimsStore } from '../../state/claims-store';
import { ClaimFilters } from '../../components/claim-filters';
import { ClaimTable } from '../../components/claim-table';
import { CLAIM_SORT_FIELDS, ClaimQuery } from '../../models/claim-query';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-claims-page',
  providers: [ClaimsStore],
  imports: [
    PageHeader,
    RouterLink,
    MatPaginator,
    MatProgressBar,
    MatButton,
    ClaimFilters,
    ClaimTable,
  ],
  templateUrl: './claims-page.html',
  styleUrl: './claims-page.scss',
})
export class ClaimsPage {
  readonly store = inject(ClaimsStore);
  sort(sort: Sort) {
    if (CLAIM_SORT_FIELDS.includes(sort.active as ClaimQuery['sortBy']))
      this.store.update({
        sortBy: sort.active as ClaimQuery['sortBy'],
        sortOrder: sort.direction === 'asc' ? 'asc' : 'desc',
      });
  }
}
