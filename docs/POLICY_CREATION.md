# Policy Creation and Draft Editing

Phase 4 implements the explicitly requested creation/editing workflow. Authentication,
Claims, user management and approval processing are unchanged.

## User workflow

- Open **Create Policy** from the list (`/policies/new`).
- Use the Material Stepper: Customer → Product → Coverage → Review & Submit.
- Save an incomplete draft at any step. For new Admin drafts the first available Agent
  is selected initially, so incomplete customer/product steps do not prevent saving.
  Admins can change the assigned Agent in Coverage;
  the backend always assigns an Agent's own account regardless of the supplied ID.
- Continue a saved draft from list **Edit Draft** or details **Continue Draft**
  (`/policies/:id/edit`). After the first save the new page adds `?draft=:id`, so a
  refresh restores the same draft without resetting the current step while saving.
- Review all customer/product fields, beneficiaries or additional persons, optional
  benefits, dates, assigned Agent and estimated USD premium before submitting.
- Submit validates all steps, saves the current values, then submits the returned version.
  Success changes DRAFT to PENDING and opens details. Pending/final records are read-only.
- Discard requires a Material confirmation dialog and removes the persisted draft.
  Router navigation warns about unsaved changes; browser reload/close uses the native
  warning. Navigation is blocked during writes to avoid abandoning an uncertain mutation.

Saved draft and submitted record changes appear on the next list/details load; the
existing page-scoped list store issues fresh HTTP requests when returning to the list.

## Forms and state

`createPolicyForm` defines typed `FormGroup`, `FormControl` and `FormArray` structures.
There is one shared vehicle group for Third Party and Car Body. Inactive product groups
are disabled, rather than removed, preserving values while switching products in the
current page. Only the selected product is serialized/persisted. Third Party disables
the vehicle value requirement; Car Body enables it.

Life uses a beneficiary `FormArray` (maximum 20), unique national IDs and shares totaling
100%. Health uses an additional-person `FormArray` (maximum 20), unique IDs including the
primary customer, and total count equal to the customer plus additional persons.
Coverage requires valid Gregorian dates with end strictly after start. Birth dates cannot
be in the future (UTC date). Mobile format is `09` plus nine digits. National IDs require
exactly ten ASCII digits; this is **format validation**, not identity/checksum verification.

The page-scoped `PolicyFormStore` owns the form and signals for current step, selected
type, saving/submission/loading/errors, saved draft and saved/unsaved state. Computed
signals derive draft status and estimated premium. Unlike React controlled inputs,
Reactive Forms controls own field values, validity and touched state; signals expose a
serialized view for rendering the workflow/review. RxJS handles HTTP chains and errors;
`switchMap` cancels obsolete draft loads and sequences save → submit. Mutations are
explicitly guarded against concurrent clicks; subscriptions use `takeUntilDestroyed`.

Draft saving is explicit rather than autosaved, avoiding hidden writes while a user is
switching products or correcting invalid data. Failed saves retain entered data. The
first create request retains an idempotency key and its payload until acknowledged. If
the response was lost and the user later changes fields, retry first recovers the created
ID and then PATCHes the later edits. It cannot create a duplicate or mark those edits saved
without persisting them. Version conflicts preserve the form and request a reload.

## API write contract

Existing `GET /api/policies` and `GET /api/policies/:id` remain compatible. Details add
optional `formData` and `version`; legacy seed records without application data can be
completed through the draft form. UUID-backed new IDs coexist with numeric seed IDs.

All writes require the existing HttpOnly session cookie and valid `X-XSRF-TOKEN` header.
The input contract is `DraftRequest` in `models/policy-form.ts`:

```json
{
  "customer": {
    "fullName": "Fictional Customer",
    "nationalId": "1234567890",
    "mobile": "09123456789",
    "dateOfBirth": "1990-01-01",
    "email": "customer@example.test"
  },
  "insuranceType": "Third Party",
  "product": { "plate": "DEMO-123", "model": "Demo Sedan", "year": 2020, "value": null },
  "coverage": { "startDate": "2027-01-01", "endDate": "2028-01-01", "options": ["Accident"] },
  "agentId": "u-1002"
}
```

Product schemas:

| Type | Product fields |
| --- | --- |
| Third Party / Car Body | `plate`, `model`, `year`, `value` (Car Body requires a positive value) |
| Life | `coverageAmount`, `paymentFrequency` (Monthly/Quarterly/Annual), `beneficiaries: {fullName,nationalId,share}[]` |
| Fire | `propertyType` (Residential/Commercial), `propertyValue`, `address` |
| Health | `insuredPersons`, `plan` (Basic/Standard/Premium), `additionalPersons: {fullName,nationalId,dateOfBirth}[]` |

