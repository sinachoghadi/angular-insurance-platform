import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { catchError, map, of } from 'rxjs';
import { FeaturePlaceholder } from '../../../../shared/components/feature-placeholder/feature-placeholder';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ROLE_LABELS } from '../../../../shared/models/role';
import { User } from '../../../../shared/models/user';
import { UsersApi } from '../../data-access/users-api';

type UsersState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly users: readonly User[] }
  | { readonly status: 'error' };

const LOADING: UsersState = { status: 'loading' };

@Component({
  selector: 'app-users-page',
  imports: [PageHeader, FeaturePlaceholder, MatProgressSpinner],
  styleUrl: './users-page.scss',
  templateUrl: './users-page.html',
})
export class UsersPage {
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly state = toSignal(
    inject(UsersApi)
      .getUsers()
      .pipe(
        map((users): UsersState => ({ status: 'success', users })),
        catchError(() => of<UsersState>({ status: 'error' })),
      ),
    { initialValue: LOADING },
  );

  protected readonly plannedItems = [
    'Role assignment',
    'Activate and deactivate accounts',
  ] as const;
}
