import { ClaimStatus } from '../models/claim';
export const CLAIM_TRANSITIONS: Readonly<Record<ClaimStatus, readonly ClaimStatus[]>> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};
export const TRANSITION_LABELS: Readonly<Partial<Record<ClaimStatus, string>>> = {
  UNDER_REVIEW: 'Start review',
  APPROVED: 'Approve claim',
  REJECTED: 'Reject claim',
  CLOSED: 'Close claim',
};
