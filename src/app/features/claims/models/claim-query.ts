import { ParamMap } from '@angular/router';
import { CLAIM_STATUSES, CLAIM_TYPES } from './claim';
export const CLAIM_SORT_FIELDS = [
  'claimNumber',
  'policyNumber',
  'customerName',
  'incidentDate',
  'estimatedAmount',
  'createdAt',
] as const;
export interface ClaimQuery {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  claimType: string;
  dateFrom: string;
  dateTo: string;
  sortBy: (typeof CLAIM_SORT_FIELDS)[number];
  sortOrder: 'asc' | 'desc';
}
export const DEFAULT_CLAIM_QUERY: ClaimQuery = {
  page: 1,
  pageSize: 10,
  search: '',
  status: '',
  claimType: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
export function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function parseClaimQuery(params: ParamMap): ClaimQuery {
  const integer = (key: string, fallback: number) => {
    const value = params.get(key) ?? '';
    return /^\d+$/.test(value) && Number.isSafeInteger(+value) && +value > 0 ? +value : fallback;
  };
  const option = (key: string, values: readonly string[], fallback = '') =>
    values.includes(params.get(key) ?? '') ? params.get(key)! : fallback;
  const date = (key: string) => (validDate(params.get(key)) ? params.get(key)! : '');
  const size = integer('pageSize', 10);
  return {
    page: integer('page', 1),
    pageSize: [10, 25, 50].includes(size) ? size : 10,
    search: (params.get('search') ?? '').trim(),
    status: option('status', CLAIM_STATUSES),
    claimType: option('claimType', CLAIM_TYPES),
    dateFrom: date('dateFrom'),
    dateTo: date('dateTo'),
    sortBy: option('sortBy', CLAIM_SORT_FIELDS, 'createdAt') as ClaimQuery['sortBy'],
    sortOrder: option('sortOrder', ['asc', 'desc'], 'desc') as ClaimQuery['sortOrder'],
  };
}
