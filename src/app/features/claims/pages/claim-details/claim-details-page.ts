import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ClaimDetailsStore } from '../../state/claim-details-store';
import { ClaimStatus, ClaimTransitionRequest } from '../../models/claim';
import { parseClaimQuery } from '../../models/claim-query';
import { ClaimStatusBadge } from '../../components/claim-status-badge';
import { ClaimHistory } from '../../components/claim-history';
import { ClaimReviewNotes } from '../../components/claim-review-notes';
import {
  ClaimTransitionDialog,
  TransitionDialogData,
} from '../../components/claim-transition-dialog';
import { TRANSITION_LABELS } from '../../utils/claim-transitions';
@Component({
  selector: 'app-claim-details',
  providers: [ClaimDetailsStore],
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatProgressBar,
    PageHeader,
    ClaimStatusBadge,
    ClaimHistory,
    ClaimReviewNotes,
  ],
  templateUrl: './claim-details-page.html',
  styleUrl: './claim-details-page.scss',
})
export class ClaimDetailsPage {
  readonly store = inject(ClaimDetailsStore);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly backQuery = parseClaimQuery(inject(ActivatedRoute).snapshot.queryParamMap);
  readonly labels = TRANSITION_LABELS;
  confirm(target: ClaimStatus) {
    const claim = this.store.claim();
    if (!claim || this.store.busy() || !this.store.transitions().includes(target)) return;
    this.dialog
      .open<ClaimTransitionDialog, TransitionDialogData, ClaimTransitionRequest>(
        ClaimTransitionDialog,
        { data: { claim, target }, width: '520px', maxWidth: '95vw' },
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request) => {
        if (request && this.store.claim()?.id === claim.id) this.store.transition(request);
      });
  }
}
