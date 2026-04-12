# UI Composition Guide

## Default Layering

1. `src/components/ui/*`
   Use this for low-level primitives only: buttons, cards, inputs, badges, dialogs, alerts, labels, and similar building blocks.
2. `src/components/*`
   Build app-specific shared wrappers here on top of the primitives. Current examples:
   - `AppCards.tsx` for order, session, request, metric, and empty-state compositions
   - `AppOverlaySheet.tsx` for guest mobile overlay interactions
3. Route and feature screens
   Compose screens from the shared app components instead of rebuilding card and action markup inline.

## Current Defaults

- For overlay-style mobile interactions, reuse `AppOverlaySheet` instead of screen-specific fixed drawers or floating panels.
- For app-level cards, prefer the shared compositions in `AppCards.tsx` before introducing new screen-local markup.
- For actions, prefer `Button`, `LoadingButton`, `FormActionButton`, and `ActionGroup`.
- For transient status and validation feedback, prefer `FlashMessage`.

## Global CSS That Intentionally Remains

`src/app/globals.css` is now reserved mostly for:

- theme tokens and page background treatment
- page-level layout shells such as `hero`, `heroShell`, `responsiveSplit`, `compactGrid`, and `sectionStack`
- form and search layout helpers such as `formField`, `formActions`, `buttonRow`, and `menuSearchBarWrap`
- a small set of app-wide utility styles for dialogs, loading skeletons, notifier positioning, receipt badges, and admin layouts

## Patterns Not To Reintroduce

- Raw `.card` and `.button` style classes for new UI work
- One-off guest drawer or navigator CSS when `AppOverlaySheet` covers the interaction
- Screen-specific duplicated order/session/request card markup when `AppCards.tsx` already fits
- New global selectors for component-level styling that can live in shared React components instead
