import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { Claim, ClaimStatus, ClaimTransitionRequest } from '../models/claim';
import { claimMoney } from '../forms/claim-form';
import { TRANSITION_LABELS } from '../utils/claim-transitions';
export interface TransitionDialogData {
  claim: Claim;
  target: ClaimStatus;
}
@Component({
  selector: 'app-claim-transition-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatButton,
  ],
  template: `<h2 mat-dialog-title>{{ label }}</h2>
    <form [formGroup]="form" (ngSubmit)="confirm()">
      <mat-dialog-content
        ><p>
          {{ data.claim.claimNumber }}: {{ data.claim.status.replaceAll('_', ' ') }} →
          {{ data.target.replaceAll('_', ' ') }}
        </p>
        <p>This change will be recorded in the claim history.</p>
        @if (data.target === 'APPROVED') {
          <mat-form-field
            ><mat-label>Approved amount (USD)</mat-label
            ><input
              matInput
              type="number"
              min="0.01"
              step="0.01"
              formControlName="approvedAmount"
            /><mat-error
              >Enter a positive amount up to the estimated amount.</mat-error
            ></mat-form-field
          >
        }
        <mat-form-field
          ><mat-label>{{
            data.target === 'REJECTED' ? 'Rejection reason' : 'Workflow note (optional)'
          }}</mat-label
          ><textarea matInput rows="4" maxlength="2000" formControlName="reason"></textarea
          ><mat-hint>Visible to the assigned Agent in status history.</mat-hint
          ><mat-error>Enter a reason of 3–2000 characters.</mat-error></mat-form-field
        ></mat-dialog-content
      ><mat-dialog-actions align="end"
        ><button mat-button type="button" [mat-dialog-close]="undefined">Cancel</button
        ><button mat-flat-button type="submit" [disabled]="form.invalid">
          Confirm {{ label }}
        </button></mat-dialog-actions
      >
    </form>`,
  styles: ['mat-form-field{display:block;width:100%;margin-block:16px}'],
})
export class ClaimTransitionDialog {
  readonly data = inject<TransitionDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<ClaimTransitionDialog, ClaimTransitionRequest>);
  readonly label = TRANSITION_LABELS[this.data.target] ?? this.data.target;
  readonly form = new FormGroup({
    reason: new FormControl('', {
      nonNullable: true,
      validators:
        this.data.target === 'REJECTED'
          ? [
              Validators.required,
              Validators.maxLength(2000),
              (c) =>
                typeof c.value === 'string' && c.value.trim().length >= 3 ? null : { reason: true },
            ]
          : [Validators.maxLength(2000)],
    }),
    approvedAmount: new FormControl<number | null>(
      this.data.claim.estimatedAmount,
      this.data.target === 'APPROVED'
        ? [Validators.required, claimMoney, Validators.max(this.data.claim.estimatedAmount)]
        : [],
    ),
  });
  confirm() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.dialog.close({
      status: this.data.target,
      version: this.data.claim.version,
      reason: value.reason.trim(),
      ...(this.data.target === 'APPROVED' ? { approvedAmount: value.approvedAmount! } : {}),
    });
  }
}
