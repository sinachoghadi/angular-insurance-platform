import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { beneficiaryForm, personForm, PolicyForm } from '../forms/policy-form-factory';
import { INSURANCE_TYPES } from '../models/policy';
import { InsuranceType } from '../models/policy-form';
import { PolicyField } from './policy-field';
@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    PolicyField,
  ],
  templateUrl: './product-form.html',
  styleUrl: './policy-form-fields.scss',
})
export class ProductForm {
  readonly group = input.required<PolicyForm['controls']['product']>();
  readonly type = input.required<InsuranceType>();
  readonly types = INSURANCE_TYPES;
  readonly today = new Date().toISOString().slice(0, 10);
  addBeneficiary() {
    const array = this.group().controls.life.controls.beneficiaries;
    if (array.length < 20) {
      array.push(beneficiaryForm());
      array.markAsDirty();
    }
  }
  removeBeneficiary(index: number) {
    const array = this.group().controls.life.controls.beneficiaries;
    array.removeAt(index);
    array.markAsDirty();
  }
  addPerson() {
    const array = this.group().controls.health.controls.additionalPersons;
    if (array.length < 20) {
      array.push(personForm());
      array.markAsDirty();
    }
  }
  removePerson(index: number) {
    const array = this.group().controls.health.controls.additionalPersons;
    array.removeAt(index);
    array.markAsDirty();
  }
}
