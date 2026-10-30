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
  tap,
} from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store';
import { PolicyApi } from '../data-access/policy-api';
import { PolicyPage } from '../models/policy';
import { DEFAULT_QUERY, parseQuery, PolicyQuery } from '../models/policy-query';
@Injectable()
export class PolicyStore {
  private readonly api = inject(PolicyApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly retry$ = new Subject<void>();
  readonly query = signal<PolicyQuery>(DEFAULT_QUERY);
  readonly result = signal<PolicyPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly empty = computed(() => !this.loading() && !this.error() && this.result().total === 0);
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
      this.retry$.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(([query]) => {
          this.query.set(query);
        }),
        switchMap(([query]) => {
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
  update(patch: Partial<PolicyQuery>, reset = true, replaceUrl = false) {
    const query = { ...this.query(), ...(reset ? { page: 1 } : {}), ...patch };
    void this.router.navigate([], { relativeTo: this.route, queryParams: query, replaceUrl });
  }
  clear() {
    this.update({ ...DEFAULT_QUERY });
  }
  retry() {
    this.retry$.next();
  }
}
