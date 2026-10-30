import { Component, input } from '@angular/core';
import { ClaimStatus } from '../models/claim';
@Component({
  selector: 'app-claim-status-badge',
  template: '<span [attr.data-status]="status()">{{status().replaceAll("_", " ")}}</span>',
  styles: [
    `
      span {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        background: var(--mat-sys-surface-container-high);
        color: var(--mat-sys-on-surface);
      }
      [data-status='APPROVED'] {
        background: #d9f5e5;
        color: #165736;
      }
      [data-status='REJECTED'] {
        background: #ffdad6;
        color: #93000a;
      }
      [data-status='UNDER_REVIEW'] {
        background: #fff0c2;
        color: #614900;
      }
    `,
  ],
})
export class ClaimStatusBadge {
  readonly status = input.required<ClaimStatus>();
}
