export type Role = 'ADMIN' | 'AGENT';

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  ADMIN: 'Administrator',
  AGENT: 'Agent',
};
