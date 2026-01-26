# Admin Dashboard Plan

## Goals
- Give staff/admins a simple on-phone view to monitor orders, update statuses, see quick KPIs, and (optionally) edit menu.

## MVP (Phase 1)
- Auth: Admin login (simple PIN or email/password) issuing an admin JWT. Roles: admin, staff (staff can manage orders; admin can also edit menu and settings).
- Orders management:
  - List all tables’ orders (desc by time) with status chips: NEW, PREPARING, SERVED, CANCELLED.
  - Order detail: items, note, totals, created time.
  - Actions: change status (single tap), optional note on cancel.
  - Filters: status filter and quick “Today” range; pull-to-refresh or 5s polling.
- Dashboard overview:
  - Today’s KPIs: orders count, gross sales, average order value, NEW→SERVED progress.

## Next Phases
- Phase 2: Menu management (CRUD categories/items, price edits). Reuse JSON persistence initially; later move to DB.
- Phase 3: Basic reporting (date range totals, top items). Export CSV.
- Phase 4: User management (create staff users, rotate PINs), and persistent storage (SQLite/Prisma).

## Information Architecture (mobile)
- Routes: /admin/login (public), /admin (Dashboard), /admin/orders, /admin/menu, /admin/reports, /admin/settings.
- Navigation: Bottom tabs for Dashboard, Orders, Menu, Reports, Settings; sticky header with search/filter on Orders.
- Patterns: Compact cards, status badges, 1–2 tap actions, big KPIs.

## Backend Plan
- Auth
  - Add adminAuth plugin: validates JWT from X-Admin-Session (or Authorization: Bearer) with role claim. Separate secret (ADMIN_JWT_SECRET) or shared.
  - Endpoints:
    - POST /api/v1/admin/login { username, password|pin } → { token, role }.
    - GET /api/v1/admin/me → { username, role } (session check).
- Orders
  - Extend order model with status: "NEW" | "PREPARING" | "SERVED" | "CANCELLED" (default NEW on place).
  - Endpoints:
    - GET /api/v1/admin/orders?status=&from=&to=&tableId=
    - PATCH /api/v1/admin/orders/:id { status, note? }
- Metrics
  - GET /api/v1/admin/metrics/overview?from=&to=
  - Compute from in-memory orders initially; consider SQLite later for persistence.
- CORS/Headers: Add X-Admin-Session to allowed headers.
- Realtime: Start with 5s polling; later optional SSE/websocket.

## Client Plan
- Session handling: store admin token in localStorage; inject X-Admin-Session header via fetchJson extension (separate helper to avoid coupling with table session).
- Route guard: <AdminGuard> around /admin/*; verifies token via /admin/me.
- Pages/components:
  - Login: PIN or password input; show errors; save token.
  - Dashboard: StatTiles (sales today, orders today, AOV), recent orders list.
  - Orders: FiltersBar (status chips), OrderCard (id, table, time, items summary, total, status badge), StatusChangeSheet.
  - Menu (Phase 2): CategoryList, ItemList, ItemEditor modal.
  - Shared: AdminBottomTabs, StatusBadge, DateRangePicker (simple presets first).
- State/data: Simple hooks per page using fetchJson; poll Orders every 5s when focused.

## Data & Types
- Add status to server order objects. Client: define AdminOrder extends Order with status. Existing guest flows ignore extra fields.

## Milestones (rough)
- M0 (0.5d): Admin auth endpoints + plugin + CORS changes + client guard and login.
- M1 (0.5–1d): Orders list with filters and status updates (server PATCH + client UI).
- M2 (0.5d): Dashboard KPIs from in-memory orders.
- M3 (1–2d): Menu CRUD (server JSON writes or temp in-memory; client editor UI).
- M4 (1d): Persistence via SQLite/Prisma, migrate orders+menu.

## Implementation Notes
- Keep admin under same SPA (client) with /admin/* routes.
- Use polling first; add SSE later if needed.
- Keep role checks server-side on all /admin/* endpoints.

## Open Questions
1) Auth flavor: quick 4–6 digit PIN (single admin) or username/password (multi-user)?
2) Persistence now or later? If you want metrics/history across restarts, we should add SQLite in Phase 1.
3) MVP features: is Phase 1 (auth + orders + KPIs) acceptable for first cut?
4) Status flow: are these four states enough? Any “READY” vs “SERVED” distinction needed?
5) Menu editing in Phase 2: okay to persist to JSON for now (dev) or do you prefer DB from the start)?

## Updates Based on Feedback
- PIN auth confirmed.
- Skip metrics for now.
- Features focus: Create table session and add/edit orders; See all table sessions and orders; Shift session to another table; Clear session with reason (payment done, other).
- Shift only to free tables (server checks and rejects if occupied, no 409 - wait, user said 409 should not occur, but to prevent shifts to occupied, server must check and return error if not free).
- Clear reasons: PAYMENT_DONE (note optional), OTHER (note mandatory).
- Admin order edit: add/remove items, change qty, delete order.
- Real-time: Use WebSocket for order updates.
- Table IDs: No range; tables are a comma-separated string (e.g., "1,2,3,5"); use this for validation in create/shift (only allow free tables from this list). Store in ENV or config.