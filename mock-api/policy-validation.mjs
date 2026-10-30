import { TYPES } from './policies.mjs';

export class PolicyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const COVERAGE_OPTIONS = ['Accident', 'Disability', 'Emergency assistance'];
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const number = (value, min, max = 1e12) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const date = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

// Shape validation permits incomplete drafts. Submission additionally enforces every business rule.
export function validatePolicyInput(
  input,
  complete = false,
  today = new Date().toISOString().slice(0, 10),
) {
  const fail = (message) => {
    throw new PolicyError(422, message);
  };
  if (
    !object(input) ||
    !object(input.customer) ||
    !object(input.product) ||
    !object(input.coverage) ||
    !TYPES.includes(input.insuranceType)
  )
    fail('Invalid policy form structure.');
  const c = input.customer,
    p = input.product,
    coverage = input.coverage;
  const stringFields = [
    c.fullName,
    c.nationalId,
    c.mobile,
    c.dateOfBirth,
    c.email,
    coverage.startDate,
    coverage.endDate,
  ];
  if (stringFields.some((v) => typeof v !== 'string' || v.length > 250))
    fail('Invalid customer or coverage fields.');
  if ([c.dateOfBirth, coverage.startDate, coverage.endDate].some((value) => value && !date(value)))
    fail('Dates must use valid YYYY-MM-DD values.');
  if (
    !Array.isArray(coverage.options) ||
    coverage.options.length > 3 ||
    new Set(coverage.options).size !== coverage.options.length ||
    coverage.options.some((v) => !COVERAGE_OPTIONS.includes(v))
  )
    fail('Invalid coverage options.');
  const type = input.insuranceType;
  const shapeString = (v) => typeof v === 'string' && v.length <= 500;
  const numericDraft = (v) => v === null || number(v, 0);
  const people = (items, beneficiary) =>
    Array.isArray(items) &&
    items.length <= 20 &&
    items.every(
      (person) =>
        object(person) &&
        shapeString(person.fullName) &&
        shapeString(person.nationalId) &&
        (beneficiary ? numericDraft(person.share) : shapeString(person.dateOfBirth)),
    );
  if (
    ['Third Party', 'Car Body'].includes(type) &&
    (!shapeString(p.plate) ||
      !shapeString(p.model) ||
      !numericDraft(p.year) ||
      !numericDraft(p.value))
  )
    fail('Invalid vehicle fields.');
  if (
    type === 'Life' &&
    (!people(p.beneficiaries, true) ||
      !numericDraft(p.coverageAmount) ||
      !shapeString(p.paymentFrequency))
  )
    fail('Invalid life insurance fields.');
  if (
    type === 'Fire' &&
    (!shapeString(p.propertyType) || !shapeString(p.address) || !numericDraft(p.propertyValue))
  )
    fail('Invalid property fields.');
  if (
    type === 'Health' &&
    (!numericDraft(p.insuredPersons) || !shapeString(p.plan) || !people(p.additionalPersons, false))
  )
    fail('Invalid health insurance fields.');
  if (
    type === 'Health' &&
    p.additionalPersons.some((person) => person.dateOfBirth && !date(person.dateOfBirth))
  )
    fail('Insured person dates must be valid.');
  if (complete) {
    if (
      !text(c.fullName) ||
      c.fullName.trim().length < 3 ||
      !/^\d{10}$/.test(c.nationalId) ||
      !/^09\d{9}$/.test(c.mobile) ||
      !date(c.dateOfBirth) ||
      c.dateOfBirth > today ||
      (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
    )
      fail('Complete valid customer information before submitting.');
    if (
      !date(coverage.startDate) ||
      !date(coverage.endDate) ||
      coverage.endDate <= coverage.startDate
    )
      fail('Coverage end date must be after the start date.');
    if (
      ['Third Party', 'Car Body'].includes(type) &&
      (!text(p.plate) ||
        !text(p.model) ||
        !Number.isInteger(p.year) ||
        !number(p.year, 1900, Number(today.slice(0, 4)) + 1) ||
        (type === 'Car Body' && !number(p.value, 1)))
    )
      fail('Complete valid vehicle information.');
    if (
      type === 'Life' &&
      (!number(p.coverageAmount, 1) ||
        !['Monthly', 'Quarterly', 'Annual'].includes(p.paymentFrequency) ||
        !p.beneficiaries.length ||
        p.beneficiaries.some(
          (b) => !text(b.fullName) || !/^\d{10}$/.test(b.nationalId) || !number(b.share, 1, 100),
        ) ||
        p.beneficiaries.reduce((sum, b) => sum + b.share, 0) !== 100 ||
        new Set(p.beneficiaries.map((b) => b.nationalId)).size !== p.beneficiaries.length)
    )
      fail('Beneficiaries must be unique and their shares must total 100%.');
    if (
      type === 'Fire' &&
      (!['Residential', 'Commercial'].includes(p.propertyType) ||
        !number(p.propertyValue, 1) ||
        !text(p.address))
    )
      fail('Complete valid property information.');
    if (
      type === 'Health' &&
      (!Number.isInteger(p.insuredPersons) ||
        !number(p.insuredPersons, 1, 21) ||
        p.insuredPersons !== p.additionalPersons.length + 1 ||
        !['Basic', 'Standard', 'Premium'].includes(p.plan) ||
        p.additionalPersons.some(
          (b) =>
            !text(b.fullName) ||
            !/^\d{10}$/.test(b.nationalId) ||
            !date(b.dateOfBirth) ||
            b.dateOfBirth > today,
        ) ||
        new Set([c.nationalId, ...p.additionalPersons.map((b) => b.nationalId)]).size !==
          p.insuredPersons)
    )
      fail('Insured persons must be unique and match the declared count.');
  }
  // Whitelist the public write contract, excluding status, premium, IDs and timestamps.
  const productFields = ['Third Party', 'Car Body'].includes(type)
    ? ['plate', 'model', 'year', 'value']
    : type === 'Life'
      ? ['coverageAmount', 'paymentFrequency', 'beneficiaries']
      : type === 'Fire'
        ? ['propertyType', 'propertyValue', 'address']
        : ['insuredPersons', 'plan', 'additionalPersons'];
  const product = Object.fromEntries(productFields.map((key) => [key, p[key]]));
  if (product.beneficiaries)
    product.beneficiaries = product.beneficiaries.map(({ fullName, nationalId, share }) => ({
      fullName,
      nationalId,
      share,
    }));
  if (product.additionalPersons)
    product.additionalPersons = product.additionalPersons.map(
      ({ fullName, nationalId, dateOfBirth }) => ({ fullName, nationalId, dateOfBirth }),
    );
  return {
    customer: Object.fromEntries(
      ['fullName', 'nationalId', 'mobile', 'dateOfBirth', 'email'].map((key) => [
        key,
        c[key].trim(),
      ]),
    ),
    insuranceType: type,
    product,
    coverage: {
      startDate: coverage.startDate,
      endDate: coverage.endDate,
      options: coverage.options,
    },
  };
}

export function projectForm(form) {
  return {
    customerName: form.customer.fullName || 'Unnamed draft',
    customerNationalId: form.customer.nationalId,
    insuranceType: form.insuranceType,
    startDate: form.coverage.startDate,
    endDate: form.coverage.endDate,
    premium:
      { 'Third Party': 300, 'Car Body': 500, Life: 400, Fire: 250, Health: 350 }[
        form.insuranceType
      ] +
      form.coverage.options.length * 100,
    formData: form,
  };
}
