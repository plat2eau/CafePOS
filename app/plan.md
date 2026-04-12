# `ui.shadcn` Adoption Plan with Low-Context Milestones

## Summary
- Introduce `ui.shadcn` in the `app/` workspace in small, self-contained milestones.
- Group work by shared context so each milestone can be implemented with minimal repo-wide understanding.
- Start with setup and shared primitives, then migrate a small set of form-driven UI, then expand only after the pattern is proven.

## Milestones

### 1. Tooling Foundation
- Add Tailwind v4 to `app/` and wire it into the existing Next.js app.
- Initialize shadcn in `app/` and commit the generated baseline files only.
- Add the minimal helper/utilities shadcn expects, including the shared class merge helper.
- Acceptance: app builds, lint/typecheck pass, and no screens are intentionally changed yet.

### 2. Theme Token Bridge
- Map current CafePOS design variables in `src/app/globals.css` to shadcn semantic tokens.
- Keep the current `html[data-color-scheme='dark']` mechanism and existing theme toggle unchanged.
- Ensure legacy global classes and new shadcn primitives can render together without visual breakage.
- Acceptance: light/dark modes still work on existing pages and new primitives inherit the intended colors.

### 3. Core Primitive Slice
- Add only the first reusable shadcn primitives needed for forms: `Button`, `Input`, `Label`, and `Card`.
- Keep these under `src/components/ui` and avoid adding unrelated components.
- Add any very small wrapper logic needed to match current loading/disabled patterns.
- Acceptance: primitives exist, are typed, and can be imported without changing app behavior yet.

### 4. Shared Form Pattern Migration
- Refactor the shared submit-action path around the new `Button` primitive.
- Keep `FormActionButton` as a thin compatibility wrapper so call sites stay stable.
- Standardize status and spacing patterns used by the first migrated forms.
- Acceptance: one shared form-button path works with current pending/loading UX and requires minimal downstream edits.

### 5. Guest Form Pilot
- Migrate `GuestSessionForm` to the new primitives.
- Preserve existing behavior for both non-PIN and PIN flows.
- Do not redesign the surrounding page structure in this pass.
- Acceptance: guest session form matches current behavior, validation, and messaging.

### 6. Admin Form Pilot
- Migrate `AdminLoginForm` to the new primitives.
- Preserve redirect logic, error handling, loading state, and copy.
- Keep page-level layout classes intact; only touch the form surface.
- Acceptance: admin login flow behaves exactly as before with shadcn-backed controls.

### 7. Validation Pass
- Run `lint`, `typecheck`, and `build` in `app/`.
- Manually verify theme toggle, focus states, disabled states, loading states, and status messaging on the two migrated forms.
- Spot-check a few untouched pages to ensure the new foundation did not regress legacy styling.
- Acceptance: all checks pass and no unintended visual regressions are found on unchanged routes.

## Context Grouping
- Shared setup context: Milestones 1-3.
- Shared form/component context: Milestones 4-6.
- Shared verification context: Milestone 7.

## Public Interfaces / Types
- New internal component surface: `@/components/ui/*`.
- New shared utility for class merging.
- No backend, API, Supabase, or schema changes.
- Existing form component props should remain unchanged in this phase.

## Assumptions
- `app/` remains the only workspace touched for shadcn adoption.
- Tailwind v4 is the target track.
- Phase 1 intentionally avoids broad page-layout rewrites and focuses on shared controls plus two pilot forms.
