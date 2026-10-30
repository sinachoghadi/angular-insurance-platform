import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Policy } from '../models/policy';
import { DraftRequest, InsuranceType, PolicyFormData } from '../models/policy-form';
import {
  dateRange,
  integer,
  listRules,
  mobile,
  nationalId,
  notFuture,
  validDate,
  primaryInsuredUnique,
} from './policy-validators';
const requiredText = (max = 250) =>
  new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(max), Validators.pattern(/\S/)],
  });
const amount = () =>
  new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
    Validators.max(1e12),
  ]);
export function beneficiaryForm() {
  return new FormGroup({
    fullName: requiredText(),
    nationalId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nationalId],
    }),
    share: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(100),
    ]),
  });
}
export function personForm() {
  return new FormGroup({
    fullName: requiredText(),
    nationalId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nationalId],
    }),
    dateOfBirth: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notFuture],
    }),
  });
}
export function createPolicyForm() {
  return new FormGroup(
    {
      customer: new FormGroup({
        fullName: new FormControl('', {
          nonNullable: true,
          validators: [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(250),
            Validators.pattern(/\S/),
          ],
        }),
        nationalId: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required, nationalId],
        }),
        mobile: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required, mobile],
        }),
        dateOfBirth: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required, notFuture],
        }),
        email: new FormControl('', {
          nonNullable: true,
          validators: [Validators.email, Validators.maxLength(250)],
        }),
      }),
      product: new FormGroup(
        {
          insuranceType: new FormControl<InsuranceType>('Third Party', {
            nonNullable: true,
            validators: [Validators.required],
          }),
          vehicle: new FormGroup({
            plate: requiredText(),
            model: requiredText(),
            year: new FormControl<number | null>(null, [
              Validators.required,
              integer,
              Validators.min(1900),
              Validators.max(new Date().getUTCFullYear() + 1),
            ]),
            value: amount(),
          }),
          life: new FormGroup({
            coverageAmount: amount(),
            paymentFrequency: requiredText(),
            beneficiaries: new FormArray([beneficiaryForm()], Validators.maxLength(20)),
          }),
          fire: new FormGroup({
            propertyType: requiredText(),
            propertyValue: amount(),
            address: requiredText(500),
          }),
          health: new FormGroup({
            insuredPersons: new FormControl<number | null>(1, [
              Validators.required,
              integer,
              Validators.min(1),
              Validators.max(21),
            ]),
            plan: requiredText(),
            additionalPersons: new FormArray<ReturnType<typeof personForm>>(
              [],
              Validators.maxLength(20),
            ),
          }),
        },
        { validators: listRules },
      ),
      coverage: new FormGroup(
        {
          startDate: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, validDate],
          }),
          endDate: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, validDate],
          }),
          options: new FormControl<string[]>([], { nonNullable: true }),
        },
        { validators: dateRange },
      ),
      agentId: new FormControl('', { nonNullable: true }),
    },
    { validators: primaryInsuredUnique },
  );
}
export type PolicyForm = ReturnType<typeof createPolicyForm>;
export function selectProduct(form: PolicyForm, type: InsuranceType) {
  const product = form.controls.product.controls;
  for (const key of ['vehicle', 'life', 'fire', 'health'] as const)
    product[key].disable({ emitEvent: false });
  const key =
    type === 'Third Party' || type === 'Car Body'
      ? 'vehicle'
      : type === 'Life'
        ? 'life'
        : type === 'Fire'
          ? 'fire'
          : 'health';
  product[key].enable({ emitEvent: false });
  if (type === 'Third Party') product.vehicle.controls.value.disable({ emitEvent: false });
  product.insuranceType.setValue(type, { emitEvent: false });
  product.insuranceType.updateValueAndValidity({ emitEvent: false });
  form.updateValueAndValidity({ emitEvent: false });
}
export function serializePolicy(form: PolicyForm): DraftRequest {
  const value = form.getRawValue(),
    type = value.product.insuranceType;
  const product =
    type === 'Third Party'
      ? { ...value.product.vehicle, value: null }
      : type === 'Car Body'
        ? value.product.vehicle
        : type === 'Life'
          ? value.product.life
          : type === 'Fire'
            ? value.product.fire
            : value.product.health;
  return {
    customer: value.customer,
    insuranceType: type,
    product,
    coverage: value.coverage,
    agentId: value.agentId,
  };
}
export function restorePolicy(form: PolicyForm, policy: Policy) {
  selectProduct(form, policy.insuranceType);
  const data: PolicyFormData = policy.formData ?? {
    ...serializePolicy(form),
    customer: {
      fullName: policy.customerName,
      nationalId: '',
      mobile: '',
      dateOfBirth: '',
      email: '',
    },
    insuranceType: policy.insuranceType,
    coverage: { startDate: policy.startDate, endDate: policy.endDate, options: [] },
  };
  form.controls.customer.patchValue(data.customer, { emitEvent: false });
  form.controls.coverage.patchValue(data.coverage, { emitEvent: false });
  form.controls.agentId.setValue(policy.agentId, { emitEvent: false });
  const product = form.controls.product.controls;
  if ('beneficiaries' in data.product) {
    product.life.controls.beneficiaries.clear({ emitEvent: false });
    data.product.beneficiaries.forEach((b) => {
      const group = beneficiaryForm();
      group.patchValue(b);
      product.life.controls.beneficiaries.push(group, { emitEvent: false });
    });
    product.life.patchValue(data.product, { emitEvent: false });
  } else if ('additionalPersons' in data.product) {
    product.health.controls.additionalPersons.clear({ emitEvent: false });
    data.product.additionalPersons.forEach((p) => {
      const group = personForm();
      group.patchValue(p);
      product.health.controls.additionalPersons.push(group, { emitEvent: false });
    });
    product.health.patchValue(data.product, { emitEvent: false });
  } else if ('plate' in data.product)
    product.vehicle.patchValue(data.product, { emitEvent: false });
  else if ('propertyType' in data.product)
    product.fire.patchValue(data.product, { emitEvent: false });
  selectProduct(form, data.insuranceType);
  form.markAsPristine();
}
