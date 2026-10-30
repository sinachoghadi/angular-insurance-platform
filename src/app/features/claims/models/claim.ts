export const CLAIM_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CLOSED',
] as const;
export const CLAIM_TYPES = ['Accident', 'Theft', 'Fire', 'Medical', 'Other'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];
export interface Claim {
  readonly id: string;
  readonly claimNumber: string;
  readonly policyId: string;
  readonly policyNumber: string;
  readonly customerName: string;
  readonly incidentDate: string;
  readonly reportedDate: string;
  readonly claimType: ClaimType;
  readonly description: string;
  readonly estimatedAmount: number;
  readonly approvedAmount: number | null;
  readonly status: ClaimStatus;
  readonly assignedOfficerId: string;
  readonly assignedOfficerName: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}
export interface ClaimHistory {
  readonly id: string;
  readonly claimId: string;
  readonly previousStatus: ClaimStatus | null;
  readonly newStatus: ClaimStatus;
  readonly changedBy: string;
  readonly changedByName: string;
  readonly changedAt: string;
  readonly note: string;
}
export interface ReviewNote {
  readonly id: string;
  readonly claimId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly content: string;
  readonly createdAt: string;
}
export interface ClaimPage {
  items: Claim[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CreateClaimRequest {
  policyId: string;
  incidentDate: string;
  claimType: ClaimType;
  description: string;
  estimatedAmount: number;
}
export interface ClaimTransitionRequest {
  status: ClaimStatus;
  version: number;
  reason: string;
  approvedAmount?: number;
}
