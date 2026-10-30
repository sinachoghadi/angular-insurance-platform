# Architecture Decision Log

## ADR-018 — Typed policy workflow and persistent, versioned drafts

**Decision:** Extend ADR-017's read-only phase with the now-approved creation/editing scope.
Use a four-step Material workflow, explicit typed product groups and FormArrays. Disable
inactive groups to preserve in-page values; serialize only the selected product. Keep
validators/form factories separate from the page-scoped signal-based `PolicyFormStore`
and presentation components. Explicit Save Draft replaces autosave for predictable writes.

**Backend:** Reuse cookie sessions/XSRF and independently validate the whitelisted form
contract. Admin may assign agents; Agent identity always comes from the session. Only
DRAFT records may be updated/discarded/submitted. Require optimistic `version` checks,
serialize mutations, and enforce DRAFT → PENDING atomically. Idempotent creation prevents
duplicates after uncertain responses; replays must still satisfy authorization.

**Persistence:** Store development records in ignored `mock-api/.data/policies.json` via
atomic rename, publishing new in-memory state only after persistence succeeds. Keep
sessions in memory. This is deliberately a single-process development repository, not a
production database. New UUID IDs coexist with legacy numeric seeds. Add DELETE for the
requested discard action, with client confirmation and server authorization/version checks.

**UX:** Block writes on repeat clicks, protect unsaved router/browser exits, and retain
the form/current step during saves. Reuse a policy review component in form and details.
USD premiums are clearly labeled simulated estimates; the server calculates authoritative
values. National IDs validate format only. No Claims, authentication rewrite, approval
processing, or later-phase work is included. See [Policy Creation](POLICY_CREATION.md).

## ADR-017 — Read-only Policy Management with URL-owned state

**Decision:** Implement listing and details only. Keep the existing cookie authentication
and extend its Node mock API with 180 fictional policies. Authorization derives agent
identity from the server session before filtering, sorting and pagination. Use stable
ascending ID ties for deterministic pagination. Return only the requested page.

**Client:** Keep API calls in `PolicyApi`, list signals/computed values in a page-scoped
`PolicyStore`, and presentation in filter/table/status components. Use the URL as listing
state, with validated query parsing, silent form restoration and `switchMap` cancellation.
Details have their own route-scoped signal state. Use existing Angular 22 standalone,
zoneless and default OnPush conventions. Prefer direct Material standalone imports.

**Trade-offs:** The read-only API projection doubles as the UI model; no redundant DTO
adapter is introduced. Agent names are provided by the policy API; Admin filter options
reuse the existing authorized Users API. Premiums use USD; missing coverage limits and
premium breakdowns are shown explicitly. The table uses a contained accessible scroll
region on small viewports. No persistence, creation, editing or Claims work is included.

See [Policy API](POLICY_API.md) for endpoint contracts and request/state behavior.

## ADR-001 — Standalone components, no NgModules

**Decision:** All components are standalone; the app bootstraps with `bootstrapApplication` and an
`ApplicationConfig` (`app.config.ts`).
**Why:** It is Angular's default and recommended model. Each component declares its own template
dependencies in `imports`, which makes dependencies explicit and lets the router lazy-load
individual components or route files without wrapper modules.

## ADR-002 — Zoneless change detection, OnPush by default

**Decision:** Keep the Angular 22 defaults: no `zone.js`, and `ChangeDetectionStrategy.OnPush`
as the implicit default (the old default is now named `Eager`).
**Why:** Change detection is driven by signals, inputs, and template events instead of patched
browser APIs. That gives smaller bundles and predictable rendering. Components must therefore
expose UI state through signals.

## ADR-003 — Lazy loading via per-feature `*.routes.ts` files

**Decision:** Each feature exposes a default-exported `Routes` array (`features/<name>/<name>.routes.ts`)
loaded with `loadChildren`. The Not Found page is loaded with `loadComponent`.
**Why:** A feature can grow child routes, route-level providers, and guards without touching
`app.routes.ts`. Default exports remove the need for `.then(m => m.X)`.

## ADR-004 — Single shell route with child routes

**Decision:** `AppShell` is the component of the root `''` route; features and the `**` wildcard
are its children.
**Why:** Every page, including Not Found, is rendered inside the shell. A future login page can be
added as a sibling route outside the shell, and an auth guard can be placed once on the shell route.

## ADR-005 — Angular Material 3 with system tokens

**Decision:** Use `mat.theme()` (azure primary, blue tertiary, Roboto, density 0). Component styles
use `--mat-sys-*` variables and `mat.<component>-overrides()` mixins instead of overriding internal
Material CSS classes. App-specific spacing and layout values are `--app-*` custom properties.
**Why:** Token overrides are Material's supported customization API and survive library upgrades.
**Dependencies added:** `@angular/material` (UI components) and `@angular/cdk` (Material's required
peer; also used directly for `BreakpointObserver`).

## ADR-006 — Material Symbols icon font

