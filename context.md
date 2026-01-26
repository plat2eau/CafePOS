# CafePOS Repository Context

## Overview
CafePOS is a monorepo containing a React-based client for table-side ordering and a placeholder service folder for a future backend. The current implementation focuses on a mobile-friendly, table-scoped ordering flow with guest information (name and phone number) access per table.

## Repository Layout
- .gitignore
- context.md (this file)
- package-lock.json
- package.json (npm workspaces configuration)
- README.md
- client/ (React + Vite + TypeScript frontend)
  - eslint.config.js, index.html, package.json, PLAN.md, tsconfig files, vite.config.ts
  - public/ (vite.svg)
  - src/ (App.css, App.tsx, index.css, main.tsx)
    - assets/ (logo.png, logo.webp, react.svg)
    - components/ (BottomActionBar.tsx, BottomTabs.tsx, OrderButton.tsx, GuestForm.tsx, TableHeader.tsx, ThemeToggle.tsx)
      - Cart/ (CartSummary.tsx, QuantityStepper.tsx)
      - MenuList/ (MenuItemCard.tsx, MenuList.tsx)
    - config/ (brand.ts)
    - hooks/ (useMenu.ts, useTableId.ts)
    - mock/ (menu.json)
    - routes/ (NotFound.tsx, OrdersPage.tsx)
    - state/ (cartStore.ts)
    - types/ (menu.ts)
    - utils/ (api.ts, tableSession.ts)
- service/ (Backend placeholder)
  - package.json, plan.md
  - data/, src/, lib/, plugins/, routes/

## How to Run
- Install: npm install
- Dev: npm run dev -w client (opens http://localhost:5173)
- Start (host): npm run start -w client
- Build: npm run -ws build
- Lint: npm run -ws lint
- Preview: npm run preview -w client

## Client App
- Stack: React 19, Vite 7, TypeScript 5.9, Chakra UI (v3 system tokens: ChakraProvider defaultSystem), React Router 7, Zustand 5.
- Entry: client/src/main.tsx
  - Initializes theme from localStorage (data-theme on <html>)
  - Sets BRAND-based favicon/title
  - Router:
    - / → redirect to /table/1
    - /table/:tableId → App (menu and guest info gating)
    - /table/:tableId/orders → OrdersPage (requires active table session)
    - * → NotFound

### Routing and Pages
- App.tsx: export default function App() { ... } – Shows TableHeader and BottomTabs; gates with GuestForm or renders MenuList.
- OrdersPage.tsx: Lists mock past orders; redirects if session invalid.
- NotFound.tsx: Basic 404 page.

### Table Session and Guest Info
- tableSession.ts: Functions for getSession(tableId), setSession, clearSession, isExpired; uses localStorage key `table_sess_{tableId}`.
- GuestForm.tsx: export default function GuestForm({ tableId, onVerified }: { tableId: number, onVerified: () => void }) { ... } – Collects name and phone (limited to 10 numeric characters); sets session with 2h expiry on submission.
- Gating: App checks session; OrdersPage uses Navigate redirect.

### Menu Data
- mock/menu.json: Sample menu items.
- useMenu.ts: Hook simulates fetch with 500ms delay.
- menu.ts: Type definitions for menu items.

### State Management
- cartStore.ts: Zustand store with items (Record by itemId), orderNote; actions: addItem, increment, decrement, setQty, remove, clear, reset; selectors: getList, subtotalCents.

### UI Components
- TableHeader.tsx: export default function TableHeader({ tableId }: { tableId: number | null }) { ... }
- BottomTabs.tsx: export default function BottomTabs() { ... }
- BottomActionBar.tsx: export default function BottomActionBar() { ... } – Shows selection details and order note.
- MenuList.tsx / MenuItemCard.tsx: Display menu items.
- CartSummary.tsx / QuantityStepper.tsx: Cart management.
- OrderButton.tsx: export default function OrderButton() { ... } – Stub for placing orders.
- ThemeToggle.tsx: export default function ThemeToggle() { ... } – Toggles light/dark mode, persists to localStorage.

### Theming
- index.css: CSS variables for light/dark modes.
- ThemeToggle persists data-theme to <html> and localStorage.

### API Wrapper
- api.ts: fetchJson attaches X-Table-Session header; handles errors like 'invalid_table_session'.

### Branding Config
- brand.ts: Exports BRAND { name, logoUrl }; used for title and favicon.

## Backend (service/)
- Current: Placeholder with package.json and empty directories (data/, src/, lib/, plugins/, routes/).
- Planned Endpoints:
  - POST /api/v1/tables/:tableId/guest/verify → { token, expiresAt }
  - GET /api/v1/menu → menu payload
  - POST /api/v1/orders → create order
  - GET /api/v1/tables/:tableId/orders → list orders
- Auth: Validate X-Table-Session header.

## Key Insights for Development
- Monorepo enables shared deps; use npm workspaces.
- Session management is client-side with mocks; integrate backend for real auth.
- State is lightweight with Zustand; extend for more features.
- UI built with Chakra UI; consistent theming.
- Hooks like useMenu and useTableId centralize logic.
- For new features: Use existing routes, state, and components as building blocks. E.g., add to cartStore for new state, extend api.ts for new endpoints.

## Next Steps
- Implement backend with real endpoints.
- Replace mocks in client with API calls (e.g., guest info submission, menu fetch).
- Add route guards, error boundaries, and loading states.
- Refactor for better separation (e.g., AppLayout with Outlet).

This context provides a solid foundation for adding/editing features, with details on structure, APIs, and code entry points.