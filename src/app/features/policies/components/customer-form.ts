import { Component, input } from '@angular/core';
import { PolicyForm } from '../forms/policy-form-factory';
import { PolicyField } from './policy-field';
@Component({
  selector: 'app-customer-form',
  imports: [PolicyField],
  template: `<p>
      Use fictional data only. Customer identifiers are needed to prepare this demo policy.
    </p>
    <div class="field-grid">
      <app-policy-field label="Full name" [control]="group().controls.fullName" /><app-policy-field
        label="National ID"
        hint="10 digits · Format validation only"
        [control]="group().controls.nationalId"
      /><app-policy-field
        label="Mobile number"
        type="tel"
        hint="Iranian format: 09xxxxxxxxx"
        [control]="group().controls.mobile"
      /><app-policy-field
        label="Date of birth"
        type="date"
        [max]="today"
        [control]="group().controls.dateOfBirth"
      /><app-policy-field
        label="Email (optional)"
        type="email"
        [control]="group().controls.email"
      />
    </div>`,
  styleUrl: './policy-form-fields.scss',
})
export class CustomerForm {
  readonly group = input.required<PolicyForm['controls']['customer']>();
  readonly today = new Date().toISOString().slice(0, 10);
}
