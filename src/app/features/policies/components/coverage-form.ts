import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { User } from '../../../shared/models/user';
import { PolicyForm } from '../forms/policy-form-factory';
import { COVERAGE_OPTIONS } from '../models/policy-form';
import { PolicyField } from './policy-field';
@Component({
  selector: 'app-coverage-form',
  imports: [ReactiveFormsModule, PolicyField, MatFormField, MatLabel, MatSelect, MatOption],
  template: `<p>Select coverage dates and optional benefits. Dates use the Gregorian calendar.</p>
    <div class="field-grid">
      <app-policy-field
        label="Policy start date"
        type="date"
        [control]="group().controls.startDate"
      /><app-policy-field
        label="Policy end date"
        type="date"
        [control]="group().controls.endDate"
      /><mat-form-field
        ><mat-label>Optional coverage</mat-label
        ><mat-select multiple [formControl]="group().controls.options">
          @for (option of options; track option) {
            <mat-option [value]="option">{{ option }}</mat-option>
          }
        </mat-select></mat-form-field
      >
      @if (admin()) {
        <mat-form-field
          ><mat-label>Assigned agent</mat-label
          ><mat-select [formControl]="agentControl()">
            @for (agent of agents(); track agent.id) {
              <mat-option [value]="agent.id">{{ agent.name }}</mat-option>
            }
          </mat-select></mat-form-field
        >
      }
    </div>
    @if (group().touched && group().hasError('dateRange')) {
      <p class="validation" role="alert">End date must be after start date.</p>
    }`,
  styleUrl: './policy-form-fields.scss',
})
export class CoverageForm {
  readonly group = input.required<PolicyForm['controls']['coverage']>();
  readonly agentControl = input.required<FormControl<string>>();
  readonly admin = input(false);
  readonly agents = input<readonly User[]>([]);
  readonly options = COVERAGE_OPTIONS;
}
