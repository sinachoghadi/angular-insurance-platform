import { Component, effect, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CLAIM_STATUSES, CLAIM_TYPES } from '../models/claim';
import { ClaimQuery } from '../models/claim-query';
@Component({
  selector: 'app-claim-filters',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSelect, MatOption, MatButton],
  template: `<div class="filters" [formGroup]="form">
    <mat-form-field
      ><mat-label>Search claims</mat-label
      ><input
        matInput
        formControlName="search"
        placeholder="Claim, policy number or customer" /></mat-form-field
    ><mat-form-field
      ><mat-label>Status</mat-label
      ><mat-select formControlName="status"
        ><mat-option value="">All statuses</mat-option>
        @for (status of statuses; track status) {
          <mat-option [value]="status">{{ status.replaceAll('_', ' ') }}</mat-option>
        }
      </mat-select></mat-form-field
    ><mat-form-field
      ><mat-label>Claim type</mat-label
      ><mat-select formControlName="claimType"
        ><mat-option value="">All types</mat-option>
        @for (type of types; track type) {
          <mat-option [value]="type">{{ type }}</mat-option>
        }
      </mat-select></mat-form-field
    ><mat-form-field
      ><mat-label>Incident date from</mat-label
      ><input matInput type="date" formControlName="dateFrom" /></mat-form-field
    ><mat-form-field
      ><mat-label>Incident date to</mat-label
      ><input matInput type="date" formControlName="dateTo" /></mat-form-field
    ><button mat-button (click)="clear.emit()">Clear filters</button>
  </div>`,
  styles: [
    `
      .filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
        gap: 12px;
        padding: 20px;
      }
      mat-form-field {
        width: 100%;
        min-width: 0;
      }
      button {
        align-self: center;
      }
    `,
  ],
})
export class ClaimFilters {
  readonly query = input.required<ClaimQuery>();
  readonly change = output<Partial<ClaimQuery>>();
  readonly clear = output<void>();
  readonly statuses = CLAIM_STATUSES;
  readonly types = CLAIM_TYPES;
  readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    claimType: new FormControl('', { nonNullable: true }),
    dateFrom: new FormControl('', { nonNullable: true }),
    dateTo: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    effect(() => this.form.patchValue(this.query(), { emitEvent: false }));
    this.form.controls.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a === b && b.trim() === this.query().search),
        takeUntilDestroyed(),
      )
      .subscribe((search) => {
        if (search === this.form.controls.search.value && search.trim() !== this.query().search)
          this.change.emit({ search: search.trim() });
      });
    for (const key of ['status', 'claimType', 'dateFrom', 'dateTo'] as const)
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe((value) =>
          this.change.emit({ [key]: value, search: this.form.controls.search.value.trim() }),
        );
  }
}
