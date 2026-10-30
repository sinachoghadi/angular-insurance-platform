# Progress

## Phase 7 — Testing, Performance Optimization and Production Readiness

**Status:** Implementation and local verification complete; GitHub workflow awaits its first remote run.

- Added isolated Playwright workflows against the built app and real mock HTTP server,
  including cookie/XSRF authorization, drafts, claims, recovery, keyboard and axe checks.
- Added auth-race/error-preservation regression tests, coverage tooling and E2E typecheck.
- Lazy-loaded rare interceptor snackbar UI and self-hosted fonts; budgets unchanged.
- Improved claims action names and loading announcements; patched vulnerable build tooling.
- Added npm-based CI, production smoke server and reproducible setup documentation.
- Verified: 182 frontend tests, 36 backend tests, 9 real Chrome E2E tests; typecheck and
  production build pass. Initial bundle 358.20 kB raw / 98.35 kB estimated transfer,
  down from 511.79 / 130.54 kB. npm audit: zero reported vulnerabilities.
- Full evidence, coverage, one observed timing timeout, browser setup constraints and
  remaining mock/production limitations: [QUALITY_REPORT.md](QUALITY_REPORT.md).
- No new business feature or next development phase started.

## Phase 6 — State Management and API Architecture Standardization

**Status:** Architectural improvements implemented; no new business phase started.

### Delivered

- Concrete prioritized audit and conventions in [STATE_ARCHITECTURE.md](STATE_ARCHITECTURE.md).
- Private writable/read-only public feature state and explicit step commands.
- Operation-local idle/loading/success/error lifecycle, cancellation-safe finalization,
  safe normalized errors and original technical causes for debugging.
- Cold, shared Auth requests with logout/expiry invalidation and concurrency protection.
- Duplicate retry/canonical-page request prevention; rapid independent filter command merging.
- Stale read/mutation protection, scoped Policy Details store and store-owned Agent lookup.
- Typed API return contracts and local 403 ownership while retaining global 401 handling.
- Regression tests for lifecycle, auth races, cleanup, rapid filters, URL/form sync and mappings.

### Verification / remaining limits

- Final Angular verification: 33 test files, 180 tests passed (`ng test --watch=false`).
- Final backend regression verification: 36 tests passed (`node --test "mock-api/*.test.mjs"`).
- Production build succeeds: initial 511.79 kB raw / about 130.54 kB transferred;
  existing 500 kB warning exceeded by 11.79 kB. Budgets unchanged.
- `git diff --check`: passed.
- Existing mock-backend security/contracts retained; no backend code changed.
- Initial bundle warning remains; budget unchanged. No manual visual browser review claimed.

## Phase 5 — Claims Management

**Status:** Implemented in the requested scope; no next phase started.

### Delivered

- Typed Claim/History/ReviewNote DTOs and 90 fictional seed claims.
- Server-paginated/searchable/filterable/sortable list with shareable URL state and browser
  Back/Forward restoration; Material table, badges, loading/empty/retry states.
- Typed creation form with paginated ACTIVE policy lookup, incident coverage/future-date
  rules, positive USD estimates, duplicate-action prevention and idempotent retry recovery.
- Claim details, linked Policy, financial data, assigned reviewer and chronological history.
- Admin review/approval/rejection/closure state machine with confirmation dialog, required
  rejection reason, optimistic versions and server-authored history.
- Admin-only internal notes with validation, author/timestamp display and persistent storage.
- Backend role/ownership/XSRF enforcement; Agent access derives from assigned policies.
- Claims/history/notes persisted atomically across restarts. Existing Auth/Policy behavior retained.
- Contract, file inventory, decisions and Angular explanations: [CLAIMS_API.md](CLAIMS_API.md).

### Verification and limits

- Final Angular verification: 32 test files, 155 tests passed (`ng test --watch=false`).
- Final backend verification: 36 tests passed (`node --test "mock-api/*.test.mjs"`),
  including all 25 status pairs, ownership, notes privacy, concurrency and restart persistence.
- Production build succeeds: initial 508.88 kB raw / about 129.55 kB transferred.
  Existing 500 kB warning budget exceeded by 8.88 kB; no error budget exceeded.
- `git diff --check`: passed.
- Existing bundle warning remains; no budget increase. No manual browser visual review claimed.
- File store is for one mock server process; sessions reset on restart. No officer role,
  payment processing, attachments or next-phase work added.

## Phase 4 — Policy Creation and Draft Editing

**Status:** Implemented within the requested scope; no next phase started.

### Delivered

- Lazy four-step Material Stepper with typed customer/product/coverage forms and review.
- Five dynamic products, shared vehicle controls, conditional validators and retained
  in-page product values. Dynamic beneficiary and additional-insured FormArrays.
- National ID/mobile/email/date validation, shares, duplicate IDs, insured-count and date-range rules.
- Signal-based page state and RxJS HTTP flows, cancelable loads, explicit saves, duplicate
  prevention, idempotent create recovery and optimistic version conflict handling.
- Draft creation/update/restore/discard and DRAFT → PENDING submission with independent
  backend validation, existing session/XSRF protection and role/ownership enforcement.
- File-backed persistence across server restarts; serialized mutations and atomic rename.
- Create/Edit/Continue integration, detailed product review and unsaved-change confirmations.
- Documentation, endpoint contract, file inventory and Angular explanations in
  [POLICY_CREATION.md](POLICY_CREATION.md).

### Verification and limitations

- Final Angular verification: 22 test files, 124 tests passed (`ng test --watch=false`).
- Final backend verification: 27 tests passed (`node --test "mock-api/*.test.mjs"`),
  including isolated disk persistence/restart, authorization, validation and concurrent submission.
