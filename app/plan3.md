# Phase 3 Plan: Full UI Standardization and Cleanup

## Summary
- Phase 3 finishes the `ui.shadcn` adoption by targeting the remaining custom interaction shells and reducing long-term dependence on one-off global UI CSS.
- This phase is about consolidation: replace the highest-maintenance custom UI patterns, standardize composition rules, and leave the app with a clear default way to build new screens.
- Keep backend behavior unchanged. The focus is UI architecture, consistency, and cleanup.

## Milestones

### 1. Mobile Interaction Components
- Rework the remaining custom guest mobile interaction shells into standardized primitives or local wrappers built on shadcn-friendly patterns:
  - mobile order sheet / drawer
  - section navigator / floating action panel
  - dismiss / close action patterns
- Decide on a single reusable pattern for overlay-style mobile interactions and use it consistently.
- Acceptance: guest mobile ordering no longer depends on bespoke overlay structure that only exists in one screen.

### 2. Remaining Reusable UI Extraction
- Extract the repeated higher-level display components that are still embedded inside screens:
  - order card
  - session card
  - service request card
  - stat/metric card
  - empty-state card
  - action group
- Keep these as app-specific composition components built from shadcn primitives, not raw generated components.
- Acceptance: the major guest/admin screens compose from shared domain UI blocks instead of duplicating markup.

### 3. Global CSS Reduction
- Audit `src/app/globals.css` and remove UI rules that are replaced by shadcn primitives or shared wrappers.
- Keep only the CSS that still has a clear global responsibility:
  - theme tokens
  - page-level layout primitives
  - a small number of app-wide utility classes that still earn their keep
- Eliminate stale selectors for old button, form, dialog, status, and card variants that are no longer referenced.
- Acceptance: global CSS is materially smaller and mostly limited to tokens, layout, and a few intentional app utilities.

### 4. Screen Consistency Pass
- Standardize the remaining untouched screens and support components so they follow the same component model:
  - loading states
  - notifier/pop-up surfaces
  - receipt/support utility screens where shared UI patterns already exist
- Replace inconsistent button, alert, card, and status treatments with the Phase 1-2 shared component set.
- Acceptance: there is no obvious “old UI system vs new UI system” split across the app.

### 5. Composition Rules and Developer Defaults
- Establish the repo’s default layering for UI work:
  - shadcn primitives in `src/components/ui`
  - app-specific shared wrappers/components above them
  - feature screens composed from those shared pieces
- Document which old CSS classes are intentionally retained and which patterns should not be reintroduced.
- Acceptance: a new engineer can tell which layer to extend without inspecting old screens for precedent.

### 6. Validation and Cleanup Gate
- Run `npm run lint -w app`, `npm run typecheck -w app`, and `npm run build -w app`.
- Manually verify:
  - guest mobile ordering interactions
  - admin dialogs and action flows
  - notifier/pop-up surfaces
  - loading and empty states
  - light/dark theming across all major routes
- Acceptance: no broken interactions, no mixed legacy/new styling on major routes, and no unused high-signal UI CSS left behind.

## Public Interfaces / Types
- New higher-level shared app components may be introduced for order/session/request/stat cards and overlay shells.
- `src/components/ui/*` remains the primitive layer; Phase 3 should not expand it unnecessarily beyond what shared composition components need.
- No backend or data-contract changes.

## Explicit Non-Goals
- Do not redesign product flows or change business behavior.
- Do not chase purely cosmetic tweaks unrelated to standardization/cleanup.
- Do not keep both old and new shared UI paths alive if one can be cleanly retired.

## Assumptions
- Phases 1 and 2 are complete first.
- By Phase 3, the main remaining work is custom mobile shells, duplicated domain card markup, and global CSS cleanup.
- The desired end state is a clear, maintainable component system rather than a one-to-one shadcn replacement of every visual detail.
