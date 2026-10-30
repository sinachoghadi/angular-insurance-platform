import { randomUUID } from 'node:crypto';
import { USERS } from './users.mjs';
import {
  ClaimError,
  authorizeClaim,
  claimInput,
  listClaims,
  publicClaim,
  transitionClaim,
} from './claims.mjs';
export function createClaimHandler({
  claims,
  policies,
  authorize,
  authorizeWrite,
  readJson,
  sendJson,
}) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const match = /^\/api\/claims(?:\/([^/]+)(?:\/(history|notes|transition))?)?$/.exec(
      url.pathname,
    );
    if (!match) throw new ClaimError(404, 'Not found.');
    const [, id, action] = match;
    const user = req.method === 'GET' ? authorize(req).user : authorizeWrite(req);
    const find = (data) =>
      authorizeClaim(
        data.claims.find((c) => c.id === id),
        user,
        policies.list(),
      );
    const admin = () => {
      if (user.role !== 'ADMIN')
        throw new ClaimError(403, 'Claim review and internal notes are Admin-only.');
    };
    if (req.method === 'GET' && !id)
      return sendJson(
        res,
        200,
        listClaims(claims.read().claims, url.searchParams, user, policies.list()),
      );
    if (req.method === 'POST' && !id) {
      const body = await readJson(req);
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{10,100}$/.test(key))
        throw new ClaimError(400, 'A valid Idempotency-Key is required.');
      const result = await claims.mutate((data) => {
        const { policy, input } = claimInput(body, user, policies.list());
        const fingerprint = JSON.stringify(input);
        const prior = data.claims.find((c) => c.createdBy === user.id && c.creationKey === key);
        if (prior) {
          authorizeClaim(prior, user, policies.list());
          if (prior.creationFingerprint !== fingerprint)
            throw new ClaimError(409, 'Creation key already used for different data.');
          return publicClaim(prior);
        }
        const timestamp = new Date().toISOString(),
          uuid = randomUUID();
        const officer = USERS.find((u) => u.role === 'ADMIN');
        const claim = {
          ...input,
          id: `c-${uuid}`,
          claimNumber: `CLM-${timestamp.slice(0, 4)}-${uuid.slice(0, 8).toUpperCase()}`,
          policyNumber: policy.policyNumber,
          customerName: policy.customerName,
          reportedDate: timestamp,
          approvedAmount: null,
          status: 'SUBMITTED',
          assignedOfficerId: officer.id,
          assignedOfficerName: officer.name,
          createdBy: user.id,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
          creationKey: key,
          creationFingerprint: fingerprint,
        };
        data.claims.push(claim);
        data.history.push({
          id: `h-${randomUUID()}`,
          claimId: claim.id,
          previousStatus: null,
          newStatus: 'SUBMITTED',
          changedBy: user.id,
          changedByName: user.name,
          changedAt: timestamp,
          note: 'Claim submitted.',
        });
        return publicClaim(claim);
      });
      return sendJson(res, 201, result);
    }
    if (req.method === 'GET' && id) {
      const data = claims.read(),
        claim = find(data);
      if (!action) return sendJson(res, 200, publicClaim(claim));
      if (action === 'history')
        return sendJson(res, 200, {
          items: data.history
            .filter((h) => h.claimId === id)
            .sort((a, b) => a.changedAt.localeCompare(b.changedAt) || a.id.localeCompare(b.id)),
        });
      if (action === 'notes') {
        admin();
        return sendJson(res, 200, {
          items: data.notes
            .filter((n) => n.claimId === id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
        });
      }
    }
    if (req.method === 'POST' && id && ['transition', 'notes'].includes(action)) {
      admin();
      // Check ownership/existence before parsing a mutation body; recheck in the transaction.
      find(claims.read());
      const body = await readJson(req);
      const result = await claims.mutate((data) => {
        const claim = find(data);
        if (action === 'transition') return transitionClaim(data, claim, body, user);
        if (
          typeof body?.content !== 'string' ||
          body.content.trim().length < 3 ||
          body.content.trim().length > 2000
        )
          throw new ClaimError(422, 'Review notes require 3–2000 non-whitespace characters.');
        const note = {
          id: `n-${randomUUID()}`,
          claimId: id,
          authorId: user.id,
          authorName: user.name,
          content: body.content.trim(),
          createdAt: new Date().toISOString(),
        };
        data.notes.push(note);
        return note;
      });
      return sendJson(res, action === 'notes' ? 201 : 200, result);
    }
    throw new ClaimError(405, 'Method not allowed.');
  };
}
