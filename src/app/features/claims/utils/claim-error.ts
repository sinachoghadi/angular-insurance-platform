import { HttpErrorResponse } from '@angular/common/http';
export function claimError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) return 'You do not have permission to access this claim or action.';
    if (error.status === 404) return 'Claim or linked policy not found.';
    if (error.status === 409)
      return 'This claim changed or the action is no longer allowed. Reload to review the latest status.';
    const body: unknown = error.error;
    if (
      error.status === 422 &&
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof body.message === 'string'
    )
      return body.message;
  }
  return 'Unable to complete this request. Please try again.';
}
