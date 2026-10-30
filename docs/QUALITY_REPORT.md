# Phase 07 — Quality Engineering Report

## Baseline (before code changes)

- Installed Angular core: 22.2.3; CLI/build: 22.2.4; TypeScript strict; zoneless standalone.
- Runner: Angular unit-test builder with Vitest 5.0.5 and jsdom. No E2E framework/config or CI workflow found.
- Frontend: 33 files / 180 tests passed (`ng test --watch=false`).
- Backend: 36 tests passed (`node --test "mock-api/*.test.mjs"`).
- Production build: passed; initial 511.79 kB raw / 130.54 kB estimated transfer.
- Warning: initial 500 kB budget exceeded by 11.79 kB. Budgets will not be increased.
- Shell/login/features already lazy loaded; tables server-paginated (10/25/50).
- Existing tests cover auth/guards/interceptors, readonly stores and cancellation, typed
  forms, draft persistence, claims authorization/state machine, notes privacy and URL history.
- Missing: actual browser workflow coverage, CI, coverage instrumentation, offline font
  independence, automated accessibility checks and production deep-route smoke tests.
- Backend is development-only: JSON-file policies/claims/history/notes, in-memory sessions,
  fictional users and credentials, one server process per repository. It is not production infrastructure.
- No baseline E2E or browser runtime profiling was performed. No runtime speed claim is made.

## Final verified results (2026-10-31)

| Check              | Baseline                    | Final                               |
| ------------------ | --------------------------- | ----------------------------------- |
| Angular/Vitest     | 33 files / 180 pass         | 33 files / 182 pass                 |
| Node mock API      | 36 pass                     | 36 pass                             |
| Browser E2E        | Not configured              | 9 pass in real Chrome, 21.4 seconds |
| Initial bundle raw | 511.79 kB                   | 358.20 kB                           |
| Estimated transfer | 130.54 kB                   | 98.35 kB                            |
| Production build   | Pass, 500 kB warning        | Pass, no budget warning             |
| E2E TypeScript     | Not configured              | Pass                                |
| npm audit          | Not measured before changes | 0 reported vulnerabilities          |

Final V8 coverage: statements 89.20% (2720/3049), branches 87.13% (1023/1174),
functions 83.41% (347/416), lines 92.22% (1826/1980).
Specs and test fixtures are excluded. Reports live in `coverage/insurance-portal/`.
There was no instrumented pre-change baseline, so no coverage delta is claimed.
Existing meaningful tests already exercise guards, stores, HTTP cancellation/stale results,
conditional validators, FormArrays, draft restore, permissions and state transitions.
New regressions cover restore/login concurrency and preservation of HTTP errors if
the notification UI fails; the claims table test now checks its scoped accessible name.

Commands executed: `ng test --watch=false` (baseline), `ng test --watch=false --coverage`,
`node --test "mock-api/*.test.mjs"`, `tsc --project tsconfig.e2e.json`,
`ng build --stats-json`, `playwright test`, `npm audit --json` and Prettier on changed files.
The scripts in package.json expose equivalent npm commands.

## Browser integration and isolation

The nine Playwright tests cover Admin/Agent login, invalid credentials, logout and
protected routes; policy search/filter/pagination and URL restoration; detail deep-route
refresh; incomplete draft save/reload and four-step submission; claim eligibility and
creation; Admin review/approval/closure, notes and chronological history; rejection
reason validation; Agent backend restrictions; recoverable HTTP 500; keyboard,
responsive layout and automated accessibility checks.

Each test uses a real Node mock HTTP server, real cookie/XSRF authentication and
separate temporary JSON files. Playwright forwards same-origin API traffic to that
test's server. Servers, connections and files are cleaned up. No reset endpoint was
introduced. Only the recovery scenario injects a one-shot HTTP 500. External browser
requests are blocked and uncaught page exceptions fail tests. Retries are disabled;
assertions wait for observable UI/network completion, without fixed sleeps.

