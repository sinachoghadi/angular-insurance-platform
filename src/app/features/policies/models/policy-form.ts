import type { INSURANCE_TYPES } from './policy';
export type InsuranceType = (typeof INSURANCE_TYPES)[number];
export interface CustomerData {
  fullName: string;
  nationalId: string;
  mobile: string;
  dateOfBirth: string;
  email: string;
}
export interface Beneficiary {
  fullName: string;
  nationalId: string;
  share: number | null;
}
export interface InsuredPerson {
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
}
export interface VehicleData {
  plate: string;
  model: string;
  year: number | null;
  value: number | null;
}
export interface LifeData {
  coverageAmount: number | null;
  paymentFrequency: string;
  beneficiaries: Beneficiary[];
}
export interface FireData {
  propertyType: string;
  propertyValue: number | null;
  address: string;
}
export interface HealthData {
  insuredPersons: number | null;
  plan: string;
  additionalPersons: InsuredPerson[];
}
export interface CoverageData {
  startDate: string;
  endDate: string;
  options: string[];
}
export interface PolicyFormData {
  customer: CustomerData;
  insuranceType: InsuranceType;
  product: VehicleData | LifeData | FireData | HealthData;
  coverage: CoverageData;
}
export interface DraftRequest extends PolicyFormData {
  agentId?: string;
  version?: number;
}
export const COVERAGE_OPTIONS = ['Accident', 'Disability', 'Emergency assistance'] as const;
export function premiumEstimate(type: InsuranceType, options: readonly string[]): number {
  return (
    { 'Third Party': 300, 'Car Body': 500, Life: 400, Fire: 250, Health: 350 }[type] +
    options.length * 100
  );
}
