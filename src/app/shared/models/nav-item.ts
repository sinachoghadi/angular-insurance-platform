export interface NavItem {
  readonly label: string;
  /** Material Symbols ligature name, e.g. `dashboard`. */
  readonly icon: string;
  /** Absolute router path, e.g. `/policies`. */
  readonly route: string;
}
