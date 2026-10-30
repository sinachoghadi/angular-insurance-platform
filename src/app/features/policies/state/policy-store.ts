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
import { AuthStore } from '../../../core/auth/auth-store';
import { PolicyApi } from '../data-access/policy-api';
import { PolicyPage } from '../models/policy';
import { PolicyQuery, DEFAULT_QUERY, parseQuery } from '../models/policy-query';
@Injectable()
export class PolicyStore {
  private readonly api = inject(PolicyApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly request = createRequestState();
  private readonly retry$ = new Subject<number>();
  private retryEpoch = 0;
  private settledKey = '';
  private settledEpoch = -1;
  private pendingQuery: PolicyQuery | null = null;
  private readonly queryState = signal<PolicyQuery>(DEFAULT_QUERY);
  readonly query = this.queryState.asReadonly();
  private readonly resultState = signal<PolicyPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  readonly result = this.resultState.asReadonly();
  readonly requestStatus = this.request.status;
  readonly loading = this.request.loading;
  readonly failure = this.request.error;
  readonly error = computed(() => this.failure() !== null);
  readonly empty = computed(() => !this.loading() && !this.error() && !this.result().total);
  readonly activeFilters = computed(() => {
    const q = this.query();
    return [q.search, q.insuranceType, q.status, q.agentId, q.startFrom, q.startTo].filter(Boolean)
      .length;
  });
  constructor() {
    combineLatest([
      this.route.queryParamMap.pipe(
        map((p) => parseQuery(p, this.auth.role() === 'ADMIN')),
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
  update(patch: Partial<PolicyQuery>, reset = true, replaceUrl = false): void {
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
    this.update({ ...DEFAULT_QUERY });
  }
  retry(): void {
    if (!this.loading()) this.retry$.next(++this.retryEpoch);
  }
}
