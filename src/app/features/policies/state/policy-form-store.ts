import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store';
import { PolicyApi } from '../data-access/policy-api';
import {
  createPolicyForm,
  restorePolicy,
  selectProduct,
  serializePolicy,
} from '../forms/policy-form-factory';
import { Policy } from '../models/policy';
import { DraftRequest, premiumEstimate } from '../models/policy-form';
@Injectable()
export class PolicyFormStore {
  private readonly api = inject(PolicyApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStore);
  private readonly creationKey = crypto.randomUUID();
  private pendingCreation: DraftRequest | null = null;
  private readonly load$ = new Subject<string>();
  readonly form = createPolicyForm();
  readonly currentStep = signal(0);
  readonly selectedPolicy = signal<Policy | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly submitting = signal(false);
  readonly discarding = signal(false);
  readonly error = signal('');
  readonly initialized = signal(false);
  readonly savedAt = signal('');
  readonly submitted = signal(false);
  readonly snapshot = signal(serializePolicy(this.form));
  private readonly savedSnapshot = signal(JSON.stringify(this.snapshot()));
  readonly dirty = computed(() => JSON.stringify(this.snapshot()) !== this.savedSnapshot());
  readonly busy = computed(() => this.saving() || this.submitting() || this.discarding());
  readonly selectedType = computed(() => this.snapshot().insuranceType);
  readonly premium = computed(() =>
    premiumEstimate(this.selectedType(), this.snapshot().coverage.options),
  );
  readonly draftStatus = computed(() =>
    this.submitted()
      ? 'Submitted for approval'
      : this.dirty()
        ? 'Unsaved changes'
        : this.selectedPolicy()
          ? 'Draft saved'
          : 'New draft',
  );
  readonly admin = this.auth.role() === 'ADMIN';
  constructor() {
    if (this.admin) {
      this.form.controls.agentId.setValidators(Validators.required);
      this.form.controls.agentId.updateValueAndValidity({ emitEvent: false });
    }
    selectProduct(this.form, 'Third Party');
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      selectProduct(this.form, this.form.controls.product.controls.insuranceType.value);
      this.snapshot.set(serializePolicy(this.form));
    });
    this.load$
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.error.set('');
          this.initialized.set(false);
          return this.api.get(id).pipe(
            catchError((error: unknown) => {
              this.error.set(formError(error));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((policy) => {
        this.loading.set(false);
        if (!policy) return;
        if (policy.status !== 'DRAFT') {
          this.error.set(
            'Only DRAFT policies can be edited. Open policy details to review this record.',
          );
          return;
        }
        restorePolicy(this.form, policy);
        this.selectedPolicy.set(policy);
        this.snapshot.set(serializePolicy(this.form));
        this.savedSnapshot.set(JSON.stringify(this.snapshot()));
        this.initialized.set(true);
      });
  }
  initialize(id: string | null) {
    if (!id) {
      this.initialized.set(true);
      return;
    }
    this.load$.next(id);
  }
  setDefaultAgent(id: string) {
    if (!this.admin || this.form.controls.agentId.value || this.selectedPolicy()) return;
    const wasDirty = this.dirty();
    this.form.controls.agentId.setValue(id, { emitEvent: false });
    this.snapshot.set(serializePolicy(this.form));
    if (!wasDirty) this.savedSnapshot.set(JSON.stringify(this.snapshot()));
  }
  next() {
    const groups = [
      this.form.controls.customer,
      this.form.controls.product,
      this.form.controls.coverage,
    ];
    const group = groups[this.currentStep()];
    group?.markAllAsTouched();
    if (this.currentStep() === 2 && this.form.controls.agentId.invalid) {
      this.form.controls.agentId.markAsTouched();
      this.error.set('Select an assigned agent before continuing.');
      return;
    }
    if (!group || group.valid) {
      this.error.set('');
      this.currentStep.update((step) => Math.min(3, step + 1));
    }
  }
  save() {
    if (this.busy() || !this.initialized() || this.submitted()) return;
    this.saving.set(true);
    this.error.set('');
    this.saveRequest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({ error: (error: unknown) => this.error.set(formError(error)) });
  }
  submit() {
    if (this.busy() || !this.initialized() || this.submitted()) return;
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    const groups = [
      this.form.controls.customer,
      this.form.controls.product,
      this.form.controls.coverage,
    ];
    const invalid = groups.findIndex((group) => group.invalid);
    if (invalid >= 0 || this.form.invalid) {
      this.currentStep.set(invalid >= 0 ? invalid : this.form.hasError('primaryInsured') ? 1 : 2);
      this.error.set(
        this.form.hasError('primaryInsured')
          ? 'The primary customer cannot also be an additional insured person.'
          : 'Complete the highlighted fields before submitting.',
      );
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.saveRequest()
      .pipe(
        switchMap((policy) => this.api.submit(policy.id, policy.version ?? 1)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (policy) => {
          this.selectedPolicy.set(policy);
          this.submitted.set(true);
          this.submitting.set(false);
          this.savedSnapshot.set(JSON.stringify(this.snapshot()));
          void this.router.navigate(['/policies', policy.id]);
        },
        error: (error: unknown) => this.error.set(formError(error)),
      });
  }
  discard() {
    if (this.busy() || !this.initialized() || this.submitted()) return;
    this.discarding.set(true);
    this.error.set('');
    const policy = this.selectedPolicy();
    (policy ? this.api.discard(policy.id, policy.version ?? 1) : of(undefined))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.discarding.set(false)),
      )
      .subscribe({
        next: () => {
          this.discarding.set(false);
          this.savedSnapshot.set(JSON.stringify(this.snapshot()));
          void this.router.navigate(['/policies']);
        },
        error: (error: unknown) => this.error.set(formError(error)),
      });
  }
  private saveRequest() {
    const payload = serializePolicy(this.form);
    const serialized = JSON.stringify(payload);
    const policy = this.selectedPolicy();
    const creationPayload = this.pendingCreation ?? payload;
    if (!policy) this.pendingCreation = creationPayload;
    const request = policy
      ? this.api.update(policy.id, { ...payload, version: policy.version ?? 1 })
      : this.api.create(creationPayload, this.creationKey).pipe(
          switchMap((created) => {
            // A timed-out create may have succeeded. Recover its ID before saving later edits.
            this.selectedPolicy.set(created);
            return JSON.stringify(creationPayload) === serialized
              ? of(created)
              : this.api.update(created.id, { ...payload, version: created.version ?? 1 });
          }),
        );
    return request.pipe(
      tap((saved) => {
        this.pendingCreation = null;
        this.selectedPolicy.set(saved);
        this.savedSnapshot.set(serialized);
        this.savedAt.set(saved.updatedAt);
        this.form.markAsPristine();
        // Keep this component and current step; refresh can restore the newly created draft.
        if (!policy && !this.route.snapshot.paramMap.has('id'))
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { draft: saved.id },
            replaceUrl: true,
          });
      }),
    );
  }
}
function formError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) return 'You do not have permission to modify this draft.';
    if (error.status === 404) return 'Policy not found.';
    if (error.status === 409)
      return 'This draft changed or was already submitted. Reload the draft before continuing.';
    const body: unknown = error.error;
    if (
      error.status === 422 &&
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof body.message === 'string'
    )
      return body.message;
  }
  return 'The request failed. Your entered data is preserved. Please try again.';
}
