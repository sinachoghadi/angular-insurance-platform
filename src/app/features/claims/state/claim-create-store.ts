import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PolicyApi } from '../../policies/data-access/policy-api';
import { DEFAULT_QUERY } from '../../policies/models/policy-query';
import { Policy, PolicyPage } from '../../policies/models/policy';
import { ClaimsApi } from '../data-access/claims-api';
import { createClaimForm } from '../forms/claim-form';
import { CreateClaimRequest } from '../models/claim';
import { claimError } from '../utils/claim-error';
@Injectable()
export class ClaimCreateStore {
  private readonly api = inject(ClaimsApi);
  private readonly policies = inject(PolicyApi);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly key = crypto.randomUUID();
  private readonly policyQuery$ = new BehaviorSubject({ search: '', page: 1 });
  private readonly refresh$ = new BehaviorSubject(0);
  private pending: CreateClaimRequest | null = null;
  readonly selectedPolicy = signal<Policy | null>(null);
  readonly form = createClaimForm(() => this.selectedPolicy());
  readonly search = new FormControl('', { nonNullable: true });
  readonly policyPage = signal<PolicyPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  readonly policyLoading = signal(false);
  readonly policyError = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly uncertain = signal(false);
  readonly options = computed(() => {
    const selected = this.selectedPolicy(),
      items = this.policyPage().items;
    return selected && !items.some((p) => p.id === selected.id) ? [selected, ...items] : items;
  });
  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => this.policyQuery$.next({ search, page: 1 }));
    combineLatest([this.policyQuery$, this.refresh$])
      .pipe(
        switchMap(([{ search, page }]) => {
          this.policyLoading.set(true);
          this.policyError.set(false);
          return this.policies
            .list({ ...DEFAULT_QUERY, status: 'ACTIVE', search, page, pageSize: 10 })
            .pipe(
              catchError(() => {
                this.policyError.set(true);
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.policyLoading.set(false);
        if (page) this.policyPage.set(page);
      });
  }
  select(id: string) {
    this.selectedPolicy.set(this.options().find((p) => p.id === id) ?? null);
    this.form.controls.policyId.setValue(id);
    this.form.updateValueAndValidity();
  }
  policyPageChange(page: number) {
    this.policyQuery$.next({ ...this.policyQuery$.value, page });
  }
  retryPolicies() {
    this.refresh$.next(this.refresh$.value + 1);
  }
  submit() {
    if (this.saving() || this.success()) return;
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.error.set('Complete the highlighted fields and select an eligible policy.');
      return;
    }
    const value = this.form.getRawValue();
    this.pending ??= {
      ...value,
      description: value.description.trim(),
      estimatedAmount: value.estimatedAmount!,
    };
    this.saving.set(true);
    this.error.set('');
    this.api
      .create(this.pending, this.key)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (claim) => {
          this.success.set(true);
          this.uncertain.set(false);
          this.snack.open('Claim submitted successfully.', 'Dismiss', { duration: 5000 });
          void this.router.navigate(['/claims', claim.id]);
        },
        error: (error: unknown) => {
          this.uncertain.set(isUncertain(error));
          if (!this.uncertain()) this.pending = null;
          this.error.set(
            this.uncertain()
              ? 'Submission outcome is uncertain. Retry the unchanged report to recover the result.'
              : claimError(error),
          );
        },
      });
  }
}
function isUncertain(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    (error.status === 0 || error.status >= 500)
  );
}
