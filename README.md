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

## Requirements

- Node.js 22.12+ (developed on Node 24)
- npm 10+

## Commands

| Task                    | Command                     |
| ----------------------- | --------------------------- |
| Install dependencies    | `npm install`               |
| Dev server (port 4200)  | `npm start`                 |
| Unit tests (watch)      | `npm test`                  |
| Unit tests (single run) | `npm test -- --watch=false` |
| Production build        | `npm run build`             |

The production build is written to `dist/insurance-portal/browser`.
