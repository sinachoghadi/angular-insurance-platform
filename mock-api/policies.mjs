import { USERS } from './users.mjs';

export const TYPES = ['Third Party', 'Car Body', 'Life', 'Fire', 'Health'];
export const STATUSES = ['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED'];
export const POLICIES = Array.from({ length: 180 }, (_, i) => {
  const startDate = new Date(Date.UTC(2025 + (i % 2), i % 12, 1 + (i % 27)))
    .toISOString()
    .slice(0, 10);
  const agent = USERS[1 + (i % 3)];
  return Object.freeze({
    id: `p-${1001 + i}`,
    policyNumber: `INS-${2025 + (i % 2)}-${String(i + 1).padStart(5, '0')}`,
    customerName: `${['Alex', 'Taylor', 'Sam', 'Robin', 'Jamie', 'Drew'][i % 6]} ${['Meadow', 'Brook', 'Vale', 'Lake', 'Hill'][Math.floor(i / 6) % 5]} ${i + 1}`,
    customerNationalId: `DEMO-${String(i + 1).padStart(6, '0')}`,
    insuranceType: TYPES[i % 5],
    premium: 250 + ((i * 137) % 12000),
    startDate,
    endDate: `${Number(startDate.slice(0, 4)) + 1}${startDate.slice(4)}`,
    status: STATUSES[Math.floor(i / 5) % 5],
    agentId: agent.id,
    agentName: agent.name,
    createdAt: `${startDate}T09:00:00.000Z`,
    updatedAt: `${startDate}T12:00:00.000Z`,
  });
});

const sorts = ['policyNumber', 'premium', 'startDate', 'endDate', 'createdAt'];
export function listPolicies(params, user) {
  const integer = (key, fallback) =>
    /^\d+$/.test(params.get(key) ?? '') &&
    Number.isSafeInteger(Number(params.get(key))) &&
    Number(params.get(key)) > 0
      ? Number(params.get(key))
      : fallback;
  const pageSize = [10, 25, 50].includes(integer('pageSize', 10)) ? integer('pageSize', 10) : 10;
  const search = (params.get('search') ?? '').trim().toLowerCase();
  const sortBy = sorts.includes(params.get('sortBy')) ? params.get('sortBy') : 'createdAt';
  const direction = params.get('sortOrder') === 'asc' ? 1 : -1;
  const date = (key) => {
    const value = params.get(key) ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
      ? value
      : '';
  };
  const items = POLICIES.filter(
    (p) =>
      (user.role === 'ADMIN' || p.agentId === user.id) &&
      (!search ||
        [p.policyNumber, p.customerName, p.customerNationalId].some((v) =>
          v.toLowerCase().includes(search),
        )) &&
      (!TYPES.includes(params.get('insuranceType')) ||
        p.insuranceType === params.get('insuranceType')) &&
      (!STATUSES.includes(params.get('status')) || p.status === params.get('status')) &&
      (user.role !== 'ADMIN' || !params.get('agentId') || p.agentId === params.get('agentId')) &&
      (!date('startFrom') || p.startDate >= date('startFrom')) &&
      (!date('startTo') || p.startDate <= date('startTo')),
  ).sort(
    (a, b) =>
      direction * (a[sortBy] < b[sortBy] ? -1 : a[sortBy] > b[sortBy] ? 1 : 0) ||
      a.id.localeCompare(b.id),
  );
  const page = Math.min(integer('page', 1), Math.max(1, Math.ceil(items.length / pageSize)));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  };
}
