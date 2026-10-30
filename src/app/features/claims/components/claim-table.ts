import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatCellDef,
  MatHeaderCell,
  MatCell,
  MatHeaderRowDef,
  MatRowDef,
  MatHeaderRow,
  MatRow,
} from '@angular/material/table';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatButton } from '@angular/material/button';
import { Claim } from '../models/claim';
import { ClaimQuery } from '../models/claim-query';
import { ClaimStatusBadge } from './claim-status-badge';
@Component({
  selector: 'app-claim-table',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderCell,
    MatCell,
    MatHeaderRowDef,
    MatRowDef,
    MatHeaderRow,
    MatRow,
    MatSort,
    MatSortHeader,
    MatButton,
    ClaimStatusBadge,
  ],
  templateUrl: './claim-table.html',
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .table-region {
        overflow: auto;
        max-width: 100%;
      }
      table {
        width: 100%;
      }
      td,
      th {
        white-space: nowrap;
      }
      a {
        color: var(--mat-sys-primary);
      }
    `,
  ],
})
export class ClaimTable {
  readonly items = input.required<Claim[]>();
  readonly query = input.required<ClaimQuery>();
  readonly sort = output<Sort>();
  readonly columns = [
    'claimNumber',
    'policyNumber',
    'customerName',
    'incidentDate',
    'estimatedAmount',
    'status',
    'officer',
    'actions',
  ];
}
