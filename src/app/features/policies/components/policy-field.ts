import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
@Component({
  selector: 'app-policy-field',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatError, MatHint, MatInput],
  template: `<mat-form-field
    ><mat-label>{{ label() }}</mat-label>
    @if (type() === 'number') {
      <input matInput type="number" [formControl]="control()" />
    } @else {
      <input matInput [type]="type()" [formControl]="control()" [attr.max]="max() || null" />
    }
    @if (hint()) {
      <mat-hint>{{ hint() }}</mat-hint>
    }
    <mat-error>{{ message() }}</mat-error></mat-form-field
  >`,
  styles: [':host, mat-form-field { display:block; width:100%; min-width:0; }'],
})
export class PolicyField {
  readonly control = input.required<FormControl<string> | FormControl<number | null>>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'date' | 'tel' | 'number'>('text');
  readonly hint = input('');
  readonly max = input('');
  message() {
    const c = this.control();
    if (c.hasError('required') || c.hasError('pattern')) return 'This field is required.';
    if (c.hasError('nationalId')) return 'Enter exactly 10 digits.';
    if (c.hasError('mobile')) return 'Enter 11 digits starting with 09.';
    if (c.hasError('email')) return 'Enter a valid email address.';
    if (c.hasError('future')) return 'Date of birth cannot be in the future.';
    if (c.hasError('date')) return 'Enter a valid date.';
    if (c.hasError('integer')) return 'Enter a whole number.';
    if (c.hasError('min')) return `Minimum value: ${c.getError('min').min}`;
    if (c.hasError('max')) return `Maximum value: ${c.getError('max').max}`;
    if (c.hasError('minlength')) return 'Enter at least 3 characters.';
    return 'Value is too long.';
  }
}
