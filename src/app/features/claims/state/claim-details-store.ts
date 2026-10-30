import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { createRequestState } from '../../../core/http/request-state';
import { AuthStore } from '../../../core/auth/auth-store';
import { ClaimsApi } from '../data-access/claims-api';
import { Claim, ClaimHistory, ClaimTransitionRequest, ReviewNote } from '../models/claim';
import { CLAIM_TRANSITIONS } from '../utils/claim-transitions';
import { claimError } from '../utils/claim-error';
@Injectable()
export class ClaimDetailsStore {
  private readonly api = inject(ClaimsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snack = inject(MatSnackBar);
  private readonly reload$ = new Subject<void>();
  private readonly read = createRequestState();
  private readonly write = createRequestState();
  private viewEpoch = 0;
  readonly admin = inject(AuthStore).role() === 'ADMIN';
  private readonly claimState = signal<Claim | null>(null);
  readonly claim = this.claimState.asReadonly();
  private readonly historyState = signal<ClaimHistory[]>([]);
  readonly history = this.historyState.asReadonly();
  private readonly notesState = signal<ReviewNote[]>([]);
  readonly notes = this.notesState.asReadonly();
  private readonly successState = signal('');
  readonly success = this.successState.asReadonly();
  private readonly noteSavedState = signal(0);
  readonly noteSaved = this.noteSavedState.asReadonly();
  readonly requestStatus = this.read.status;
  readonly failure = this.read.error;
  readonly loading = this.read.loading;
  readonly error = computed(() => (this.failure() ? claimError(this.failure()!.cause) : ''));
  readonly actionStatus = this.write.status;
  readonly actionFailure = this.write.error;
  readonly busy = this.write.loading;
  readonly actionError = computed(() =>
    this.actionFailure() ? claimError(this.actionFailure()!.cause) : '',
  );
  readonly transitions = computed(() => {
    const claim = this.claim();
    return this.admin && claim ? CLAIM_TRANSITIONS[claim.status] : [];
  });
  constructor() {
    combineLatest([
      this.route.paramMap.pipe(
        map((p) => p.get('id') ?? ''),
        distinctUntilChanged(),
      ),
      this.reload$.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([id]) => {
          this.viewEpoch++;
          this.write.reset();
          this.successState.set('');
          this.claimState.set(null);
          this.historyState.set([]);
          this.notesState.set([]);
          return this.read
            .track(
              forkJoin({
                claim: this.api.get(id),
                history: this.api.history(id),
                notes: this.admin ? this.api.notes(id) : of<ReviewNote[]>([]),
              }),
            )
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        if (data) {
          this.claimState.set(data.claim);
          this.historyState.set(data.history);
          this.notesState.set(data.notes);
        }
      });
  }
  retry(): void {
    if (!this.busy() && !this.loading()) this.reload$.next();
  }
  transition(request: ClaimTransitionRequest): void {
    const claim = this.claim(),
      epoch = this.viewEpoch;
    if (!claim || !this.admin || this.busy()) return;
    this.successState.set('');
    this.write
      .track(
        this.api.transition(claim.id, request).pipe(
          tap((updated) => {
            if (epoch !== this.viewEpoch) return;
            this.claimState.set(updated);
            this.successState.set('Claim status updated successfully.');
            this.snack.open('Claim status updated.', 'Dismiss', { duration: 4000 });
          }),
          switchMap(() => (epoch === this.viewEpoch ? this.api.history(claim.id) : EMPTY)),
        ),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          if (epoch === this.viewEpoch) this.historyState.set(history);
        },
        error: () => {
          /* Lifecycle retains safe UI text and original technical cause. */
        },
      });
  }
  addNote(content: string): void {
    const claim = this.claim(),
      epoch = this.viewEpoch;
    if (!claim || !this.admin || this.busy()) return;
    this.successState.set('');
    this.write
      .track(this.api.addNote(claim.id, content))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (note) => {
          if (epoch !== this.viewEpoch) return;
          this.notesState.update((notes) => [...notes, note]);
          this.noteSavedState.update((n) => n + 1);
          this.successState.set('Internal note saved.');
        },
        error: () => {
          /* The view reads actionFailure; note content is preserved. */
        },
      });
  }
}
