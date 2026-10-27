import { Role } from './role';

export interface NavItem {
  readonly label: string;
  /** Material Symbols ligature name, e.g. `dashboard`. */
  readonly icon: string;
  /** Absolute router path, e.g. `/policies`. */
  readonly route: string;
  /** Roles allowed to see the item. Omit to show it to every authenticated user. */
  readonly roles?: readonly Role[];
}
