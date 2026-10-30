import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { createRequestState } from '../../../core/http/request-state';

import { ClaimsApi } from '../data-access/claims-api';
import { ClaimPage } from '../models/claim';
import { ClaimQuery, DEFAULT_CLAIM_QUERY, parseClaimQuery } from '../models/claim-query';
@Injectable()
export class ClaimsStore {
  private readonly api = inject(ClaimsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly request = createRequestState();
  private readonly retry$ = new Subject<number>();
  private retryEpoch = 0;
  private settledKey = '';
  private settledEpoch = -1;
  private pendingQuery: ClaimQuery | null = null;
  private readonly queryState = signal<ClaimQuery>(DEFAULT_CLAIM_QUERY);
  readonly query = this.queryState.asReadonly();
  private readonly resultState = signal<ClaimPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  readonly result = this.resultState.asReadonly();
  readonly requestStatus = this.request.status;
  readonly loading = this.request.loading;
  readonly failure = this.request.error;
  readonly error = computed(() => this.failure() !== null);
  readonly empty = computed(() => !this.loading() && !this.error() && !this.result().total);
  readonly filterCount = computed(() => {
    const q = this.query();
    return [q.search, q.status, q.claimType, q.dateFrom, q.dateTo].filter(Boolean).length;
  });
  constructor() {
    combineLatest([
      this.route.queryParamMap.pipe(
        map((p) => parseClaimQuery(p)),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      ),
      this.retry$.pipe(startWith(0)),
    ])
      .pipe(
        switchMap(([query, epoch]) => {
          this.queryState.set(query);
          // A server-clamped page replaces the URL but already has a complete response.
          if (
            this.requestStatus() === 'success' &&
            JSON.stringify(query) === this.settledKey &&
            epoch === this.settledEpoch
          )
            return EMPTY;
          return this.request.track(this.api.list(query)).pipe(
            map((result) => ({ result, epoch, query })),
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        if (!response) return;
        const { result, epoch, query } = response;
        this.resultState.set(result);
        this.settledKey = JSON.stringify({ ...query, page: result.page });
        this.settledEpoch = epoch;
        if (result.page !== query.page) this.update({ page: result.page }, false, true);
      });
  }
  update(patch: Partial<ClaimQuery>, reset = true, replaceUrl = false): void {
    const query = {
      ...(this.pendingQuery ?? this.query()),
      ...(reset ? { page: 1 } : {}),
      ...patch,
    };
    this.pendingQuery = query;
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: query,
        replaceUrl,
      })
      .then(
        () => {
          if (this.pendingQuery === query) this.pendingQuery = null;
        },
        () => {
          if (this.pendingQuery === query) this.pendingQuery = null;
        },
      );
  }
  clear(): void {
    this.update({ ...DEFAULT_CLAIM_QUERY });
  }
  retry(): void {
    if (!this.loading()) this.retry$.next(++this.retryEpoch);
  }
}
