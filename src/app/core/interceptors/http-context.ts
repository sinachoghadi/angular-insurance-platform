import { HttpContextToken } from '@angular/common/http';

/**
 * Set on requests whose 401/403 responses the caller handles itself (login, session restore,
 * logout), so the error interceptor does not redirect or notify for them.
 */
export const SKIP_SESSION_HANDLING = new HttpContextToken<boolean>(() => false);

/** Suppress the global 403 toast when the feature renders its own error. 401 still expires the session. */
export const HANDLE_API_ERROR_LOCALLY = new HttpContextToken<boolean>(() => false);
