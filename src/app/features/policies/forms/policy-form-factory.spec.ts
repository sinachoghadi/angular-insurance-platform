import { FormControl } from '@angular/forms';
import {
  beneficiaryForm,
  createPolicyForm,
  personForm,
  restorePolicy,
  selectProduct,
  serializePolicy,
} from './policy-form-factory';
import { dateRange, mobile, nationalId, notFuture } from './policy-validators';
import { Policy } from '../models/policy';
describe('Policy typed forms and validators', () => {
  it('requires customer fields, validates ID/mobile/email and dates', () => {
    const form = createPolicyForm();
    expect(form.controls.customer.invalid).toBe(true);
    expect(nationalId(new FormControl('123'))).toEqual({ nationalId: true });
    expect(nationalId(new FormControl('1234567890'))).toBeNull();
    expect(mobile(new FormControl('09123456789'))).toBeNull();
    expect(mobile(new FormControl('+989123456789'))).toEqual({ mobile: true });
    expect(notFuture(new FormControl('2999-01-01'))).toEqual({ future: true });
    expect(notFuture(new FormControl('2025-02-31'))).toEqual({ date: true });
    form.controls.customer.controls.email.setValue('invalid');
    expect(form.controls.customer.controls.email.hasError('email')).toBe(true);
  });
  it('enables only the selected product, retains values and applies Car Body value validation', () => {
    const form = createPolicyForm();
    selectProduct(form, 'Third Party');
    const vehicle = form.controls.product.controls.vehicle;
    vehicle.patchValue({ plate: 'DEMO-123', model: 'Demo Sedan', year: 2020 });
    expect(form.controls.product.valid).toBe(true);
    expect(form.controls.product.controls.life.disabled).toBe(true);
    selectProduct(form, 'Car Body');
    expect(vehicle.controls.value.hasError('required')).toBe(true);
    vehicle.controls.value.setValue(20000);
    selectProduct(form, 'Fire');
    expect(vehicle.disabled).toBe(true);
    selectProduct(form, 'Car Body');
    expect(vehicle.controls.model.value).toBe('Demo Sedan');
    expect(vehicle.controls.value.value).toBe(20000);
    selectProduct(form, 'Third Party');
    expect(serializePolicy(form).product).toMatchObject({ value: null });
    expect(vehicle.controls.value.value).toBe(20000);
    const payload = serializePolicy(form);
    expect(payload.product).not.toHaveProperty('beneficiaries');
  });
  it('supports beneficiary arrays and enforces shares and uniqueness', () => {
    const form = createPolicyForm();
    selectProduct(form, 'Life');
    const life = form.controls.product.controls.life;
    life.patchValue({ coverageAmount: 100000, paymentFrequency: 'Monthly' });
    const array = life.controls.beneficiaries;
    array.at(0).patchValue({ fullName: 'Demo One', nationalId: '1234567890', share: 40 });
    expect(form.controls.product.hasError('shares')).toBe(true);
    const second = beneficiaryForm();
    second.patchValue({ fullName: 'Demo Two', nationalId: '2345678901', share: 60 });
    array.push(second);
    expect(form.controls.product.valid).toBe(true);
    second.controls.nationalId.setValue('1234567890');
    expect(form.controls.product.hasError('duplicates')).toBe(true);
    array.removeAt(1);
    expect(form.controls.product.hasError('shares')).toBe(true);
  });
  it('checks coverage range and primary/additional insured counts and duplicates', () => {
    const form = createPolicyForm();
    form.controls.coverage.patchValue({ startDate: '2027-01-01', endDate: '2026-01-01' });
    expect(dateRange(form.controls.coverage)).toEqual({ dateRange: true });
    selectProduct(form, 'Health');
    const health = form.controls.product.controls.health;
    health.controls.plan.setValue('Basic');
    const person = personForm();
    person.patchValue({
      fullName: 'Demo Dependent',
      nationalId: '1234567890',
      dateOfBirth: '2010-01-01',
    });
    health.controls.additionalPersons.push(person);
    expect(form.controls.product.hasError('insuredCount')).toBe(true);
    health.controls.insuredPersons.setValue(2);
    expect(form.controls.product.valid).toBe(true);
    form.controls.customer.controls.nationalId.setValue('1234567890');
    expect(form.hasError('primaryInsured')).toBe(true);
  });
  it('round-trips a draft including dynamic arrays', () => {
    const form = createPolicyForm();
    selectProduct(form, 'Life');
    form.controls.product.controls.life.controls.beneficiaries
      .at(0)
      .patchValue({ fullName: 'Demo Person', nationalId: '1234567890', share: 100 });
    const payload = serializePolicy(form);
    const policy: Policy = {
      id: 'p-new',
      policyNumber: 'INS-DEMO',
      customerName: '',
      customerNationalId: '',
      insuranceType: 'Life',
      premium: 400,
      startDate: '',
      endDate: '',
      status: 'DRAFT',
      agentId: 'u-1002',
      agentName: 'Jordan Agent',
      createdAt: '',
      updatedAt: '',
      formData: payload,
      version: 1,
    };
    const restored = createPolicyForm();
    restorePolicy(restored, policy);
    expect(restored.controls.product.controls.life.controls.beneficiaries.length).toBe(1);
    expect(serializePolicy(restored)).toEqual({ ...payload, agentId: 'u-1002' });
    expect(restored.pristine).toBe(true);
  });
});
