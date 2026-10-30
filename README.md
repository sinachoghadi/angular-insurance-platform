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

- Node.js 24.15+ (tested on 24.21.0); Angular also supports 22.22.3+
- npm 10+

## Running locally

The app needs the mock API. Run each command in its own terminal:

```bash
npm ci
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
| Install dependencies    | `npm ci`                    |
| Mock API (watch mode)   | `npm run start:api`         |
| Dev server (port 4200)  | `npm start`                 |
| Unit tests (watch)      | `npm test`                  |
| Unit tests (single run) | `npm test -- --watch=false` |
| Mock API tests          | `npm run test:api`          |
| Production build        | `npm run build`             |

The production build is written to `dist/insurance-portal/browser`.

## Quality verification and production preview

```bash
npm run typecheck:e2e
npm run test:ci       # single run with V8 coverage
npm run test:api
npm run build:stats
npx playwright install chromium   # browser setup, requires network
npm run test:e2e
```

On Windows, E2E automatically uses installed Google Chrome when available. To select
an installed browser explicitly, set `PLAYWRIGHT_CHANNEL=chrome` in your shell.
The tests start the built app automatically and create a separate temporary mock API
and data directory per test. No manually running API is needed. External page requests
are blocked; fonts are self-hosted. Do not run a preview on port 4173 during E2E.

Reports: `coverage/insurance-portal/`, `playwright-report/`, and `test-results/`.
The GitHub Actions quality workflow runs tests, build and Chromium E2E and retains
evidence for seven days. No lint tool is currently configured; CI runs lint if added.
See [the measured quality report](docs/QUALITY_REPORT.md) for results and limits.

For a local smoke test, build first, then run `npm run start:api` and `npm run preview`
in separate terminals. Preview serves port 4173 with SPA deep-route fallback and an
`/api` proxy (override using `API_PROXY_TARGET`; default `http://localhost:3000`).
This helper is not production hosting. A real host needs HTTPS, SPA fallback,
appropriate security headers and an `/api` reverse proxy. `API_BASE_URL` is the
frontend injection token; the development proxy applies only to `ng serve`.

Policies, claims, history and notes persist in local JSON files; sessions are in memory
and disappear on API restart. This single-process mock has fictional data, no login
rate limiting and development cookies without `Secure`. Replace it with a properly
authorized production service before any real deployment.
