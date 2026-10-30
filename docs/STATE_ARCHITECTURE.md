# State and API architecture audit — Phase 6

This phase changes request/state architecture only. No business feature, backend endpoint,
role, authorization rule, dependency or bundle budget was added/changed.

## Concrete findings and focused fixes

| Priority | Before | After / reason |
| --- | --- | --- |
| High | Feature stores exported writable signals; the template called `currentStep.set` directly. | Writable signals are private; public state uses `asReadonly`/computed, and `setStep` is an explicit command. Typed Reactive Forms remain an intentional input/editing surface. |
| High | Login marked pending before subscription; concurrent subscriptions could send duplicate requests. Login/restore could finish after logout and restore stale identity. | Auth operations are cold and single-flight. Login/restore are canceled on session invalidation, with epoch checks. Logout clears local identity immediately and finishes the server logout even if an individual observer leaves. |
| High | Loading/error booleans had several independent implementations. Most canceled reads left loading true after injector destruction. | One small operation-local request lifecycle exposes idle/loading/success/error, computed loading, normalized failure and cancellation-safe finalization. |
| Medium | Rapid independent filter commands could each merge with the last committed URL, dropping a filter before navigation completed. | A short-lived pending navigation patch accumulates commands until the matching navigation settles. Rendered query/data still come from the URL. |
| Medium | A server-clamped page updated the URL, then fetched the exact same page again. | The last completed canonical query and retry generation identify the already-returned page. URL replacement does not issue a second GET; explicit retry still does. No cross-page result cache was introduced. |
| Medium | Retry could start another identical pending read. Claim review responses could issue obsolete history reads after navigating elsewhere. | Pending retries are guarded, IDs/queries are deduplicated, and view epochs reject old mutation results and skip obsolete follow-up history requests. |
| Medium | 403 generated a global snackbar plus the feature's inline error. Error formatting duplicated status checks and sometimes surfaced raw server messages. | Feature APIs opt into local error rendering without disabling 401 handling. One error normalizer provides safe text and retains the original cause/status separately. Default global 403 behavior remains for requests without a local owner. |
| Medium | Policy Details owned HTTP/lifecycle logic in the component. Policy Form loaded agents directly and initialized only from a route snapshot. | Page-scoped `PolicyDetailsStore` owns the request. PolicyFormStore owns agent lookup/default assignment; the page observes distinct route IDs, enabling correct reused-route restoration. |
| Low | Every form keystroke disabled/re-enabled all product groups. | Product activation runs on product-control changes only; root form changes update the serialized review snapshot. Silent restoration still explicitly activates the selected product. |
| Low | A filter change could overwrite pending policy-search text via URL/form restoration. API services relied on inferred return types. | Filter actions commit the current search text with the changed filter. API methods have explicit typed Observable returns and retain the existing query/body mapping and wire contracts. |

The audit also reviewed functional guards, interceptor credential scoping, API return
mapping, `shareReplay`, `toSignal`, effects and DI lifetimes. Guards continue waiting for
session restoration. HttpOnly cookies, XSRF and backend authorization remain unchanged.

## Store and service conventions

- API services are root-scoped and stateless. They use typed HttpClient calls and explicit
  response mapping (for example history/notes `{items}` and Users `{data}`). Queries use
  the existing typed parameter objects; no endpoint repository/generic query engine was added.
- AuthStore is root-scoped because it represents the application session. Policy/Claims
  list, create/form and detail stores are component-scoped and destroyed on page exit.
- `signal` is writable only inside its owner. Public signals are readonly, and derived
  state uses computed. Angular readonly signals are shallow: callers must not mutate
  returned arrays/objects. Forms retain their normal mutable control APIs for user input.
- `core/http/request-state.ts` holds lifecycle **only**, not business data, transport,
  caching, routing or retries. Each operation owns a separate instance, so concurrent
  agent lookup, draft load, save, submit and discard do not share status accidentally.
- `requestStatus` (or operation-specific `*Status`) is idle/loading/success/error. Existing
  loading/error UI aliases are retained; loading is computed from status. Auth's existing
  domain `status` remains unknown/authenticated/unauthenticated, separate from HTTP status.
- A request starts on subscription. Success/error ends loading; cancellation or empty
  completion returns a still-loading request to idle. A generation token prevents an old
  error/finalizer from changing a newer operation's state.
- Business validation messages and confirmation state remain feature-owned. An HTTP
  success can still yield a domain rejection (for example loading a non-DRAFT editor).
  The helper's status describes the HTTP operation, not form validity or approval status.

## RxJS, signals and lifecycle

Read streams keep `switchMap` for obsolete request cancellation and `catchError` inside
the switch so one failed HTTP request cannot terminate future route/filter/retry events.
`takeUntilDestroyed` disposes subscriptions, including root Auth HTTP operations. HTTP
mutations retain duplicate-action guards and backend versions/idempotency. Policy Form
also cancels subscriptions belonging to the prior form context when restoring another
draft. Aborting an HTTP request does **not** roll back a server-side mutation.

