# CafePOS API Integration Plan

## Scope
Implement and harden Place Order (phase 1), then View Past Orders (phase 2) APIs, prioritizing Phase 1 first as per the task.

## Current State Summary
- **Backend**:
  - Routes registered under `/api/v1` prefix (`server.ts`).
  - Global auth preHandler (`auth.ts`) with tableId param guard.
  - `orders.ts`:
    - POST `/api/v1/orders`: Validates `{items[{itemId:string, qty>0}], note?}`, computes `totalCents` using `menuData`, responds with `{id, tableId, createdAt, totalCents, items[{itemId, name, qty, priceCents}], note?}`.
    - GET `/api/v1/tables/:tableId/orders`: Returns orders for table, sorted desc by `createdAt`.
- **Client**:
  - `fetchJson` injects `X-Table-Session` if `tableId` provided and not expired.
  - `OrderButton.tsx` posts to `/api/v1/orders` with `{items:[{itemId, qty}], note?}`. Uses `alert()` and clears items.
  - `OrdersPage.tsx` fetches `/api/v1/tables/:tableId/orders` and displays list with `totalCents` formatting.

## API Contracts
- **POST /api/v1/orders**:
  - Request: `{ items: [{ itemId: string, qty: number }], note?: string }`
  - Response: `{ id: string, tableId: number, createdAt: string, totalCents: number, items: [{ itemId: string, name: string, qty: number, priceCents: number }], note?: string }`
- **GET /api/v1/tables/:tableId/orders**:
  - Response: Array<Order> (same shape as above).

## Error Cases
- 400: Invalid payload (e.g., invalid itemId, qty <=0).
- 401: Missing/invalid token.
- 403: Table mismatch.
- Client-side: Network errors, session expiry (redirect to GuestForm).

## Implementation Tasks
### Phase 1: Place Order
- [x] Add submitting state to `OrderButton.tsx`: Disable button, show spinner while API call in progress.
- [x] Prevent double-submits with a flag.
- [x] Replace `alert()` with Chakra UI toast for success/error.
- [x] On success: Clear cart and note; show success toast; optionally navigate to `/table/:tableId/orders`.
- [x] Handle 401/403: Redirect to GuestForm for re-verification.
- [x] Update any related types if needed (e.g., in `types/menu.ts` or new order types).

### Phase 2: View Past Orders
- [ ] Add refresh button/icon in `OrdersPage.tsx` to re-fetch orders.
- [ ] Improve loading/empty/error states (e.g., spinner, "No orders" message, error toast).
- [ ] Handle 401/403: Redirect to GuestForm.
- [ ] Polish UI: Localized dates, ensure currency formatting via `totalCents`.

## Testing Strategy
- **Manual**:
  - Run `npm run dev -w service` and `npm run dev -w client`.
  - Test full flow: Verify guest, add to cart, place order, check if appears in Past Orders.
  - Error scenarios: Invalid token, network disconnect, empty cart.
- **cURL**:
  - Obtain token: `curl -X POST http://localhost:3001/api/v1/tables/1/guest/verify -H "Content-Type: application/json" -d '{"name":"Test","phone":"1234567890"}'`
  - Place order: `curl -X POST http://localhost:3001/api/v1/orders -H "Content-Type: application/json" -H "X-Table-Session: <token>" -d '{"items":[{"itemId":"c1","qty":2}],"note":"Extra sugar"}'`
  - View orders: `curl http://localhost:3001/api/v1/tables/1/orders -H "X-Table-Session: <token>"`

## Acceptance Criteria
- Place Order: Button handles loading/double-click prevention, shows toasts, clears cart, optional navigation.
- View Past Orders: List updates correctly, handles errors/empty states, refresh works.
- All error cases (401/403, invalid data) handled gracefully with redirects/toasts.