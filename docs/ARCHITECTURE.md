# Technical Architecture Plan

## Enterprise Insurance Management Portal — v1.0

### 1. Technology Stack

- Angular — latest stable compatible version
- TypeScript — strict mode
- Angular Material + SCSS
- Angular Router — lazy-loaded routes
- Angular Signals — local and feature state
- RxJS — asynchronous data streams
- Typed Reactive Forms
- REST API
- JSON Server or equivalent mock backend
- Vitest — unit testing
- ESLint + Prettier

### 2. Architectural Principles

1. Feature-based folder structure.
2. Standalone components.
3. Separation of presentation, state, and data access.
4. Dependency injection for services.
5. Immutable state updates.
6. Type-safe API contracts.
7. No unnecessary global state management.
8. Testable business rules.

### 3. Folder Structure

```text
src/app/
├── core/
│   ├── auth/
│   ├── guards/
│   ├── interceptors/
│   └── services/
├── layout/
│   ├── app-shell/
│   ├── sidebar/
│   └── header/
├── shared/
│   ├── components/
│   ├── directives/
│   ├── pipes/
│   ├── models/
│   └── utils/
├── features/
│   ├── dashboard/
│   ├── policies/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── data-access/
│   │   ├── state/
│   │   └── models/
│   ├── claims/
│   └── users/
├── app.config.ts
└── app.routes.ts
```

### 4. State Management Strategy

**Signals**

- Local UI state.
- Selected filters.
- Form workflow state.
- Feature-level derived state.
- Loading and error states.

**RxJS**

- HTTP request composition.
- Debounced search.
- Cancellation of obsolete requests.
- Combining asynchronous streams.
- Handling asynchronous errors.

**Computed Signals**

- Derived metrics.
- Selected policy information.
- UI availability and permissions.

Avoid introducing NgRx until a clear architectural need exists.

### 5. API Design

**Authentication**

- POST /auth/login
- POST /auth/refresh
- GET /auth/me

**Policies**

- GET /policies
- GET /policies/:id
- POST /policies
- PATCH /policies/:id

**Claims**

- GET /claims
- GET /claims/:id
- POST /claims
- PATCH /claims/:id/status

**Users**

- GET /users
- PATCH /users/:id

API responses should support typed DTOs, pagination metadata, and predictable error structures.

### 6. Authentication & Authorization

- Functional route guards.
- HTTP interceptor for attaching access tokens.
- Refresh-token handling where supported by the mock backend.
- Role-based route and action permissions.
- Session-expiration handling.

Client-side authorization is for UI behavior only. The mock backend must also enforce permissions on protected endpoints.

### 7. Forms Architecture

Use Typed Reactive Forms with:

- FormGroup
- FormControl
- FormArray
- Synchronous validators
- Cross-field validators
- Conditional validation
- Dynamic field configuration

Form steps:

1. Customer Information
2. Insurance Product
3. Coverage Details
4. Review & Submit

### 8. Testing Strategy

**Unit tests**

- Custom validators.
- Permission helpers.
- Status transition rules.
- State services.

**Component tests**

- Form validation.
- Conditional field rendering.
- Loading and error states.
- User interaction.

**Integration tests**

- Policy creation.
- Authentication and guarded navigation.
- Claim status transitions.

Use HTTP mocking rather than live network requests in unit tests.

### 9. Performance Strategy

- Lazy-loaded feature routes.
- OnPush change detection.
- Computed Signals.
- Debounced search.
- Request cancellation.
- Pagination for large datasets.
- Stable tracking keys in repeated templates.

### 10. Engineering Quality Gates

Before completing each phase:

- Application builds without errors.
- TypeScript strict checks pass.
- Relevant tests pass.
- No unnecessary dependencies.
- No hardcoded secrets.
- Loading, empty, and error states are handled.
- Code is reviewed for accessibility.
- Architecture decisions are documented.

### 11. Deployment

Deploy the Angular frontend to a static hosting provider and deploy the mock API separately if required.

Use fictional seed data and clearly label demo authentication.

### 12. Documentation

Maintain:

- README.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/PROGRESS.md

Every completed phase should update progress and architectural decisions.