Auth restore/login `shareReplay` has a one-value buffer and refCount cancellation; in-flight
references are cleared on finalize, and completed restore is represented by session state.
Logout uses a finite, root-lifetime HTTP operation with one shared result and no observer-
dependent cancellation. First in-flight login wins concurrent submissions; no credentials
or request results are put into persistent storage, and logout prevents new login until
the logout operation completes. No automatic auth/authorization retry was introduced.

The request helper does not itself stop stale **data** updates: callers still use
switchMap, context cancellation or captured view/session epochs. This is intentional,
keeping concurrency choices explicit rather than hiding them in a generic store.

`toSignal` remains appropriate for UsersPage's single local read and Viewport's external
breakpoint stream. UsersPage's success discriminator now uses `success`. Effects remain
only where imperative integration is necessary: silent input/URL → FormControl restoration
and resetting a successfully saved note. No effect-based signal-to-signal propagation
or duplicate observable/render-state representation was added.

## Error and notification ownership

`ApiError` contains safe `kind`, HTTP status, user message, retryability and original
`cause: unknown` for debugging. Statuses 0, 400, 401, 403, 404, 409, 422 and 5xx have explicit
mapping. Raw response messages, stack traces and payloads are not placed into UI messages.
Feature-specific text can provide context while preserving the technical failure object.

`featureHttpContext()` sets `HANDLE_API_ERROR_LOCALLY`; this suppresses only the global
403 snackbar. 401 still invalidates the session through the existing interceptor.
`SKIP_SESSION_HANDLING` remains reserved for self-handled auth endpoints. A 403 never
logs the user out. No interceptor retries requests or shows a second feature error toast.
Validation/conflict/permission errors are not marked automatically retryable; retries
remain explicit commands. Current UI error/retry layouts were retained.

## Intentional boundaries / remaining limitations

- No NgRx, generic repository, global entity cache, new business flow or backend refactor.
- The pending query accumulator stores navigation intent only and is released on
  navigation settlement; canonical-page suppression is limited to the page-scoped store.
- Form editing and DTO collections are not deep-frozen. The readonly signal boundary is
  enforced at the signal API, with existing immutable updates used inside stores.
- Cancellation protects client state but cannot guarantee mutation rollback. Existing
  version/idempotency and single-process mock file-store limits still apply.
- The initial-bundle warning remains. Budgets were not increased; no unrelated UI redesign
  or manual visual browser review is claimed.

## Files

New:

- `src/app/core/http/api-error.ts`
- `src/app/core/http/request-state.ts`, `request-state.spec.ts`
- `src/app/core/http/feature-http-context.ts`
- `src/app/features/policies/state/policy-details-store.ts`
- `docs/STATE_ARCHITECTURE.md`

Modified groups:

- `core/auth/auth-store.ts` and its tests: cold shared operations, invalidation, lifecycle.
- `core/interceptors/http-context.ts`, `error-interceptor.ts` and tests: error ownership.
- Policy and Claims data-access services; UsersApi: explicit return types/local error context.
- PolicyStore/ClaimsStore and tests: readonly state, lifecycle, canonical URL and rapid commands.
- PolicyFormStore and tests: readonly commands, operation lifecycles, agent lookup and context cleanup.
- ClaimCreateStore/ClaimDetailsStore and tests: readonly state, lifecycle and stale-response handling.
- Policy Details/Form pages and Form HTML: delegate store state and commands, observe route ID.
- PolicyFilters and tests: preserve pending search during another filter action.
- Claims API tests and `claim-error.ts`: verify context and use the shared error normalizer.
- UsersPage: keep `toSignal`, align the success discriminator.
- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`: current conventions/results.

## Interview questions

Final verification: 33 Angular test files / 180 passing tests, 36 passing backend regression
tests, successful production build (511.79 kB initial, 11.79 kB above the existing warning
budget), and passing `git diff --check`. Tests cover all existing workflows plus cold/shared
Auth operations, logout invalidation/reentrancy, lifecycle cancellation/finalization, safe
error mapping, local 403 ownership/global 401 behavior, rapid filter command merging,
canonical-page deduplication, form-context cancellation and readonly signal boundaries.

1. What does `asReadonly()` protect, and why does it not deep-freeze a signal's value?
2. Why must `catchError` remain inside switchMap for a reusable URL-driven request stream?
3. How can an old `finalize` incorrectly clear a newer loading state, and how does a generation token prevent it?
4. Why should HTTP/session operations start in `defer`, and how do refCount and scope affect sharing/cancellation?
5. Why are backend versions/idempotency still required when the client cancels requests and blocks duplicate clicks?
