import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatStepper, MatStep, MatStepLabel } from '@angular/material/stepper';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Viewport } from '../../../../core/services/viewport';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { distinctUntilChanged, map } from 'rxjs';
import { CustomerForm } from '../../components/customer-form';
import { ProductForm } from '../../components/product-form';
import { CoverageForm } from '../../components/coverage-form';
import { PolicyReview } from '../../components/policy-review';
import { DraftConfirm } from '../../components/draft-confirm';
import { PolicyFormStore } from '../../state/policy-form-store';
@Component({
  selector: 'app-policy-form-page',
  providers: [PolicyFormStore],
  imports: [
    RouterLink,
    MatButton,
    MatStepper,
    MatStep,
    MatStepLabel,
    MatProgressBar,
    CurrencyPipe,
    DatePipe,
    PageHeader,
    CustomerForm,
    ProductForm,
    CoverageForm,
    PolicyReview,
  ],
  templateUrl: './policy-form-page.html',
  styleUrl: './policy-form-page.scss',
})
export class PolicyFormPage {
  readonly store = inject(PolicyFormStore);
  readonly viewport = inject(Viewport);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly agents = this.store.agents;
  readonly agentError = this.store.agentError;
  readonly agentName = this.store.agentName;
  private id: string | null = null;
  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? this.route.snapshot.queryParamMap.get('draft')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.id = id;
        this.store.initialize(id);
      });
  }
  loadAgents() {
    this.store.loadAgents();
  }
  retry() {
    this.store.initialize(this.id);
  }
  discard() {
    this.dialog
      .open(DraftConfirm, {
        data: {
          title: 'Discard this draft?',
          message: 'The saved draft and unsaved changes will be permanently removed.',
          action: 'Discard draft',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) this.store.discard();
      });
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.store.dirty() || this.store.busy()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
