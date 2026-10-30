export const INSURANCE_TYPES = ['Third Party', 'Car Body', 'Life', 'Fire', 'Health'] as const;
export const POLICY_STATUSES = ['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED'] as const;
export interface Policy {
  readonly id: string;
  readonly policyNumber: string;
  readonly customerName: string;
  readonly customerNationalId: string;
  readonly insuranceType: (typeof INSURANCE_TYPES)[number];
  readonly premium: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: (typeof POLICY_STATUSES)[number];
  readonly agentId: string;
  readonly agentName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface PolicyPage {
  items: Policy[];
  total: number;
  page: number;
  pageSize: number;
}
