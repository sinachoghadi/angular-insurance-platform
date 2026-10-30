import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { parseQuery } from '../../models/policy-query';
import { AuthStore } from '../../../../core/auth/auth-store';
import { PolicyStatusBadge } from '../../components/policy-status-badge';
import { PolicyReview } from '../../components/policy-review';
import { PolicyDetailsStore } from '../../state/policy-details-store';
@Component({
  selector: 'app-policy-details',
  providers: [PolicyDetailsStore],
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatProgressBar,
    PageHeader,
    PolicyStatusBadge,
    PolicyReview,
  ],
  templateUrl: './policy-details.html',
  styleUrl: './policy-details.scss',
})
export class PolicyDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(PolicyDetailsStore);
  readonly backQuery = parseQuery(
    this.route.snapshot.queryParamMap,
    inject(AuthStore).role() === 'ADMIN',
  );
  readonly policy = this.store.policy;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly retryable = this.store.retryable;
  retry(): void {
    this.store.retry();
  }
}