Executed on installed Google Chrome 156.0.8078.48. Downloading Playwright Chromium
was attempted but returned geographic HTTP 403; the actual installed browser was
used successfully. Linux CI is configured to install bundled Chromium. Firefox,
WebKit and remote GitHub runners were not executed here.

One initial E2E expectation incorrectly assumed autofocus; it was corrected to test
Tab navigation. A coverage run overlapped with a production build and hit the existing
5-second routing-test timeout (181 pass / 1 timeout). Running the complete suite again
without an overlapping build passed 182/182; no timeout increase or retry policy hides
the event. Monitor routing-test timing on slower CI hosts.

## Performance findings and changes

Build stats identified eager Material snackbar/CDK overlay code through the root error
interceptor. Loading this rare, unowned 403 notification with dynamic import keeps it
out of startup JS; the original HTTP error is preserved even if notification loading fails.
Initial raw payload fell 153.59 kB (30.0%); estimated transfer fell 32.19 kB (24.7%).
Budgets are unchanged. Route lazy loading remains intact; no generic shared module,
state framework or unrelated feature rewrite was added.

Roboto and Material Symbols are now self-hosted, removing Google's network dependency
from build/browser execution. Font assets are separate downloads and are not included
in the initial JS/CSS comparison. No total font-payload improvement is claimed.

Code review confirms server pagination, bounded page sizes, tracked rows, computed
derived state, debounced/cancelable searches and lifecycle-bound subscriptions.
Existing tests verify stale response prevention and request sharing. No verified need
for virtualization, new memoization libraries or global state was found. No CPU,
memory, LCP, Lighthouse or runtime speed measurements were taken; these remain
recommendations for representative hardware and production data.

## Accessibility

Added claim-specific action names, eligible-policy/submission live announcements and
form `aria-busy`. Real-browser keyboard checks verify login Tab entry, skip link,
dialog Escape dismissal and focus return. Axe scans with WCAG 2 A/AA, 2.1 AA and
2.2 AA tags found zero violations in the tested login, policies (desktop and 390x844),
claim details and review dialog states. The mobile policy page has no document-level
horizontal overflow. Material supplies dialog semantics/focus management.

These are sampled automated checks, not complete WCAG certification. Manual screen
reader, high-contrast, zoom and every error/product form state still need wider review.

## Security review

Guards are UX only; backend tests and browser requests verify session-derived Agent
scope, forged agentId resistance, write XSRF, unauthorized reviews and Admin-only notes.
Existing server validation/state-transition/idempotency tests remain green. No new
credentials, unsafe HTML bypass or browser token persistence was introduced. Sample
accounts/data remain fictional. Auth API contracts and global 401 handling are preserved.

An intermediate dependency audit found a high Vite advisory and a low build advisory.
A targeted CLI/build patch to 22.2.5 updates Vite to 8.3.5; the final installed lockfile
audit reports zero vulnerabilities. This is an advisory scan at execution time, not
a guarantee against unknown vulnerabilities or a penetration test.

## CI and production readiness

`.github/workflows/quality.yml` uses Node 24, npm ci/cache, E2E typecheck, coverage,
backend tests, optional existing lint, production stats build and Chromium E2E.
Required failures fail the job; coverage/browser/build artifacts are retained seven days.
No deployment secrets are required. Workflow configuration is committed to the working
tree; it has not been run on GitHub. No lint command exists, so no lint success is claimed.

The local preview helper verifies the actual production output with SPA deep-route
fallback; E2E refreshes detail URLs. It is not a production web server. README documents
Node requirements, lockfile install, API proxy, browser setup, artifacts and hosting.

Remaining risks: mock sessions are in memory, data uses local JSON files with a single
process, development cookies lack Secure, there is no rate limiting/lockout, and there
is no production database or deployment configuration. Production needs TLS, suitable
security headers/CSP, durable storage/session design and operational monitoring.
Dependency/browser setup needs network; the test scenarios themselves use local data.
