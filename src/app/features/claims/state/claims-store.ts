import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { ClaimsApi } from '../data-access/claims-api';
import { ClaimPage } from '../models/claim';
import { ClaimQuery, DEFAULT_CLAIM_QUERY, parseClaimQuery } from '../models/claim-query';
@Injectable()
export class ClaimsStore {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ClaimsApi);
  private readonly retry$ = new Subject<void>();
  readonly query = signal(DEFAULT_CLAIM_QUERY);
  readonly result = signal<ClaimPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly empty = computed(() => !this.loading() && !this.error() && !this.result().total);
  readonly filterCount = computed(() => {
    const q = this.query();
    return [q.search, q.status, q.claimType, q.dateFrom, q.dateTo].filter(Boolean).length;
  });
  constructor() {
    combineLatest([
      this.route.queryParamMap.pipe(
        map(parseClaimQuery),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      ),
      this.retry$.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([query]) => {
          this.query.set(query);
          this.loading.set(true);
          this.error.set(false);
          return this.api.list(query).pipe(
            catchError(() => {
              this.error.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result) {
          this.result.set(result);
          if (result.page !== this.query().page) this.update({ page: result.page }, false, true);
        }
      });
  }
  update(patch: Partial<ClaimQuery>, reset = true, replaceUrl = false) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.query(), ...(reset ? { page: 1 } : {}), ...patch },
      replaceUrl,
    });
  }
  clear() {
    this.update({ ...DEFAULT_CLAIM_QUERY });
  }
  retry() {
    this.retry$.next();
  }
}
