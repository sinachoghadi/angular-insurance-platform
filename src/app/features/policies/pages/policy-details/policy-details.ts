import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Subject, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PolicyApi } from '../../data-access/policy-api';
import { Policy } from '../../models/policy';
import { parseQuery } from '../../models/policy-query';
import { AuthStore } from '../../../../core/auth/auth-store';
import { PolicyStatusBadge } from '../../components/policy-status-badge';
@Component({
  selector: 'app-policy-details',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatProgressBar,
    PageHeader,
    PolicyStatusBadge,
  ],
  templateUrl: './policy-details.html',
  styleUrl: './policy-details.scss',
})
export class PolicyDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PolicyApi);
  private readonly retry$ = new Subject<void>();
  readonly backQuery = parseQuery(
    this.route.snapshot.queryParamMap,
    inject(AuthStore).role() === 'ADMIN',
  );
  readonly policy = signal<Policy | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly retryable = signal(false);
  constructor() {
    combineLatest([this.route.paramMap, this.retry$.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.policy.set(null);
          this.error.set('');
          this.loading.set(true);
          this.retryable.set(false);
          const id = params.get('id') ?? '';
          if (!/^p-\d+$/.test(id)) {
            this.error.set('Policy not found.');
            return of(null);
          }
          return this.api.get(id).pipe(
            catchError((error: unknown) => {
              const status = error instanceof HttpErrorResponse ? error.status : 0;
              this.error.set(
                status === 404
                  ? 'Policy not found.'
                  : status === 403
                    ? 'You do not have permission to view this policy.'
                    : 'Unable to load this policy. Please try again.',
              );
              this.retryable.set(status !== 403 && status !== 404);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((policy) => {
        this.policy.set(policy);
        this.loading.set(false);
      });
  }
  retry() {
    this.retry$.next();
  }
}
