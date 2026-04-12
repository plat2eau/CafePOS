# Phase 2 Plan: Shared Interactive Surfaces

## Summary
- Phase 2 extends the Phase 1 foundation from simple forms into the app’s repeated interactive UI patterns.
- Scope is limited to shared surfaces used by the guest ordering flow and the admin console/detail screens.
- Keep business logic, routing, polling, and Supabase behavior unchanged. Focus on replacing repeated custom UI structure with shadcn-backed building blocks and thin local wrappers.

## Milestones

### 1. Shared Feedback and Display Primitives
- Add the next small set of shadcn primitives needed across multiple screens: `Alert`, `Badge`, `Textarea`, and `Separator`.
- Create thin local wrappers for repeated patterns already used in multiple places:
  - flash/status message
  - status chip
  - summary row
  - section card variants
- Map existing CafePOS styling onto these wrappers so current visual tone stays intact.
- Acceptance: `AdminConsole`, `AdminTableDetailClient`, `GuestOrderingExperience`, and `GuestServiceRequestPanel` can all consume the same feedback/display primitives without changing behavior.

### 2. Search and Quantity Interaction Slice
- Refactor `SearchBar` to use shadcn `Input` and `Label` while keeping its current public props unchanged.
- Extract a shared quantity-stepper component for the repeated `+ / count / -` control used in guest ordering and admin order composition.
- Keep existing search filtering and quantity state logic exactly as-is.
- Acceptance: guest and admin order-building surfaces share the same search and quantity UI primitives.

### 3. Dialog and Action Shells
- Introduce shadcn `Dialog` for the admin add-order modal and the clear-table confirmation modal.
- Standardize dialog header, body, footer, and close/cancel actions with local wrappers where needed.
- Use shadcn `Textarea`, `Input`, and existing Phase 1 button primitives inside these dialogs.
- Keep the unique order-builder layout inside the admin dialog; only the shell and repeated form controls are standardized.
- Acceptance: both admin dialogs render through the same dialog system and preserve current open/close/loading behavior.

### 4. Guest Ordering Surface Migration
- Migrate `GuestOrderingExperience` to the shared Phase 1 and Phase 2 primitives for:
  - success/error feedback
  - category/item cards
  - order summary rows
  - note textarea
  - quantity controls
  - search bar
- Migrate `GuestServiceRequestPanel` to the same shared button, textarea, card, and status-message patterns.
- Keep the mobile bottom order sheet and category navigator custom in Phase 2; do not replace them with shadcn `Sheet` or `Drawer` yet.
- Acceptance: guest ordering and service-request panels use the shared component layer, while current cart drawer and navigator behavior remain unchanged.

### 5. Admin Feed and Detail Surface Migration
- Migrate `AdminConsole` and `AdminTableDetailClient` to shared cards, badges, alerts, summary rows, and dialog shells.
- Standardize status/action areas:
  - flash banners
  - order/session cards
  - order status badges
  - action button group styling
- Keep data refresh intervals, receipt flow, redirect behavior, and status mutation logic unchanged.
- Acceptance: admin overview and table-detail screens share the same presentation primitives and no longer rely on duplicated UI structures.

### 6. Validation Pass
- Run `npm run lint -w app`, `npm run typecheck -w app`, and `npm run build -w app`.
- Manually verify:
  - guest ordering search, item quantity changes, note entry, and order placement
  - guest service request open/cancel/submit flow
  - admin add-order modal for both table and out-order flows
  - admin clear-table modal, receipt-open flow, and order-status updates
  - light/dark theme consistency on migrated guest and admin screens
- Acceptance: no behavioral regressions and no obvious visual mismatch between old and new primitives on touched screens.

## Public Interfaces / Types
- New internal shared UI surface for Phase 2:
  - feedback wrapper
  - status badge wrapper
  - summary row wrapper
  - quantity stepper
- `SearchBar` keeps its current prop contract.
- No API, schema, route, or backend type changes.
- No changes to current page/component entry props unless required for a purely presentational wrapper, and those should be avoided.

## Explicit Non-Goals
- Do not migrate the guest mobile bottom sheet/navigator to new primitives in this phase.
- Do not redesign page layouts or replace all global CSS utilities.
- Do not touch Supabase integration, route handlers, polling cadence, or business rules.

## Assumptions
- Phase 1 is complete first: Tailwind v4, shadcn setup, token bridge, and core form primitives already exist.
- Phase 2 is the “shared surfaces” phase, not the “full visual rewrite” phase.
- Unique mobile interaction widgets remain custom until a later phase because they require more context and carry higher regression risk.
