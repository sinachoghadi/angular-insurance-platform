# Enterprise Insurance Management Portal

## Product Requirements Document — v1.0

### 1. Product Overview

A modern enterprise web application for managing insurance policies, claims, agents, and operational workflows.

The product simulates real-world insurance operations and is designed to demonstrate production-style Angular engineering skills.

**Project type:** Portfolio / Personal Project  
**Target users:** Insurance administrators, insurance agents, claims officers  
**Primary goal:** Build a maintainable, scalable Angular application with realistic business workflows.

### 2. User Roles

**Admin**

- View all insurance policies and claims.
- Manage user accounts and roles.
- Review operational dashboard metrics.
- Change policy and claim statuses.

**Insurance Agent**

- Create and manage assigned policies.
- Search and filter policy records.
- View assigned customers and claims.
- Submit policy requests.

**Claims Officer**

- Review submitted claims.
- Approve or reject claims.
- Add internal review notes.
- View claim status history.

### 3. Core Modules

#### Authentication

- Mock login with role-based access.
- Protected routes.
- Token handling and session restoration.
- Unauthorized and expired-session states.

#### Dashboard

- Total active policies.
- Pending claims.
- Monthly premium summary.
- Policy distribution by type.
- Recent activity feed.

#### Policy Management

- Policy list with server-side pagination.
- Sorting, filtering, and debounced search.
- Policy details.
- Create and edit policy workflows.
- Policy statuses: Draft, Pending, Active, Rejected, Expired.

#### Policy Creation

- Multi-step reactive form.
- Customer information.
- Insurance product selection.
- Dynamic fields based on insurance type.
- Conditional validation.
- Review and submit.
- Save draft.

#### Claims Management

- Claims list and details.
- Create a claim for an active policy.
- Status transitions.
- Review notes.
- Claim history timeline.

Claim statuses: Submitted, Under Review, Approved, Rejected, Closed.

#### User Management

- User listing.
- Role assignment.
- Activate/deactivate accounts.
- Access restricted to Admin.

### 4. UX Requirements

- Responsive desktop-first interface.
- Consistent loading, empty, error, and success states.
- Clear form validation messages.
- Accessible keyboard navigation.
- Confirmation dialogs for critical actions.
- User-friendly error handling.

### 5. MVP Scope

The MVP includes authentication, dashboard, policy listing, policy creation, and basic claims management.

Advanced reporting, file uploads, notifications, and real-time updates are post-MVP features.

### 6. Acceptance Criteria

- Users can log in with demo accounts.
- Users only access authorized routes and operations.
- Policy filters and pagination work correctly.
- Dynamic policy fields respond to selected insurance products.
- Form drafts can be saved and restored.
- Claims follow valid status transitions.
- Core business logic is covered by automated tests.
- The application builds successfully and can be deployed.

### 7. Success Criteria

- A working public demo with fictional data.
- A documented GitHub repository.
- Demonstrable Angular architecture.
- Tests for critical workflows.
- At least five technically defensible resume bullet points.

### 8. Out of Scope

- Real payment processing.
- Real customer or insurance data.
- Production identity verification.
- Real insurance underwriting.
- Real financial transactions.
