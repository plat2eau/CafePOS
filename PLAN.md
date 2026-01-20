# CafePOS Frontend Plan

## 1) Scope (Stage 1)
- Simple React frontend for cafe order management.
- Flow: QR → opens /table/:tableId → show table → show menu → select items/quantities → place order.
- No auth, no delivery, single-table orders, minimal UI (Chakra UI).

## 2) Tech stack
- React + Vite + TypeScript
- Chakra UI
- React Router
- Zustand (cart state) – introduced in Milestone 3
- Mock data: local JSON for menu
- Optional later: TanStack Query when backend exists

## 3) Directory structure (initial)
- src/
  - main.tsx
  - App.tsx
  - routes/
    - TableOrderPage.tsx
  - components/
    - TableHeader.tsx
    - MenuList/
      - MenuList.tsx
      - MenuItemCard.tsx
    - Cart/
      - CartSummary.tsx
      - QuantityStepper.tsx
    - OrderButton.tsx
  - hooks/
    - useTableId.ts
    - useMenu.ts
  - state/
    - cartStore.ts
  - types/
    - menu.ts
    - cart.ts
    - order.ts
  - mock/
    - menu.json
  - theme/
    - index.ts (optional)

## 4) Data models
- MenuItem: { id, name, priceCents, description?, imageUrl?, categoryId }
- CartItem: { itemId, name, priceCents, qty }
- OrderDraft: { tableId, items: CartItem[], note? }

## 5) Milestones and microtasks

### Milestone 1: Table number visible (routing + header)
- [x] M1.1 Initialize Vite React + TS; add Chakra UI and React Router
- [x] M1.2 Add route /table/:tableId
- [x] M1.3 Create useTableId hook (validation, fallback)
- [x] M1.4 Implement TableHeader displaying the table number
- [x] M1.5 Manual test: visit /table/5 → shows “Table 5”

### Milestone 2: Static menu
- [x] M2.1 Define types/menu.ts
- [x] M2.2 Add mock/menu.json (categories + items)
- [x] M2.3 Implement useMenu to read mock data (simulate fetch)
- [x] M2.4 Build MenuList and MenuItemCard (name, price, add button)
- [x] M2.5 Manual test: menu renders with mock items

### Milestone 3: Cart basics
- [x] M3.1 Implement state/cartStore.ts with add/updateQty/remove/clear
- [x] M3.2 QuantityStepper component
- [x] M3.3 CartSummary with subtotal and item list
- [x] M3.4 Manual test: add/update/remove reflect in summary

### Milestone 4: Place order stub
- [x] M4.1 OrderButton opens confirm modal and builds OrderDraft
- [x] M4.2 Log order payload (replace with API later)
- [x] M4.3 Toast/alert success and clear cart
- [x] M4.4 Manual test: happy path works, cart resets

### Milestone 5: UX polish
- [x] M5.1 Empty states (no items, invalid table)
- [ ] M5.2 Loading skeletons for menu
- [x] M5.3 Basic responsiveness tweaks
- [x] M5.4 Theming scaffold: prepare light/dark toggle using Chakra's color mode APIs (placeholder implemented with CSS vars)
- [x] M5.5 Persist theme preference to localStorage and default to light
- [x] M5.6 Scrollable content area (header/tabs pinned within column)
- [x] M5.7 Align components to Chakra color-mode tokens (bg, fg, border, panel)

### Milestone 6: Bottom tabs + Orders (new)
- [x] M6.1 Add bottom tabs with two tabs: Menu and Orders
- [x] M6.2 Create Orders page to show past orders (mock data)
- [x] M6.3 Route: /table/:tableId/orders
- [x] M6.4 Redirect/UX: default to Menu; cart summary hidden for now
- [x] M6.5 Manual test: switch tabs; orders list renders from mock

## 6) Definition of Done (Stage 1)
- [ ] Visiting /table/:tableId shows table number.
- [ ] Menu loads from mock data.
- [ ] User can add/remove/update quantities.
- [ ] “Place order” stub logs payload and clears cart.
- [ ] Screens are responsive and have basic empty/loading states.

## 7) Notes for future expansion
- Delivery flow via new route (/order/new) + address form and separate store slice.
- Backend integration with TanStack Query for menu + order mutations.
- Billing extensions (tax/discount calculators, totals selectors) in types/order.ts + selectors.
- Auth wrapper at App level when needed.

## First microstep to execute next
- Create the Vite project and wire Chakra + Router.
- Implement /table/:tableId and TableHeader to display table number.

## Decisions
- Stack: TypeScript + Vite + Chakra UI + React Router + Zustand.
- Package manager: npm.
