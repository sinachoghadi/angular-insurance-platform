import { NavItem } from '../shared/models/nav-item';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Policies', icon: 'description', route: '/policies' },
  { label: 'Claims', icon: 'assignment', route: '/claims' },
  { label: 'Users', icon: 'group', route: '/users' },
];
