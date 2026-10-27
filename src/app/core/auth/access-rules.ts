import { Role } from '../../shared/models/role';

/**
 * Client-side access rules shared by route guards and navigation.
 * They only shape the UI; the API enforces the same rules independently.
 */
export const ACCESS_RULES = {
  usersManagement: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;
