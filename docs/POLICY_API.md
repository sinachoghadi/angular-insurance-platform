# Policy Management API (development mock)

All records are fictional. Premiums are denominated in USD; date-only coverage values
are displayed in UTC to avoid local timezone shifts. There are 180 deterministic records
across five products, five statuses and three agents. National identifiers use a `DEMO-`
prefix and are not valid personal identifiers.

## GET /api/policies

Requires the existing HttpOnly session cookie. Returns:

```json
{ "items": [], "total": 180, "page": 1, "pageSize": 10 }
```

| Parameter | Default | Accepted values / behavior |
| --- | --- | --- |
| `page` | `1` | Positive safe integer; clamped to the last page, or 1 for empty results |
| `pageSize` | `10` | `10`, `25`, `50` |
| `search` | empty | Trimmed, case-insensitive substring of policy number, customer name or national ID |
| `insuranceType` | empty | `Third Party`, `Car Body`, `Life`, `Fire`, `Health` |
| `status` | empty | `DRAFT`, `PENDING`, `ACTIVE`, `REJECTED`, `EXPIRED` |
| `agentId` | empty | Admin-only filter; ignored for agents |
| `startFrom` | empty | Inclusive start-date lower bound, valid `YYYY-MM-DD` |
| `startTo` | empty | Inclusive start-date upper bound, valid `YYYY-MM-DD` |
| `sortBy` | `createdAt` | `policyNumber`, `premium`, `startDate`, `endDate`, `createdAt` |
| `sortOrder` | `desc` | `asc`, `desc` |

Invalid enum, date, pagination and sorting values fall back to safe defaults. An inverted
valid date range returns zero matches. All filters combine with AND. Authorization runs
before filtering; filtering and sorting run before slicing the page. Equal primary sort
values use ascending `id` as a deterministic secondary key. The frontend receives only
one page, never the entire collection.

Example: `/api/policies?page=2&pageSize=25&status=ACTIVE&sortBy=premium&sortOrder=desc`.

## GET /api/policies/:id

Returns a single policy including customer, product, premium, coverage dates, assigned
agent name/ID, status, and created/updated timestamps. The shared read-only contract is in
`src/app/features/policies/models/policy.ts`; an extra DTO mapping layer is unnecessary
because this API already supplies the UI projection.

Both endpoints return 401 without a valid session. Admins can read all records; agents
can read only records whose `agentId` matches the user resolved from the server session.
Detail requests for another agent's record return 403; missing or malformed IDs return
404. Errors retain the existing `{ status, message }` structure. Phase 4 adds the draft
write endpoints documented in [Policy Creation](POLICY_CREATION.md).

## Client behavior

- The URL is the source of truth for listing state. Query parsing handles refresh and
  browser history. Form restoration uses `emitEvent: false` to avoid navigation loops.
- A page-scoped `PolicyStore` exposes signals and computed empty/filter state. It is
  destroyed when leaving the list, preventing cross-account cached data.
- Reactive search uses `debounceTime(300)` and `distinctUntilChanged`. The store combines
  URL changes and retry events with RxJS; `switchMap` cancels obsolete HTTP requests.
  Loading is set inside the new request branch, avoiding canceled-request finalizers
  overwriting the newest loading state. `takeUntilDestroyed` cleans up subscriptions.
- Filters and sorting reset pagination; changing page preserves filters/sort. Detail
  links carry list query parameters and Back to Policies restores them.
- Details have separate loading, not-found, forbidden and retryable-error states.
- Tables scroll within a focusable, labeled region rather than widening the page.

## Limits

This is a development backend, not a production service. Phase 4 adds file-backed draft
persistence, creation/editing and product-specific details; see [Policy Creation](POLICY_CREATION.md).
Legacy seed records do not contain full application data. Claims remain outside this phase.
Production still requires a database, deployed backend authorization and normal production
hardening. Google Fonts inlining requires network
access during the production build. The initial bundle currently exceeds the existing
500 kB warning budget slightly; the 1 MB error budget is unchanged.

## Angular review questions

1. Why use signals/computed for template state and RxJS for asynchronous requests?
2. How does `switchMap` unsubscribe from an obsolete `HttpClient` request?
3. Why should `catchError` live inside `switchMap` when retry must remain usable?
4. How do `emitEvent: false` and query comparison prevent URL/form feedback loops?
5. How does `takeUntilDestroyed` interact with page-scoped DI and zoneless change detection?

## Change inventory

Created under `src/app/features/policies/`:

- `models/policy.ts`, `models/policy-query.ts`, `models/policy-query.spec.ts`
- `data-access/policy-api.ts`, `data-access/policy-api.spec.ts`
- `state/policy-store.ts`, `state/policy-store.spec.ts`
- `components/policy-filters.ts`, `components/policy-filters.spec.ts`
- `components/policy-table.ts`, `components/policy-status-badge.ts`
- `pages/policies-page/policies-page.scss`, `pages/policies-page/policies-page.spec.ts`
- `pages/policy-details/policy-details.ts`, `policy-details.html`, `policy-details.scss`,
  `policy-details.spec.ts` (all four inside `pages/policy-details/`)

Also created: `mock-api/policies.mjs`, `docs/POLICY_API.md`.

Modified: `mock-api/app.mjs`, `mock-api/app.test.mjs`, `src/app/app.spec.ts`,
`src/app/features/policies/policies.routes.ts`,
`src/app/features/policies/pages/policies-page/policies-page.ts`,
`src/app/features/policies/pages/policies-page/policies-page.html`,
`docs/PROGRESS.md`, `docs/DECISIONS.md`.
