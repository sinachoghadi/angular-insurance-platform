import { ParamMap } from '@angular/router';
import { INSURANCE_TYPES, POLICY_STATUSES } from './policy';
export const SORT_FIELDS = [
  'policyNumber',
  'premium',
  'startDate',
  'endDate',
  'createdAt',
] as const;
export interface PolicyQuery {
  page: number;
  pageSize: number;
  search: string;
  insuranceType: string;
  status: string;
  agentId: string;
  startFrom: string;
  startTo: string;
  sortBy: (typeof SORT_FIELDS)[number];
  sortOrder: 'asc' | 'desc';
}
export const DEFAULT_QUERY: PolicyQuery = {
  page: 1,
  pageSize: 10,
  search: '',
  insuranceType: '',
  status: '',
  agentId: '',
  startFrom: '',
  startTo: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
export function parseQuery(params: ParamMap, admin: boolean): PolicyQuery {
  const positive = (key: string, fallback: number) => {
    const value = params.get(key) ?? '';
    return /^\d+$/.test(value) && Number.isSafeInteger(+value) && +value > 0 ? +value : fallback;
  };
  const option = (key: string, values: readonly string[], fallback = '') =>
    values.includes(params.get(key) ?? '') ? params.get(key)! : fallback;
  const date = (key: string) => {
    const value = params.get(key) ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
      ? value
      : '';
  };
  return {
    page: positive('page', 1),
    pageSize: [10, 25, 50].includes(positive('pageSize', 10)) ? positive('pageSize', 10) : 10,
    search: (params.get('search') ?? '').trim(),
    insuranceType: option('insuranceType', INSURANCE_TYPES),
    status: option('status', POLICY_STATUSES),
    agentId: admin ? (params.get('agentId') ?? '') : '',
    startFrom: date('startFrom'),
    startTo: date('startTo'),
    sortBy: option('sortBy', SORT_FIELDS, 'createdAt') as PolicyQuery['sortBy'],
    sortOrder: option('sortOrder', ['asc', 'desc'], 'desc') as PolicyQuery['sortOrder'],
  };
}
