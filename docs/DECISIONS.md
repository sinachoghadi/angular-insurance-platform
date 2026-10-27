# Architecture Decision Log

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
generated ones.
