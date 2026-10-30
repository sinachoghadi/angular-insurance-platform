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
import { Policy } from '../models/policy';
import { PolicyQuery } from '../models/policy-query';
import { PolicyStatusBadge } from './policy-status-badge';
@Component({
  selector: 'app-policy-table',
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
    PolicyStatusBadge,
  ],
  template: ` <div class="table-region" role="region" aria-label="Policies table" tabindex="0">
    <table
      mat-table
      [dataSource]="items()"
      matSort
      [matSortActive]="query().sortBy"
      [matSortDirection]="query().sortOrder"
      [matSortDisableClear]="true"
      (matSortChange)="sort.emit($event)"
    >
      <ng-container matColumnDef="policyNumber"
        ><th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header
          sortActionDescription="Sort by policy number"
        >
          Policy number
        </th>
        <td mat-cell *matCellDef="let p">
          <a [routerLink]="['/policies', p.id]" [queryParams]="query()">{{ p.policyNumber }}</a>
        </td></ng-container
      >
      <ng-container matColumnDef="customer"
        ><th mat-header-cell *matHeaderCellDef>Customer</th>
        <td mat-cell *matCellDef="let p">{{ p.customerName }}</td></ng-container
      >
      <ng-container matColumnDef="type"
        ><th mat-header-cell *matHeaderCellDef>Insurance type</th>
        <td mat-cell *matCellDef="let p">{{ p.insuranceType }}</td></ng-container
      >
      <ng-container matColumnDef="premium"
        ><th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header
          sortActionDescription="Sort by premium"
        >
          Premium
        </th>
        <td mat-cell *matCellDef="let p">{{ p.premium | currency: 'USD' }}</td></ng-container
      >
      <ng-container matColumnDef="startDate"
        ><th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header
          sortActionDescription="Sort by start date"
        >
          Start date
        </th>
        <td mat-cell *matCellDef="let p">
          {{ p.startDate | date: 'mediumDate' : 'UTC' }}
        </td></ng-container
      >
      <ng-container matColumnDef="endDate"
        ><th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header
          sortActionDescription="Sort by end date"
        >
          End date
        </th>
        <td mat-cell *matCellDef="let p">
          {{ p.endDate | date: 'mediumDate' : 'UTC' }}
        </td></ng-container
      >
      <ng-container matColumnDef="status"
        ><th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let p"><app-policy-status-badge [status]="p.status" /></td
      ></ng-container>
      <ng-container matColumnDef="agent"
        ><th mat-header-cell *matHeaderCellDef>Assigned agent</th>
        <td mat-cell *matCellDef="let p">{{ p.agentName }}</td></ng-container
      >
      <ng-container matColumnDef="createdAt"
        ><th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header
          sortActionDescription="Sort by creation date"
        >
          Created
        </th>
        <td mat-cell *matCellDef="let p">
          {{ p.createdAt | date: 'mediumDate' : 'UTC' }}
        </td></ng-container
      >
      <ng-container matColumnDef="actions"
        ><th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let p">
          <a
            mat-button
            [routerLink]="['/policies', p.id]"
            [queryParams]="query()"
            [attr.aria-label]="'View ' + p.policyNumber"
            >View</a
          >
          @if (p.status === 'DRAFT') {
            <a
              mat-button
              [routerLink]="['/policies', p.id, 'edit']"
              [attr.aria-label]="'Edit draft ' + p.policyNumber"
              >Edit Draft</a
            >
          }
        </td></ng-container
      >
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>
  </div>`,
  styles: [
    `
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
      :host {
        display: block;
        min-width: 0;
      }
    `,
  ],
})
export class PolicyTable {
  readonly items = input.required<Policy[]>();
  readonly query = input.required<PolicyQuery>();
  readonly sort = output<Sort>();
  readonly columns = [
    'policyNumber',
    'customer',
    'type',
    'premium',
    'startDate',
    'endDate',
    'status',
    'agent',
    'createdAt',
    'actions',
  ];
}
