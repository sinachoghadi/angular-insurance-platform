import { User } from '../../shared/models/user';

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/** Response of `POST /auth/login` and `GET /auth/me`. */
export interface SessionResponse {
  readonly user: User;
  /** Server-side absolute expiry, informational only. */
  readonly expiresAt: string;
  /** Seconds until the session expires; used for client timers so clock skew does not matter. */
  readonly expiresIn: number;
}

/** `unknown` until the session restore request has completed. */
export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';
