# Enterprise Insurance Management Portal

A portfolio project that simulates an enterprise insurance back-office: policies, claims,
users, and an operational dashboard. All data and authentication are fictional (demo only).

See [docs/PRD.md](docs/PRD.md) for product scope and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
for the technical plan. Progress is tracked in [docs/PROGRESS.md](docs/PROGRESS.md) and
architectural decisions in [docs/DECISIONS.md](docs/DECISIONS.md).

## Tech stack

- Angular 22 (standalone components, zoneless, Signals, OnPush by default)
- Angular Material 3 + SCSS
- RxJS for asynchronous streams
- Vitest + jsdom for unit tests
- TypeScript strict mode with strict template type checking
- Development-only mock API in `mock-api/` (Node.js built-ins, no extra dependencies)

## Requirements

- Node.js 22.12+ (developed on Node 24)
- npm 10+

## Running locally

The app needs the mock API. Run each command in its own terminal:

```bash
npm install
npm run start:api   # mock API on http://localhost:3000/api
npm start           # Angular dev server on http://localhost:4200 (proxies /api to the mock API)
```

### Demo accounts

| Role  | Email          | Password  |
| ----- | -------------- | --------- |
| ADMIN | admin@demo.com | Admin123! |
| AGENT | agent@demo.com | Agent123! |

These are **fictional credentials for local demonstration only**. Never use them, or the mock
API, in production.

Mock API settings (environment variables): `PORT` (default `3000`), `SESSION_TTL_MS`
(default 30 minutes; for example, `SESSION_TTL_MS=60000` to try session expiry), and
`MOCK_LATENCY_MS` (default `400`).

## Commands

| Task                    | Command                     |
| ----------------------- | --------------------------- |
| Install dependencies    | `npm install`               |
| Mock API (watch mode)   | `npm run start:api`         |
| Dev server (port 4200)  | `npm start`                 |
| Unit tests (watch)      | `npm test`                  |
| Unit tests (single run) | `npm test -- --watch=false` |
| Mock API tests          | `npm run test:api`          |
| Production build        | `npm run build`             |

The production build is written to `dist/insurance-portal/browser`.
