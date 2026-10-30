import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { INSURANCE_TYPES, POLICY_STATUSES } from '../models/policy';
import { PolicyQuery } from '../models/policy-query';
import { User } from '../../../shared/models/user';
@Component({
  selector: 'app-policy-filters',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSelect, MatOption, MatButton],
  template: `<div class="filters" [formGroup]="form">
    <mat-form-field
      ><mat-label>Search policies</mat-label
      ><input
        matInput
        formControlName="search"
        placeholder="Policy number, customer or national ID"
    /></mat-form-field>
    <mat-form-field
      ><mat-label>Insurance type</mat-label
      ><mat-select formControlName="insuranceType"
        ><mat-option value="">All types</mat-option>
        @for (type of types; track type) {
          <mat-option [value]="type">{{ type }}</mat-option>
        }
      </mat-select></mat-form-field
    >
    <mat-form-field
      ><mat-label>Status</mat-label
      ><mat-select formControlName="status"
        ><mat-option value="">All statuses</mat-option>
        @for (status of statuses; track status) {
          <mat-option [value]="status">{{ status }}</mat-option>
        }
      </mat-select></mat-form-field
    >
    @if (admin()) {
      <mat-form-field
        ><mat-label>Assigned agent</mat-label
        ><mat-select formControlName="agentId"
          ><mat-option value="">All agents</mat-option>
          @for (agent of agents(); track agent.id) {
            <mat-option [value]="agent.id">{{ agent.name }}</mat-option>
          }
        </mat-select></mat-form-field
      >
    }
    <mat-form-field
      ><mat-label>Start date from</mat-label
      ><input matInput type="date" formControlName="startFrom"
    /></mat-form-field>
    <mat-form-field
      ><mat-label>Start date to</mat-label><input matInput type="date" formControlName="startTo"
    /></mat-form-field>
    <button mat-button (click)="clear.emit()">Clear filters</button>
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
        min-width: 0;
        width: 100%;
      }
      button {
        align-self: center;
      }
    `,
  ],
})
export class PolicyFilters {
  readonly query = input.required<PolicyQuery>();
  readonly admin = input(false);
  readonly agents = input<readonly User[]>([]);
  readonly change = output<Partial<PolicyQuery>>();
  readonly clear = output<void>();
  readonly types = INSURANCE_TYPES;
  readonly statuses = POLICY_STATUSES;
  readonly form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    insuranceType: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    agentId: new FormControl('', { nonNullable: true }),
    startFrom: new FormControl('', { nonNullable: true }),
    startTo: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => this.form.patchValue(this.query(), { emitEvent: false }));
    this.form.controls.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (previous, current) => previous === current && current.trim() === this.query().search,
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((search) => {
        if (search === this.form.controls.search.value && search.trim() !== this.query().search)
          this.change.emit({ search: search.trim() });
      });
    for (const key of ['insuranceType', 'status', 'agentId', 'startFrom', 'startTo'] as const) {
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe((value) => this.change.emit({ [key]: value }));
    }
  }
}
