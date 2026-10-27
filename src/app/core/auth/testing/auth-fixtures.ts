import { User } from '../../../shared/models/user';
import { SessionResponse } from '../auth-models';

export const ADMIN_USER: User = {
  id: 'u-1001',
  name: 'Avery Admin',
  email: 'admin@demo.com',
  role: 'ADMIN',
};

export const AGENT_USER: User = {
  id: 'u-1002',
  name: 'Jordan Agent',
  email: 'agent@demo.com',
  role: 'AGENT',
};

export function sessionFor(user: User, expiresIn = 1800): SessionResponse {
  return { user, expiresIn, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

export const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' } as const;
export const FORBIDDEN = { status: 403, statusText: 'Forbidden' } as const;
