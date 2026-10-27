import { Role } from './role';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
}
