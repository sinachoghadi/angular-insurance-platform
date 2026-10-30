import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { ClaimHistory as HistoryRecord } from '../models/claim';
import { ClaimStatusBadge } from './claim-status-badge';
@Component({
  selector: 'app-claim-history',
  imports: [DatePipe, ClaimStatusBadge],
  template: `<h2>Status history</h2>
    <ol>
      @for (item of items(); track item.id) {
        <li>
          <div class="transition">
            @if (item.previousStatus) {
              <app-claim-status-badge [status]="item.previousStatus" /> →
            }
            <app-claim-status-badge [status]="item.newStatus" />
          </div>
          <p>{{ item.changedByName }} · {{ item.changedAt | date: 'medium' : 'UTC' }} UTC</p>
          @if (item.note) {
            <p class="note">{{ item.note }}</p>
          }
        </li>
      } @empty {
        <li>No history available.</li>
      }
    </ol>`,
  styles: [
    `
      h2 {
        font-size: 18px;
      }
      ol {
        list-style: none;
        padding-inline-start: 20px;
        border-inline-start: 2px solid var(--mat-sys-outline-variant);
      }
      li {
        padding-block: 10px 20px;
        overflow-wrap: anywhere;
      }
      .transition {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      p {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
      .note {
        white-space: pre-wrap;
      }
    `,
  ],
})
export class ClaimHistory {
  readonly items = input.required<HistoryRecord[]>();
}