- Production build succeeds: initial 509.08 kB raw / about 127.48 kB transferred.
  The existing 500 kB warning budget is exceeded by 9.08 kB; no error budget is exceeded.
- `git diff --check`: passed.
- Pricing is simulated USD; national ID validation checks format, not identity/checksum.
- The file store supports one mock server process; sessions still reset on restart.
- No Claims, approval processing, payments or other phases were implemented.
- Existing initial-bundle warning remains; budget has not been raised. No manual visual
  browser review is claimed.

## Phase 3 — Policy Management listing and details

**Status:** Implemented within the explicitly requested read-only scope. No next phase started.

### Delivered

- Typed policy and query models; 180 fictional records across five products/statuses.
- Session-authorized `GET /api/policies` and `GET /api/policies/:id`.
- Backend search, combined filters, stable sorting and actual server-side pagination.
- Material table, status badges, paginator (10/25/50), responsive filter grid and contained
  table scrolling; loading, empty and retryable-error states.
- Debounced reactive search, request cancellation, page-scoped signals/computed state.
- URL restoration on refresh and browser Back/Forward; detail links retain listing state.
- Read-only details with customer, coverage dates, premium, agent and record timestamps;
  invalid/missing IDs and forbidden access have distinct states.
- API, store, query parser, debounce, rendering, routing/history and backend security tests.
- Endpoint and Angular explanation: [POLICY_API.md](POLICY_API.md).

### Quality gates and limits

- Final Angular verification: 19 test files, 104 tests passed (`ng test --watch=false`).
- Final backend verification: 19 tests passed (`node --test "mock-api/*.test.mjs"`).
- `git diff --check`: passed.
- Production build succeeds. Initial bundle is about 506 kB raw / 127 kB transferred,
  slightly above the existing 500 kB warning budget; the budget has not been raised.
- Production build needs network access for existing Google Fonts inlining.
- No manual browser visual review is claimed; responsive layout is implemented with a
  flexible filter grid and a bounded table scroll region.
- All prior mock-session limitations remain. Detailed coverage/premium breakdown is
  unavailable; creation, editing and Claims are deferred.

## Phase 1 — Project Setup & Architecture ✅

**Status:** Complete

### Delivered

- Angular 22.2 application scaffolded with the Angular CLI (standalone, zoneless, no SSR).
- Strict TypeScript (`strict`) and strict template checking (`strictTemplates`) enabled explicitly.
- Angular Material 3 installed with an azure/blue enterprise theme and shared layout tokens.
- Feature-based folder structure (`core`, `shared`, `features`, `layout`).
- Responsive application shell:
  - Header with menu toggle, brand link, and demo badge.
  - Sidebar navigation with active-route highlighting and `aria-current`.
  - Side-by-side sidebar on desktop, overlay drawer below 960px.
  - Skip-to-content button and focusable `<main>` landmark.
- Lazy-loaded feature routes: Dashboard, Policies, Claims, Users.
- Placeholder pages built from reusable `PageHeader` and `FeaturePlaceholder` components.
- Not Found page for unknown URLs, rendered inside the shell.
- Per-route document titles via a custom `TitleStrategy`.

### Quality gates

- `ng build` (production): passes, no warnings. Each feature is emitted as a separate lazy chunk.
- `ng test`: 6 test files, 19 tests passing (routing, shell, header, sidebar, shared components).
- Manually verified in the browser at desktop and mobile widths.

### Deferred

- ESLint (`angular-eslint`) — planned in the architecture; to be added in a tooling step with approval.

## Phase 2 — Authentication & Authorization ✅

**Status:** Complete (awaiting approval for the next phase)

### Delivered

- Development-only mock API (`mock-api/`): login, logout, me, and admin-only `GET /users`.
  It uses HttpOnly cookie sessions, scrypt password hashes, an XSRF token, 401/403 enforcement,
  and session expiry.
- Dev-server proxy (`proxy.conf.json`) so the API is same-origin.
- `AuthApi` (HTTP) and a signal-based `AuthStore` (user, status, initialization, login
  pending/error, computed role state, expiry timer).
- Login page: typed reactive form, required and email validation, show/hide password,
  loading state, invalid-credential alert, session-expired notice, demo account shortcuts,
  `returnUrl` support with open-redirect protection.
- Functional guards: `authGuard` (shell `canActivate` + `canActivateChild`), `guestGuard`
  (login), and `roleGuard(['ADMIN'])` (Users).
- Functional interceptors: `authInterceptor` (credentials for API URLs only) and
  `errorInterceptor` (401 ends the session, 403 shows a permission message).
- Access Denied page; role-aware navigation from a shared `ACCESS_RULES` map.
- Header account menu with name, role, email, and Sign out.
- Users page shows the admin-only user list from the API (read-only).
- Shell is lazy-loaded, so guests download less code.

### Quality gates

- `ng build` (production): passes with no warnings. Initial bundle 460 kB raw, about 115 kB transferred.
- `ng test`: 13 files, 85 tests passing.
- `npm run test:api`: 13 tests passing.
- Browser end-to-end check (headless Chrome) of all acceptance criteria, including refresh
  restore, logout invalidation, agent direct-URL block, agent 403 from the API, and in-app 401
  after the server lost the session.

### Known limitations

- Sessions are in memory: restarting the mock API signs everyone out.
- Fixed session lifetime with no sliding renewal or "remember me".
- No login rate limiting or account lockout.
- `Secure` cookie flag is off in development (plain HTTP); required for any HTTPS deployment.
- The API base URL is a single `API_BASE_URL` token (`/api`); a separately hosted API would also
  need CORS with credentials and `SameSite=None; Secure` cookies.
- Logout clears local state even if the server call fails; the server session then remains
  valid until it expires.
- User management actions (role assignment, activation) are not implemented yet.