| Endpoint | Contract |
| --- | --- |
| `POST /api/policies` | Create DRAFT; requires `Idempotency-Key` (10–100 alphanumeric/hyphen characters). Returns 201 with policy/version. Same user/key/payload replays the record; a changed payload returns 409. Authorization is rechecked on replay. |
| `PATCH /api/policies/:id` | Full editable form snapshot plus `version`; not arbitrary JSON Patch. Returns updated DRAFT/version. |
| `POST /api/policies/:id/submit` | `{version}`; validates persisted application in full and atomically transitions DRAFT → PENDING. Returns updated policy/version. |
| `DELETE /api/policies/:id` | `{version}`; deletes an authorized DRAFT only; returns 204. Added to support the requested Discard Draft action. |

Admin may modify any draft; Agent may modify only assigned drafts. Server-managed ID,
number, status, premium and timestamps cannot be overwritten by request fields. Backend
validation independently checks input shape, types, lengths, allowed options and business
rules. Drafts can omit required values using empty strings/null/empty arrays; malformed
shapes, non-finite/negative numbers and invalid non-empty dates are rejected. Submit
requires all active-product/customer/coverage rules. Equal/concurrent versions serialize
through the repository; only one update/submission succeeds.

Responses use the existing `{status,message}` errors: 400 for malformed requests or missing
creation key, 401 for no session, 403 for permissions/XSRF, 404 for missing records, 409 for
stale versions/non-DRAFT writes, 422 for validation, 500 for unexpected persistence errors.
Idempotency metadata is stored privately and omitted from list/detail responses.

## Persistence and limitations

The development server persists records to ignored `mock-api/.data/policies.json`, using
a serialized mutation queue and temporary-file rename. State becomes visible in memory
only after a successful disk write. Restart preserves policies; sessions remain in memory
and require signing in again. Tests use isolated repositories/temp files. This file store
supports one server process; a production backend needs a database/transactions, backups
and normal production controls.

Pricing is a deterministic demo estimate, recalculated by the backend: base premiums
(Third Party 300, Car Body 500, Life 400, Fire 250, Health 350 USD) plus 100 USD per optional
benefit (Accident, Disability, Emergency assistance). No real underwriting, payments,
identity verification, or approval actions are implemented. Inactive product values are
kept only within the current form session, not persisted as hidden drafts. The server
update contract replaces the complete editable snapshot and rejects stale versions.

Production build requires network access for the existing Google Fonts inlining. The
existing 500 kB initial-bundle warning remains; budgets were not increased. Responsive
behavior is covered by layout implementation/component tests; no manual visual browser
review is claimed.

## Change inventory

New files under `src/app/features/policies/`:

- `models/policy-form.ts`
- `forms/policy-form-factory.ts`, `policy-form-factory.spec.ts`, `policy-validators.ts`, `unsaved-policy-guard.ts`
- `state/policy-form-store.ts`, `policy-form-store.spec.ts`
- `components/customer-form.ts`, `product-form.ts`, `product-form.html`, `coverage-form.ts`
- `components/policy-field.ts`, `policy-form-fields.scss`, `policy-review.ts`, `policy-review.html`, `draft-confirm.ts`
- `pages/policy-form/policy-form-page.ts`, `policy-form-page.html`, `policy-form-page.scss`, `policy-form-page.spec.ts`

New backend files: `mock-api/policy-repository.mjs`, `policy-validation.mjs`, `policy-workflow.test.mjs`.

Modified: `.gitignore`, `mock-api/app.mjs`, `mock-api/policies.mjs`, `mock-api/server.mjs`,
`src/app/app.spec.ts` (allow enough time for first lazy-import resolution), policy model,
PolicyApi, policy routes, table actions, listing page TS/HTML, details TS/HTML/spec
(spec formatting only), and project documentation. Authentication code is unchanged.

## Angular interview questions

Final verification: 22 Angular test files / 124 passing tests, 27 passing Node API tests,
successful production build (509.08 kB initial, 9.08 kB above the existing warning budget),
and a passing `git diff --check`. Tests cover validators, dynamic arrays/conditional groups,
step navigation/review, Admin partial drafts, save/restore, cancelable loads, error recovery,
duplicate prevention, unsaved/discard confirmation, role checks, persistence after restart,
optimistic conflicts, and successful/concurrent submissions for all five products.

1. What do typed `FormGroup` and `FormArray` guarantee that a plain JSON form object does not?
2. Why disable inactive groups instead of removing validators or recreating the form on every product change?
3. How does `getRawValue()` differ from `.value` when controls are disabled?
4. Why are cross-field validators attached to groups while HTTP request state is managed with signals/RxJS?
5. Why should cancellable reads use `switchMap`, while writes require duplicate-action guards and backend version checks?
