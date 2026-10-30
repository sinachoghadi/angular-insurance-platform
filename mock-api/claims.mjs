import { randomUUID } from 'node:crypto';
import { USERS } from './users.mjs';
export const CLAIM_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'];
export const CLAIM_TYPES = ['Accident', 'Theft', 'Fire', 'Medical', 'Other'];
export const CLAIM_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};
export class ClaimError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const validClaimDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function seedClaims(policies) {
  const active = policies.filter(
    (p) => p.status === 'ACTIVE' && p.startDate <= new Date().toISOString().slice(0, 10),
  );
  const data = { claims: [], history: [], notes: [] };
  if (!active.length) return data;
  for (let i = 0; i < 90; i++) {
    const p = active[i % active.length];
    const timestamp = `${p.startDate}T10:00:00.000Z`;
    const path = [
      'SUBMITTED',
      'UNDER_REVIEW',
      ...(i % 5 === 3 ? ['REJECTED'] : ['APPROVED']),
      'CLOSED',
    ];
    const status = CLAIM_STATUSES[i % 5];
    const steps =
      status === 'SUBMITTED' ? 1 : status === 'UNDER_REVIEW' ? 2 : status === 'CLOSED' ? 4 : 3;
    const claim = {
      id: `c-${1001 + i}`,
      claimNumber: `CLM-DEMO-${String(i + 1).padStart(5, '0')}`,
      policyId: p.id,
      policyNumber: p.policyNumber,
      customerName: p.customerName,
      incidentDate: p.startDate,
      reportedDate: timestamp,
      claimType: CLAIM_TYPES[Math.floor(i / 5) % 5],
      description: `Fictional incident report ${i + 1}. Demo claim data only.`,
      estimatedAmount: 1000 + i * 75,
      approvedAmount: ['APPROVED', 'CLOSED'].includes(status) ? 900 + i * 50 : null,
      status,
      assignedOfficerId: 'u-1001',
      assignedOfficerName: 'Avery Admin',
      createdBy: p.agentId,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: steps,
    };
    data.claims.push(claim);
    for (let step = 0; step < steps; step++) {
      data.history.push({
        id: `h-${i}-${step}`,
        claimId: claim.id,
        previousStatus: step ? path[step - 1] : null,
        newStatus: path[step],
        changedBy: step ? 'u-1001' : p.agentId,
        changedByName:
          USERS.find((u) => u.id === (step ? 'u-1001' : p.agentId))?.name ?? 'Demo user',
        changedAt: new Date(Date.parse(timestamp) + step * 3600000).toISOString(),
        note:
          path[step] === 'REJECTED'
            ? 'Demo rejection: supporting information was insufficient.'
            : step
              ? 'Demo workflow update.'
              : 'Claim submitted.',
      });
    }
    claim.updatedAt = data.history.at(-1).changedAt;
    data.notes.push({
      id: `n-${i}`,
      claimId: claim.id,
      authorId: 'u-1001',
      authorName: 'Avery Admin',
      content: `Internal demo review note ${i + 1}.`,
      createdAt: timestamp,
    });
  }
  return data;
}
export function authorizeClaim(claim, user, policies) {
  if (!claim) throw new ClaimError(404, 'Claim not found.');
  if (
    user.role !== 'ADMIN' &&
    !policies.some((p) => p.id === claim.policyId && p.agentId === user.id)
  )
    throw new ClaimError(403, 'This claim belongs to another agent policy.');
  return claim;
}
export function publicClaim({ creationKey, creationFingerprint, ...claim }) {
  return claim;
}
export function claimInput(body, user, policies) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ClaimError(422, 'Invalid claim input.');
  if (typeof body.policyId !== 'string' || !body.policyId.trim())
    throw new ClaimError(422, 'Select a policy.');
  const policy = policies.find((p) => p.id === body.policyId);
  if (!policy) throw new ClaimError(404, 'Policy not found.');
  if (user.role !== 'ADMIN' && policy.agentId !== user.id)
    throw new ClaimError(403, 'You can only create claims for assigned policies.');
  if (policy.status !== 'ACTIVE') throw new ClaimError(422, 'Only ACTIVE policies are eligible.');
  if (
    !validClaimDate(body.incidentDate) ||
    body.incidentDate > new Date().toISOString().slice(0, 10) ||
    body.incidentDate < policy.startDate ||
    body.incidentDate > policy.endDate
  )
    throw new ClaimError(
      422,
      'Incident date must be within policy coverage and cannot be in the future.',
    );
  if (
    !CLAIM_TYPES.includes(body.claimType) ||
    typeof body.description !== 'string' ||
    body.description.trim().length < 10 ||
    body.description.trim().length > 2000 ||
    !money(body.estimatedAmount)
  )
    throw new ClaimError(
      422,
      'Provide a claim type, description (10–2000 characters), and positive estimated amount up to 1 trillion USD.',
    );
  return {
    policy,
    input: {
      policyId: policy.id,
      incidentDate: body.incidentDate,
      claimType: body.claimType,
      description: body.description.trim(),
      estimatedAmount: body.estimatedAmount,
    },
  };
}
const money = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= 1e12 &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.001;
export function transitionClaim(data, claim, body, user) {
  if (body?.version !== claim.version)
    throw new ClaimError(409, 'Claim changed. Reload before reviewing again.');
  if (!CLAIM_TRANSITIONS[claim.status].includes(body.status))
    throw new ClaimError(409, 'This status transition is not allowed.');
  const reason = body.reason ?? '';
  if (
    typeof reason !== 'string' ||
    reason.length > 2000 ||
    (body.status === 'REJECTED' && reason.trim().length < 3)
  )
    throw new ClaimError(422, 'Rejection requires a reason (3–2000 characters).');
  if (
    body.status === 'APPROVED' &&
    (!money(body.approvedAmount) || body.approvedAmount > claim.estimatedAmount)
  )
    throw new ClaimError(
      422,
      'Approved amount must be positive and cannot exceed the estimated amount.',
    );
  const previousStatus = claim.status;
  claim.status = body.status;
  claim.version++;
  claim.updatedAt = new Date(Math.max(Date.now(), Date.parse(claim.updatedAt) + 1)).toISOString();
  if (body.status === 'APPROVED') claim.approvedAmount = body.approvedAmount;
  data.history.push({
    id: `h-${randomUUID()}`,
    claimId: claim.id,
    previousStatus,
    newStatus: claim.status,
    changedBy: user.id,
    changedByName: user.name,
    changedAt: claim.updatedAt,
    note: reason.trim(),
  });
  return publicClaim(claim);
}
export function listClaims(records, params, user, policies) {
  const ownIds = new Set(policies.filter((p) => p.agentId === user.id).map((p) => p.id));
  const integer = (key, fallback) =>
    /^\d+$/.test(params.get(key) ?? '') &&
    Number.isSafeInteger(+params.get(key)) &&
    +params.get(key) > 0
      ? +params.get(key)
      : fallback;
  const size = integer('pageSize', 10),
    pageSize = [10, 25, 50].includes(size) ? size : 10;
  const field = [
    'claimNumber',
    'policyNumber',
    'customerName',
    'incidentDate',
    'estimatedAmount',
    'createdAt',
  ].includes(params.get('sortBy'))
    ? params.get('sortBy')
    : 'createdAt';
  const order = params.get('sortOrder') === 'asc' ? 1 : -1;
  const search = (params.get('search') ?? '').trim().toLowerCase();
  const from = validClaimDate(params.get('dateFrom')) ? params.get('dateFrom') : '';
  const to = validClaimDate(params.get('dateTo')) ? params.get('dateTo') : '';
  const rows = records
    .filter(
      (c) =>
        (user.role === 'ADMIN' || ownIds.has(c.policyId)) &&
        (!search ||
          [c.claimNumber, c.policyNumber, c.customerName].some((v) =>
            v.toLowerCase().includes(search),
          )) &&
        (!CLAIM_STATUSES.includes(params.get('status')) || c.status === params.get('status')) &&
        (!CLAIM_TYPES.includes(params.get('claimType')) ||
          c.claimType === params.get('claimType')) &&
        (!from || c.incidentDate >= from) &&
        (!to || c.incidentDate <= to),
    )
    .sort(
      (a, b) =>
        order * (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) ||
        a.id.localeCompare(b.id),
    );
  const page = Math.min(integer('page', 1), Math.max(1, Math.ceil(rows.length / pageSize)));
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize).map(publicClaim),
    total: rows.length,
    page,
    pageSize,
  };
}
