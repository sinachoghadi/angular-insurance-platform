import { createRequestState } from '../../../core/http/request-state';
import { apiError } from '../../../core/http/api-error';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Validators } from '@angular/forms';
import { Subject, catchError, of, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { UsersApi } from '../../users/data-access/users-api';
import { User } from '../../../shared/models/user';
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
  private readonly usersApi = inject(UsersApi);
  private readonly agentReload$ = new Subject<void>();
  private readonly agentsRequest = createRequestState();
  private readonly agentsState = signal<readonly User[]>([]);
  readonly agents = this.agentsState.asReadonly();
  readonly agentLoading = this.agentsRequest.loading;
  readonly agentRequestStatus = this.agentsRequest.status;
  readonly agentFailure = this.agentsRequest.error;
  readonly agentError = computed(
    () =>
      this.agentFailure() !== null ||
      (this.agentRequestStatus() === 'success' && !this.agents().length),
  );
  readonly agentName = computed(
    () =>
      this.agents().find((a) => a.id === this.snapshot().agentId)?.name ??
      this.selectedPolicy()?.agentName ??
      'Your agent account',
  );
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStore);
  private readonly creationKey = crypto.randomUUID();
  private readonly contextChanged$ = new Subject<void>();
  private pendingCreation: DraftRequest | null = null;
  private readonly load$ = new Subject<string | null>();
  private loadingId: string | null = null;
  readonly form = createPolicyForm();
  private readonly currentStepState = signal(0);
  readonly currentStep = this.currentStepState.asReadonly();
  private readonly selectedPolicyState = signal<Policy | null>(null);
  readonly selectedPolicy = this.selectedPolicyState.asReadonly();
  private readonly loadRequest = createRequestState();
  readonly loading = this.loadRequest.loading;
  readonly loadRequestStatus = this.loadRequest.status;
  readonly loadRequestFailure = this.loadRequest.error;
  private readonly saveOperation = createRequestState();
  readonly saving = this.saveOperation.loading;
  readonly saveOperationStatus = this.saveOperation.status;
  readonly saveOperationFailure = this.saveOperation.error;
  private readonly submitOperation = createRequestState();
  readonly submitting = this.submitOperation.loading;
  readonly submitOperationStatus = this.submitOperation.status;
  readonly submitOperationFailure = this.submitOperation.error;
  private readonly discardOperation = createRequestState();
  readonly discarding = this.discardOperation.loading;
  readonly discardOperationStatus = this.discardOperation.status;
  readonly discardOperationFailure = this.discardOperation.error;
  private readonly errorState = signal('');
  readonly error = this.errorState.asReadonly();
  private readonly initializedState = signal(false);
  readonly initialized = this.initializedState.asReadonly();
  private readonly savedAtState = signal('');
  readonly savedAt = this.savedAtState.asReadonly();
  private readonly submittedState = signal(false);
  readonly submitted = this.submittedState.asReadonly();
  private readonly snapshotState = signal(serializePolicy(this.form));
  readonly snapshot = this.snapshotState.asReadonly();
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
    this.form.controls.product.controls.insuranceType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => selectProduct(this.form, type));
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.snapshotState.set(serializePolicy(this.form));
    });
    if (this.admin)
      this.agentReload$
        .pipe(
          startWith(undefined),
          switchMap(() =>
            this.agentsRequest.track(this.usersApi.getUsers()).pipe(catchError(() => of(null))),
          ),
          takeUntilDestroyed(),
        )
        .subscribe((users) => {
          if (!users) return;
          const agents = users.filter((u) => u.role === 'AGENT');
          this.agentsState.set(agents);
          if (agents[0]) this.setDefaultAgent(agents[0].id);
        });
    this.load$
      .pipe(
        switchMap((id) => {
          if (id === null) {
            this.loadRequest.reset();
            this.initializedState.set(true);
            return of(null);
          }
          this.errorState.set('');
          this.initializedState.set(false);
          return this.loadRequest.track(this.api.get(id)).pipe(
            catchError((error: unknown) => {
              this.errorState.set(formError(error));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((policy) => {
        if (!policy) return;
        if (policy.status !== 'DRAFT') {
          this.errorState.set(
            'Only DRAFT policies can be edited. Open policy details to review this record.',
          );
          return;
        }
        restorePolicy(this.form, policy);
        this.selectedPolicyState.set(policy);
        this.snapshotState.set(serializePolicy(this.form));
        this.savedSnapshot.set(JSON.stringify(this.snapshot()));
        this.initializedState.set(true);
      });
  }
  initialize(id: string | null): void {
    if (id !== null && this.loading() && this.loadingId === id) return;
    this.contextChanged$.next();
    this.loadingId = id;
    this.load$.next(id);
  }
  loadAgents(): void {
    if (this.admin && !this.agentLoading()) this.agentReload$.next();
  }
  setDefaultAgent(id: string) {
    if (!this.admin || this.form.controls.agentId.value || this.selectedPolicy()) return;
    const wasDirty = this.dirty();
    this.form.controls.agentId.setValue(id, { emitEvent: false });
    this.snapshotState.set(serializePolicy(this.form));
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
      this.errorState.set('Select an assigned agent before continuing.');
      return;
    }
    if (!group || group.valid) {
      this.errorState.set('');
      this.currentStepState.update((step) => Math.min(3, step + 1));
    }
  }
  setStep(step: number): void {
    if (!Number.isInteger(step) || step < 0 || step > 3 || this.busy()) return;
    this.currentStepState.set(step);
  }
  save() {
    if (this.busy() || !this.initialized() || this.submitted()) return;
    this.errorState.set('');
    this.saveOperation
      .track(this.saveRequest())
      .pipe(takeUntil(this.contextChanged$), takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: (error: unknown) => this.errorState.set(formError(error)) });
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
      this.currentStepState.set(
        invalid >= 0 ? invalid : this.form.hasError('primaryInsured') ? 1 : 2,
      );
      this.errorState.set(
        this.form.hasError('primaryInsured')
          ? 'The primary customer cannot also be an additional insured person.'
          : 'Complete the highlighted fields before submitting.',
      );
      return;
    }
    this.errorState.set('');
    this.submitOperation
      .track(
        this.saveRequest().pipe(
          switchMap((policy) => this.api.submit(policy.id, policy.version ?? 1)),
        ),
      )
      .pipe(takeUntil(this.contextChanged$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (policy) => {
          this.selectedPolicyState.set(policy);
          this.submittedState.set(true);
          this.savedSnapshot.set(JSON.stringify(this.snapshot()));
          void this.router.navigate(['/policies', policy.id]);
        },
        error: (error: unknown) => this.errorState.set(formError(error)),
      });
  }
  discard() {
    if (this.busy() || !this.initialized() || this.submitted()) return;
    this.errorState.set('');
    const policy = this.selectedPolicy();
    this.discardOperation
      .track(policy ? this.api.discard(policy.id, policy.version ?? 1) : of(undefined))
      .pipe(takeUntil(this.contextChanged$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savedSnapshot.set(JSON.stringify(this.snapshot()));
          void this.router.navigate(['/policies']);
        },
        error: (error: unknown) => this.errorState.set(formError(error)),
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
            this.selectedPolicyState.set(created);
            return JSON.stringify(creationPayload) === serialized
              ? of(created)
              : this.api.update(created.id, { ...payload, version: created.version ?? 1 });
          }),
        );
    return request.pipe(
      tap((saved) => {
        this.pendingCreation = null;
        this.selectedPolicyState.set(saved);
        this.savedSnapshot.set(serialized);
        this.savedAtState.set(saved.updatedAt);
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
  const failure = apiError(error);
  if (failure.status === 403) return 'You do not have permission to modify this draft.';
  if (failure.status === 404) return 'Policy not found.';
  if (failure.status === 409)
    return 'This draft changed or was already submitted. Reload the draft before continuing.';
  return failure.message + ' Your entered data is preserved.';
}
