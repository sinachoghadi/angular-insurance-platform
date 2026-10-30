import { AbstractControl, ValidatorFn } from '@angular/forms';
export const nationalId: ValidatorFn = (control) =>
  !control.value || /^\d{10}$/.test(String(control.value)) ? null : { nationalId: true };
export const mobile: ValidatorFn = (control) =>
  !control.value || /^09\d{9}$/.test(String(control.value)) ? null : { mobile: true };
export const validDate: ValidatorFn = (control) => {
  const value: unknown = control.value;
  if (!value) return null;
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
    ? null
    : { date: true };
};
export const notFuture: ValidatorFn = (control) =>
  validDate(control) ||
  (control.value && control.value > new Date().toISOString().slice(0, 10)
    ? { future: true }
    : null);
export const integer: ValidatorFn = (control) =>
  control.value === null || control.value === '' || Number.isInteger(control.value)
    ? null
    : { integer: true };
export const dateRange: ValidatorFn = (group) => {
  const start: unknown = group.get('startDate')?.value;
  const end: unknown = group.get('endDate')?.value;
  return typeof start === 'string' && typeof end === 'string' && start && end && end <= start
    ? { dateRange: true }
    : null;
};
export function listRules(control: AbstractControl): ReturnType<ValidatorFn> {
  const type: unknown = control.get('insuranceType')?.value;
  if (type === 'Life') {
    const values = control.get('life.beneficiaries')?.value as {
      share: number | null;
      nationalId: string;
    }[];
    if (!values.length || values.reduce((sum, b) => sum + (b.share ?? 0), 0) !== 100)
      return { shares: true };
    if (new Set(values.map((b) => b.nationalId)).size !== values.length)
      return { duplicates: true };
  }
  if (type === 'Health') {
    const values = control.get('health.additionalPersons')?.value as { nationalId: string }[];
    if (control.get('health.insuredPersons')?.value !== values.length + 1)
      return { insuredCount: true };
    if (new Set(values.map((b) => b.nationalId)).size !== values.length)
      return { duplicates: true };
  }
  return null;
}
export const primaryInsuredUnique: ValidatorFn = (form) => {
  if (form.get('product.insuranceType')?.value !== 'Health') return null;
  const national: unknown = form.get('customer.nationalId')?.value;
  const persons = form.get('product.health.additionalPersons')?.value as { nationalId: string }[];
  return national && persons.some((p) => p.nationalId === national)
    ? { primaryInsured: true }
    : null;
};
