import { apiError } from '../../../core/http/api-error';
export function claimError(error: unknown): string {
  const failure = apiError(error);
  return failure.status === 404 ? 'Claim or linked policy not found.' : failure.message;
}
