import { EmptyStateCard, OrderCard } from '@/components/AppCards'
import { StatusBadge } from '@/components/ui/status-badge'

type GuestOrderHistoryItem = {
  item_name: string
  quantity: number
  line_total_cents: number
}

export type GuestOrderHistoryOrder = {
  id: string
  created_at: string
  status: string
  note: string | null
  total_cents: number
  ordered_by_name: string
  ordered_by_phone: string | null
  order_items: GuestOrderHistoryItem[] | null
}

type GuestOrderHistoryProps = {
  accessibleSessionId: string | null
  adminPreview?: boolean
  errorMessage?: string | null
  orders?: GuestOrderHistoryOrder[] | null
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function formatOrderIdentity(name: string, phone: string | null) {
  return phone?.trim() ? `${name} (${phone})` : name
}

export default function GuestOrderHistory({
  accessibleSessionId,
  adminPreview = false,
  errorMessage,
  orders
}: GuestOrderHistoryProps) {
  return (
    <div className="sectionStack">
      <div className="guestOrderHistoryHeader">
        <h2>Past orders</h2>
        {accessibleSessionId ? (
          <div className="metaPillRow">
            <span className="metaPill">
              {adminPreview ? 'Admin preview mode' : 'Auto-refreshes every 5 seconds'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="guestOrderHistoryList">
        {!accessibleSessionId ? (
          <EmptyStateCard
            eyebrow="Session required"
            title="No linked table session"
            description="Start a table session before trying to view your order history."
            tone="support"
            density="default"
          />
        ) : errorMessage ? (
          <EmptyStateCard
            eyebrow="Error"
            title="Could not load orders"
            description={errorMessage}
            tone="support"
            density="default"
          />
        ) : orders && orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              className="guestOrderHistoryCard"
              key={order.id}
              title={`Order ${order.id.slice(0, 8)}`}
              timestamp={new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: '2-digit',
                day: 'numeric',
                month: 'short'
              }).format(new Date(order.created_at))}
              summary={
                <p>
                  Placed by {formatOrderIdentity(order.ordered_by_name, order.ordered_by_phone)} -{' '}
                  <StatusBadge>{order.status}</StatusBadge>
                </p>
              }
              items={(order.order_items ?? []).map((item, index) => ({
                id: `${order.id}-${index}`,
                name: item.item_name,
                quantity: item.quantity,
                total: toPrice(item.line_total_cents)
              }))}
              note={order.note}
              total={toPrice(order.total_cents)}
            />
          ))
        ) : (
          <EmptyStateCard
            eyebrow="No orders yet"
            title="Your order history is empty"
            description="Place your first order from the menu tab and it will appear here."
            density="default"
          />
        )}
      </div>
    </div>
  )
}
