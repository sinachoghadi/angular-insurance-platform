# Progress

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
