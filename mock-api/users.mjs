// Fictional demo accounts. Development only: never reuse these credentials or this server in production.
// Passwords are stored as scrypt hashes (`scrypt$<salt>$<key>`, base64). Accounts with
// `passwordHash: null` appear in user listings but cannot sign in.
//
// admin@demo.com / Admin123!
// agent@demo.com / Agent123!

/** @type {ReadonlyArray<{ id: string; name: string; email: string; role: 'ADMIN' | 'AGENT'; passwordHash: string | null }>} */
export const USERS = Object.freeze([
  {
    id: 'u-1001',
    name: 'Avery Admin',
    email: 'admin@demo.com',
    role: 'ADMIN',
    passwordHash: 'scrypt$S5INecbSKKG8J4stIc4WPA==$ApVno3C1OBkQKlFk1VqdXFUkCOYNKMMtZbq6DAs8Bd0=',
  },
  {
    id: 'u-1002',
    name: 'Jordan Agent',
    email: 'agent@demo.com',
    role: 'AGENT',
    passwordHash: 'scrypt$mYw4+BgYbXUdiZINDiIQjw==$EdC6X6Y6r/OT9KHef73LhhHmywY7GuVWu/cdvUGhnZc=',
  },
  {
    id: 'u-1003',
    name: 'Riley Morgan',
    email: 'riley.morgan@demo.com',
    role: 'AGENT',
    passwordHash: null,
  },
  {
    id: 'u-1004',
    name: 'Casey Patel',
    email: 'casey.patel@demo.com',
    role: 'AGENT',
    passwordHash: null,
  },
]);

/** Public projection of a user record; never exposes the password hash. */
export function toUserDto({ id, name, email, role }) {
  return { id, name, email, role };
}
