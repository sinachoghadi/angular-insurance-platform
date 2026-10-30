import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  throwError,
} from 'rxjs';
import { createRequestState } from '../../../core/http/request-state';
import { PolicyApi } from '../data-access/policy-api';
import { Policy } from '../models/policy';
@Injectable()
export class PolicyDetailsStore {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PolicyApi);
  private readonly retry$ = new Subject<void>();
  private readonly request = createRequestState();
  private readonly policyState = signal<Policy | null>(null);
  readonly policy = this.policyState.asReadonly();
  readonly requestStatus = this.request.status;
  readonly failure = this.request.error;
  readonly loading = this.request.loading;
  readonly error = computed(() => {
    const error = this.failure();
    return !error
      ? ''
      : error.status === 404
        ? 'Policy not found.'
        : error.status === 403
          ? 'You do not have permission to view this policy.'
          : 'Unable to load this policy. ' + error.message;
  });
  readonly retryable = computed(() => this.failure()?.retryable ?? false);
  constructor() {
    combineLatest([
      this.route.paramMap.pipe(
        map((p) => p.get('id') ?? ''),
        distinctUntilChanged(),
      ),
      this.retry$.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([id]) => {
          this.policyState.set(null);
          return this.request
            .track(
              /^p-[a-zA-Z0-9-]{1,64}$/.test(id)
                ? this.api.get(id)
                : throwError(() => new HttpErrorResponse({ status: 404 })),
            )
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((policy) => this.policyState.set(policy));
  }
  retry(): void {
    if (!this.loading()) this.retry$.next();
  }
}
