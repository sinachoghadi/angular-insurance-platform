import { Component, input } from '@angular/core';
import { Policy } from '../models/policy';
@Component({
  selector: 'app-policy-status-badge',
  template: '<span [attr.data-status]="status()">{{ status() }}</span>',
  styles: [
    `
      span {
        display: inline-block;
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        background: var(--mat-sys-surface-container-high);
        color: var(--mat-sys-on-surface);
      }
      [data-status='ACTIVE'] {
        background: #d9f5e5;
        color: #165736;
      }
      [data-status='REJECTED'] {
        background: #ffdad6;
        color: #93000a;
      }
      [data-status='PENDING'] {
        background: #fff0c2;
        color: #614900;
      }
    `,
  ],
})
export class PolicyStatusBadge {
  readonly status = input.required<Policy['status']>();
}
