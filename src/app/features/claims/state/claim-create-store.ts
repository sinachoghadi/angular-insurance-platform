import { createRequestState } from '../../../core/http/request-state';
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
  of,
  map,
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
  private readonly selectedPolicyState = signal<Policy | null>(null);
  readonly selectedPolicy = this.selectedPolicyState.asReadonly();
  readonly form = createClaimForm(() => this.selectedPolicy());
  readonly search = new FormControl('', { nonNullable: true });
  private readonly policyPageState = signal<PolicyPage>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  readonly policyPage = this.policyPageState.asReadonly();
  private readonly policyRequest = createRequestState();
  readonly policyLoading = this.policyRequest.loading;
  readonly policyRequestStatus = this.policyRequest.status;
  readonly policyRequestFailure = this.policyRequest.error;
  readonly policyError = computed(() => this.policyRequest.error() !== null);
  private readonly createRequest = createRequestState();
  readonly saving = this.createRequest.loading;
  readonly createRequestStatus = this.createRequest.status;
  readonly createRequestFailure = this.createRequest.error;
  private readonly errorState = signal('');
  readonly error = this.errorState.asReadonly();
  private readonly successState = signal(false);
  readonly success = this.successState.asReadonly();
  private readonly uncertainState = signal(false);
  readonly uncertain = this.uncertainState.asReadonly();
  readonly options = computed(() => {
    const selected = this.selectedPolicy(),
      items = this.policyPage().items;
    return selected && !items.some((p) => p.id === selected.id) ? [selected, ...items] : items;
  });
  constructor() {
    this.search.valueChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.policyQuery$.next({ search, page: 1 }));
    combineLatest([
      this.policyQuery$.pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      ),
      this.refresh$,
    ])
      .pipe(
        switchMap(([{ search, page }]) => {
          return this.policyRequest
            .track(
              this.policies.list({
                ...DEFAULT_QUERY,
                status: 'ACTIVE',
                search,
                page,
                pageSize: 10,
              }),
            )
            .pipe(
              catchError(() => {
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        if (page) this.policyPageState.set(page);
      });
  }
  select(id: string) {
    this.selectedPolicyState.set(this.options().find((p) => p.id === id) ?? null);
    this.form.controls.policyId.setValue(id);
    this.form.updateValueAndValidity();
  }
  policyPageChange(page: number) {
    this.policyQuery$.next({ ...this.policyQuery$.value, page });
  }
  retryPolicies() {
    if (!this.policyLoading()) this.refresh$.next(this.refresh$.value + 1);
  }
  submit() {
    if (this.saving() || this.success()) return;
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.errorState.set('Complete the highlighted fields and select an eligible policy.');
      return;
    }
    const value = this.form.getRawValue();
    this.pending ??= {
      ...value,
      description: value.description.trim(),
      estimatedAmount: value.estimatedAmount!,
    };
    this.errorState.set('');
    this.createRequest
      .track(this.api.create(this.pending, this.key))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.successState.set(true);
          this.uncertainState.set(false);
          this.snack.open('Claim submitted successfully.', 'Dismiss', { duration: 5000 });
          void this.router.navigate(['/claims', claim.id]);
        },
        error: (error: unknown) => {
          this.uncertainState.set(
            this.createRequest.error()?.kind === 'network' ||
              this.createRequest.error()?.kind === 'server',
          );
          if (!this.uncertain()) this.pending = null;
          this.errorState.set(
            this.uncertain()
              ? 'Submission outcome is uncertain. Retry the unchanged report to recover the result.'
              : claimError(error),
          );
        },
      });
  }
}
