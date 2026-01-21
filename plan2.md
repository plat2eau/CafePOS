# App architecture refactor plan

## Goals
- Centralize header/tabs/action bar in a shared layout
- Clarify page responsibilities and naming (App → MenuPage)
- Move OTP/table session gating to a route guard
- Keep behavior identical; prepare for future pages
- Improve DX: structure, types, and testability

## Proposed structure
- src/layouts/AppLayout.tsx
  - Renders TableHeader, a scrollable Outlet area, BottomActionBar, BottomTabs
- src/routes/MenuPage.tsx
  - Menu UI extracted from current App.tsx (menu-only responsibility)
- src/routes/OrdersPage.tsx
  - Kept as-is, rendered within AppLayout
- src/components/guards/RequireTableSession.tsx (or src/routes/RequireTableSession.tsx)
  - Checks session for :tableId; shows OTPForm when missing/expired; otherwise renders Outlet/children
- src/hooks/useTableSession.ts
  - Returns { status: 'valid' | 'missing' | 'expired', session } for current tableId
- src/utils/tableSession.ts
  - Keep storage helpers

## Routing (main.tsx)
- Parent: /table/:tableId → element: <AppLayout />
- Children (wrapped by RequireTableSession):
  - index → <MenuPage />
  - orders → <OrdersPage />
- Root '/' → redirect to '/table/1'
- Keep NotFound

## Refactor notes
- Remove layout/session checks from MenuPage (previously in App.tsx)
- OTPForm on success calls onVerified; guard re-checks localStorage and reveals Outlet
- Ensure useMenu uses tableId in its query key if applicable
- Optional later: ErrorBoundary at layout, Suspense fallbacks, code-splitting

## Micro tasks

1) Layout
- [ ] Create src/layouts/AppLayout.tsx with:
  - [ ] <TableHeader tableId={useTableId()} />
  - [ ] Content container with overflow scroll and <Outlet />
  - [ ] <BottomActionBar /> and <BottomTabs />
  - [ ] Match current mobile/scroll styling

2) Session guard + hook
- [ ] Create src/hooks/useTableSession.ts:
  - [ ] Read :tableId via useParams
  - [ ] getSession(tableId) + isExpired(sess) → status + session
- [ ] Create src/components/guards/RequireTableSession.tsx:
  - [ ] Uses useTableId + useTableSession
  - [ ] If missing/expired → render <OTPForm tableId onVerified={tick++}>
  - [ ] Else render <Outlet />

3) Rename App → MenuPage
- [ ] Rename src/App.tsx → src/routes/MenuPage.tsx
- [ ] Remove layout and session gating from page; keep menu logic only
- [ ] Fix all imports/usages

4) Update router
- [ ] In src/main.tsx:
  - [ ] Parent: { path: '/table/:tableId', element: <AppLayout /> }
  - [ ] Children within RequireTableSession:
    - [ ] { index: true, element: <MenuPage /> }
    - [ ] { path: 'orders', element: <OrdersPage /> }
  - [ ] Keep root redirect and NotFound

5) Wire OTP to guard
- [ ] Ensure OTPForm onVerified triggers local state in guard (tick)
- [ ] Guard re-checks storage and shows Outlet

6) Verification
- [ ] Fresh load /table/1: missing/expired → OTP shown
- [ ] Enter 000000 → session set → menu renders without refresh
- [ ] Navigate to /table/1/orders → still visible inside layout
- [ ] Clear localStorage table_sess_1 → guard shows OTP again

7) Optional UX
- [ ] OTPForm: auto-submit on 6 digits
- [ ] aria-live for errors and focus management after success

8) Optional platform
- [ ] Code-split pages
- [ ] ErrorBoundary at AppLayout level

## Rollback plan
- Revert routing changes in main.tsx
- Restore original App.tsx
- Remove AppLayout, guard, and useTableSession files

## Acceptance criteria
- Header/tabs/action bar render once via layout
- OTP gating handled by guard for all children routes
- Menu and Orders work as before
- No regressions in styling/scroll behavior
- Clear naming: MenuPage, AppLayout, RequireTableSession
