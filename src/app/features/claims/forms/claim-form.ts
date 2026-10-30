import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Policy } from '../../policies/models/policy';
import { ClaimType } from '../models/claim';
import { validDate } from '../models/claim-query';
export const incidentDate: ValidatorFn = (c) =>
  !c.value || (validDate(c.value) && c.value <= new Date().toISOString().slice(0, 10))
    ? null
    : { incidentDate: true };
export const claimMoney: ValidatorFn = (c) =>
  c.value === null ||
  (typeof c.value === 'number' &&
    Number.isFinite(c.value) &&
    c.value > 0 &&
    c.value <= 1e12 &&
    Math.abs(c.value * 100 - Math.round(c.value * 100)) < 0.001)
    ? null
    : { money: true };
export const descriptionRule: ValidatorFn = (c) =>
  typeof c.value === 'string' && c.value.trim().length >= 10 && c.value.trim().length <= 2000
    ? null
    : { description: true };
export function createClaimForm(selectedPolicy: () => Policy | null) {
  return new FormGroup(
    {
      policyId: new FormControl('', { nonNullable: true, validators: Validators.required }),
      incidentDate: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, incidentDate],
      }),
      claimType: new FormControl<ClaimType>('Accident', {
        nonNullable: true,
        validators: Validators.required,
      }),
      description: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, descriptionRule],
      }),
      estimatedAmount: new FormControl<number | null>(null, [Validators.required, claimMoney]),
    },
    {
      validators: (group) => {
        const policy = selectedPolicy(),
          date: unknown = group.get('incidentDate')?.value;
        if (!policy || policy.status !== 'ACTIVE' || group.get('policyId')?.value !== policy.id)
          return { policy: true };
        return typeof date === 'string' &&
          date &&
          (date < policy.startDate || date > policy.endDate)
          ? { coverage: true }
          : null;
      },
    },
  );
}
