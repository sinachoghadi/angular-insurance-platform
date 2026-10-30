import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Subject,
  catchError,
  combineLatest,
  finalize,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
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
  readonly admin = inject(AuthStore).role() === 'ADMIN';
  readonly claim = signal<Claim | null>(null);
  readonly history = signal<ClaimHistory[]>([]);
  readonly notes = signal<ReviewNote[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly busy = signal(false);
  readonly success = signal('');
  readonly noteSaved = signal(0);
  readonly transitions = computed(() => {
    const claim = this.claim();
    return this.admin && claim ? CLAIM_TRANSITIONS[claim.status] : [];
  });
  constructor() {
    combineLatest([
      this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
      this.reload$.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([id]) => {
          this.loading.set(true);
          this.error.set('');
          this.actionError.set('');
          this.success.set('');
          this.claim.set(null);
          this.history.set([]);
          this.notes.set([]);
          return forkJoin({
            claim: this.api.get(id),
            history: this.api.history(id),
            notes: this.admin ? this.api.notes(id) : of<ReviewNote[]>([]),
          }).pipe(
            catchError((error: unknown) => {
              this.error.set(claimError(error));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.loading.set(false);
        if (data) {
          this.claim.set(data.claim);
          this.history.set(data.history);
          this.notes.set(data.notes);
        }
      });
  }
  retry() {
    if (!this.busy()) this.reload$.next();
  }
  transition(request: ClaimTransitionRequest) {
    const claim = this.claim();
    if (!claim || !this.admin || this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.success.set('');
    this.api
      .transition(claim.id, request)
      .pipe(
        tap((updated) => {
          if (this.claim()?.id !== claim.id) return;
          this.claim.set(updated);
          this.success.set('Claim status updated successfully.');
          this.snack.open('Claim status updated.', 'Dismiss', { duration: 4000 });
        }),
        switchMap(() => this.api.history(claim.id)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (history) => {
          if (this.claim()?.id === claim.id) this.history.set(history);
        },
        error: (error: unknown) => {
          if (this.claim()?.id === claim.id) this.actionError.set(claimError(error));
        },
      });
  }
  addNote(content: string) {
    const claim = this.claim();
    if (!claim || !this.admin || this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.success.set('');
    this.api
      .addNote(claim.id, content)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (note) => {
          if (this.claim()?.id !== claim.id) return;
          this.notes.update((notes) => [...notes, note]);
          this.noteSaved.update((n) => n + 1);
          this.success.set('Internal note saved.');
        },
        error: (error: unknown) => {
          if (this.claim()?.id === claim.id) this.actionError.set(claimError(error));
        },
      });
  }
}