**Decision:** Load the Material Symbols Outlined font in `index.html` and set
`MAT_ICON_DEFAULT_OPTIONS.fontSet` to `material-symbols-outlined`.
**Why:** Material Symbols replaces the legacy Material Icons font. Without the provider, `<mat-icon>`
would apply the legacy font class and render the ligature names as plain text.

## ADR-007 — Responsive state with RxJS-to-Signal interop

**Decision:** `core/services/viewport.ts` converts the CDK `BreakpointObserver` stream into a
`Signal<boolean>` with `toSignal`. `AppShell` derives the sidenav mode and open state with
`computed()` and keeps separate desktop and compact open states.
**Why:** RxJS stays responsible for the external event stream, and signals are used for template state,
in line with the architecture's state-management strategy.

## ADR-008 — Container-style shell, presentational header and sidebar

**Decision:** `Header` and `Sidebar` receive data through `input()` and report user actions through
`output()`. Only `AppShell` holds state and injects services.
**Why:** It keeps the layout parts small, reusable, and easy to test in isolation.

## ADR-009 — File naming follows the Angular 20+ style guide

**Decision:** Files are named without type suffixes (`app-shell.ts` → `AppShell`,
`viewport.ts` → `Viewport`), matching what the Angular CLI generates.
**Why:** It is the current official style guide and keeps hand-written files consistent with
generated ones. Phase 2 follows the same rule (`auth-store.ts`, `auth-guard.ts`,
`auth-interceptor.ts`) instead of the `auth.service.ts` style.

## ADR-010 — HttpOnly cookie sessions instead of JWTs in storage

**Decision:** `POST /api/auth/login` creates an opaque, random server-side session and sets it
as an `HttpOnly; SameSite=Strict; Path=/api` cookie with a fixed 30-minute lifetime. The SPA
never sees the session id. No access or refresh tokens exist, so nothing sensitive is kept in
`localStorage` or `sessionStorage`.
**Why:** XSS cannot read the credential, logout really invalidates it on the server, and
session restore after refresh is just `GET /api/auth/me`.
**Trade-offs:** Cookies need CSRF protection (ADR-011). A cross-origin API would need CORS with
credentials and `SameSite=None; Secure`. `Secure` is omitted because the dev server uses plain HTTP.

## ADR-011 — Double-submit XSRF token for mutating requests

**Decision:** Login also sets a readable `XSRF-TOKEN` cookie bound to the session. Angular's
built-in `HttpClient` XSRF support copies it into `X-XSRF-TOKEN` on non-GET same-origin requests,
and the API rejects authenticated mutations (currently logout) whose header does not match.
**Why:** It adds defence in depth on top of `SameSite=Strict`, with no custom frontend code.

## ADR-012 — Development-only mock API built on Node.js built-ins

**Decision:** `mock-api/` is a small `node:http` server with in-memory sessions, scrypt
password hashes, and role checks, proxied by the Angular dev server (`proxy.conf.json`).
**Why:** JSON Server cannot issue HttpOnly cookies or enforce per-endpoint roles without custom
middleware, and the requirement was to avoid unnecessary dependencies. The proxy keeps the API
same-origin, so `SameSite=Strict` cookies work. Tests use `node:test` and real HTTP.

## ADR-013 — Signal-based `AuthStore` with an RxJS data layer

**Decision:** `AuthApi` is stateless HTTP. `AuthStore` holds one private `signal<AuthState>` and
exposes read-only `computed` slices (`user`, `status`, `isAuthenticated`, `role`, `loginPending`,
`loginError`). Async work (login, logout, restore, expiry timer) uses RxJS. NgRx is not used.
**Why:** A single state object keeps transitions atomic. Computed signals give derived state for
templates, and RxJS handles cancellation and concurrency (`shareReplay` lets concurrent guards
share one restore request).

## ADR-014 — Guards wait for session restoration

**Decision:** Guards call `authStore.ensureInitialized()`, which performs `GET /auth/me` once
per app load. There is no `APP_INITIALIZER`.
**Why:** Bootstrapping is never blocked, and the first navigation simply waits for the guard.
`canActivateChild` on the shell re-checks the session on every in-shell navigation.
`roleGuard` is a typed factory (`roleGuard(['ADMIN'])`) rather than reading untyped `route.data`.

## ADR-015 — Lazy-loaded shell

**Decision:** The shell route now uses `loadComponent` (updates ADR-004).
**Why:** With login outside the shell, guests never need the sidenav, toolbar, or menu code.
That keeps the initial bundle within the 500 kB budget (460 kB raw, about 115 kB transferred).

## ADR-016 — Error handling split between interceptor and callers

**Decision:** `errorInterceptor` handles 401 (end session, redirect to login with
`reason=expired` and `returnUrl`) and 403 (keep session, show a snackbar), then re-throws.
Auth endpoints opt out through the `SKIP_SESSION_HANDLING` `HttpContextToken`.
**Why:** Without the opt-out, a failed login or restore would trigger a redirect (a loop risk).
`handleUnauthorized()` is idempotent, so parallel 401s redirect only once. `returnUrl` is
validated (`safeReturnUrl`) to prevent open redirects.
