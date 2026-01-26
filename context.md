# CafePOS Repository Context

## Overview
CafePOS is a monorepo containing a React-based client for table-side ordering and a Fastify backend service for handling API requests. The client is mobile-friendly with a table-scoped ordering flow, guest information per table, and now integrates with the backend for verification, menu, and orders.

## Repository Layout
- .gitignore
- context.md (this file)
- package-lock.json
- package.json (npm workspaces configuration)
- README.md
- client/ (React + Vite + TypeScript frontend)
  - eslint.config.js, index.html, package.json, tsconfig files, vite.config.ts
  - public/ (vite.svg)
  - src/ (App.css, App.tsx, index.css, main.tsx)
    - assets/ (logo.png, logo.webp, react.svg)
    - components/ (BottomActionBar.tsx, BottomTabs.tsx, OrderButton.tsx, GuestForm.tsx, TableHeader.tsx, ThemeToggle.tsx)
      - Cart/ (CartSummary.tsx, QuantityStepper.tsx)
      - MenuList/ (MenuItemCard.tsx, MenuList.tsx)
    - config/ (brand.ts)
    - hooks/ (useMenu.ts, useTableId.ts)
    - mock/ (menu.json) - Legacy, now uses backend
    - routes/ (NotFound.tsx, OrdersPage.tsx)
    - state/ (cartStore.ts)
    - types/ (menu.ts)
    - utils/ (api.ts, tableSession.ts)
- service/ (Fastify + TypeScript backend)
  - package.json, tsconfig.json
  - data/ (menu.json)
  - src/ (server.ts)
    - plugins/ (auth.ts, cors.ts)
    - routes/ (guest.ts, menu.ts, orders.ts)

## How to Run
- Install: npm install
- Dev client: npm run dev -w client (http://localhost:5173)
- Dev service: npm run dev -w service (http://localhost:3001)
- Build: npm run -ws build
- Start client: npm run start -w client
- Start service: npm run start -w service
- Lint: npm run -ws lint
- Preview client: npm run preview -w client
- Test: Visit http://localhost:5173/table/1

## Client App
- Stack: React 19, Vite 7, TypeScript 5.9, Chakra UI, React Router 7, Zustand 5.
- Entry: client/src/main.tsx (ChakraProvider, RouterProvider)
  - Initializes theme from localStorage
  - Sets BRAND favicon/title
  - Router: / → /table/1, /table/:tableId → App, /table/:tableId/orders → OrdersPage, * → NotFound
- App.tsx: Gates with GuestForm or renders MenuList (fetches menu post-verification)
- OrdersPage.tsx: Fetches and lists orders from backend
- GuestForm.tsx: Submits name/phone to backend for JWT token
- useMenu.ts: Fetches menu from backend
- OrderButton.tsx: Posts cart to backend orders endpoint

## Backend (service/)
- Stack: Fastify 5, TypeScript 5, Zod, Jose (JWT), in-memory storage.
- Entry: service/src/server.ts
  - Plugins: CORS, sensible, auth (JWT validation)
  - Routes: guest (verify for token), menu (public), orders (create/list with auth)
- Endpoints:
  - POST /api/v1/tables/:tableId/guest/verify {name, phone} → {token, expiresAt}
  - GET /api/v1/menu → menu payload from data/menu.json
  - POST /api/v1/orders {items, note?} (auth) → order with computed total
  - GET /api/v1/tables/:tableId/orders (auth) → list orders
- Auth: X-Table-Session JWT, validates tableId match
- Data: menu.json, orders in-memory (add DB for persistence)

## Key Insights for Development
- Monorepo with workspaces for shared deps.
- Client uses backend APIs; remove mocks when stable.
- Session with token stored in localStorage.
- UI with Chakra UI, theming persists.
- Hooks centralize logic (useMenu, useTableId).
- For extensions: Add DB (e.g., SQLite) in service/lib, more endpoints, error handling.

## Next Steps
- Add persistence (SQLite/Postgres) for orders.
- Implement production auth/secrets.
- Add loading states, error boundaries in client.
- Deploy: Client static, service Node server.

This context provides a foundation for further development.