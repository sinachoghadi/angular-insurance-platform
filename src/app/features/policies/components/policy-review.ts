import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PolicyFormData } from '../models/policy-form';
@Component({
  selector: 'app-policy-review',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './policy-review.html',
  styles: [
    `
      .review {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
        gap: 24px;
      }
      h3 {
        margin-top: 0;
      }
      dt {
        font-size: 13px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 12px;
      }
      dd {
        margin: 4px 0 0;
        overflow-wrap: anywhere;
      }
      .person {
        border-top: 1px solid var(--mat-sys-outline-variant);
        padding-block: 8px;
      }
    `,
  ],
})
export class PolicyReview {
  readonly data = input.required<PolicyFormData>();
  readonly premium = input.required<number>();
  readonly agent = input('');
  readonly vehicle = computed(() => {
    const p = this.data().product;
    return 'plate' in p ? p : null;
  });
  readonly life = computed(() => {
    const p = this.data().product;
    return 'beneficiaries' in p ? p : null;
  });
  readonly fire = computed(() => {
    const p = this.data().product;
    return 'propertyType' in p ? p : null;
  });
  readonly health = computed(() => {
    const p = this.data().product;
    return 'additionalPersons' in p ? p : null;
  });
}
