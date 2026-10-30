import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButton } from '@angular/material/button';
import { Sort } from '@angular/material/sort';
import { AuthStore } from '../../../../core/auth/auth-store';
import { User } from '../../../../shared/models/user';
import { UsersApi } from '../../../users/data-access/users-api';
import { PolicyStore } from '../../state/policy-store';
import { PolicyFilters } from '../../components/policy-filters';
import { PolicyTable } from '../../components/policy-table';
import { PolicyQuery, SORT_FIELDS } from '../../models/policy-query';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-policies-page',
  providers: [PolicyStore],
  imports: [
    RouterLink,
    PageHeader,
    PolicyFilters,
    PolicyTable,
    MatPaginator,
    MatProgressBar,
    MatButton,
  ],
  templateUrl: './policies-page.html',
  styleUrl: './policies-page.scss',
})
export class PoliciesPage {
  readonly store = inject(PolicyStore);
  readonly admin = inject(AuthStore).role() === 'ADMIN';
  readonly agents = signal<readonly User[]>([]);
  readonly agentError = signal(false);
  constructor() {
    if (this.admin)
      inject(UsersApi)
        .getUsers()
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (users) => this.agents.set(users.filter((u) => u.role === 'AGENT')),
          error: () => this.agentError.set(true),
        });
  }
  sort(sort: Sort) {
    if (SORT_FIELDS.includes(sort.active as PolicyQuery['sortBy']))
      this.store.update({
        sortBy: sort.active as PolicyQuery['sortBy'],
        sortOrder: sort.direction === 'asc' ? 'asc' : 'desc',
      });
  }
}
