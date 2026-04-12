import Link from 'next/link'
import { cookies } from 'next/headers'
import { EmptyStateCard, OrderCard } from '@/components/AppCards'
import GuestOrderHistoryPoller from '@/components/GuestOrderHistoryPoller'
import { SectionCard } from '@/components/ui/section-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTableSessionCookieName } from '@/lib/table-session'

type TableOrdersPageProps = {
  params: Promise<{
    tableId: string
  }>
  searchParams: Promise<{
    placed?: string
  }>
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

export default async function TableOrdersPage({ params, searchParams }: TableOrdersPageProps) {
  const { tableId } = await params
  const { placed } = await searchParams
  const supabase = createServerSupabaseClient()
  const cookieStore = await cookies()
  const currentSessionId = cookieStore.get(getTableSessionCookieName(tableId))?.value
  const adminAuth = await getAdminAuthContext()

  const { data: activeSession } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle()

  const accessibleSessionId = currentSessionId ?? (adminAuth ? activeSession?.id ?? null : null)

  const { data: orders, error } = accessibleSessionId
    ? await supabase
        .from('orders')
        .select('id, table_id, created_at, status, note, total_cents, ordered_by_name, ordered_by_phone, order_items(item_name, quantity, line_total_cents)')
        .eq('table_id', tableId)
        .eq('session_id', accessibleSessionId)
        .order('created_at', { ascending: false })
    : { data: null, error: null }

  return (
    <main>
      <section className="hero heroShell">
        {accessibleSessionId ? <GuestOrderHistoryPoller /> : null}

        <div className="heroHeader compact">
          <Link className="backLink" href={`/table/${tableId}`}>
            ← Back to menu
          </Link>
          <p className="eyebrow">Order History</p>
          <h1>Orders for table {tableId}</h1>
          <p className="lead">
            This route will show only the orders associated with the active table session.
          </p>
          {accessibleSessionId ? (
            <div className="metaPillRow">
              <span className="metaPill">
                {adminAuth ? 'Admin preview mode' : 'Auto-refreshes every 5 seconds'}
              </span>
            </div>
          ) : null}
        </div>

        {placed === '1' ? (
          <SectionCard tone="success">
            <p className="eyebrow">Order placed</p>
            <h2>Your order has been sent</h2>
            <p>The cafe team has your order now. You can check the latest details below.</p>
          </SectionCard>
        ) : null}

        <div className="compactGrid">
          {!accessibleSessionId ? (
            <EmptyStateCard
              eyebrow="Session required"
              title="No linked table session"
              description="Start a table session before trying to view your order history."
              tone="support"
              density="default"
            />
          ) : error ? (
            <EmptyStateCard
              eyebrow="Error"
              title="Could not load orders"
              description={error.message}
              tone="support"
              density="default"
            />
          ) : orders && orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
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
                    Placed by {formatOrderIdentity(order.ordered_by_name, order.ordered_by_phone)} ·{' '}
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
              description="Place your first order from the menu page and it will appear here."
              density="default"
            />
          )}
        </div>
      </section>
    </main>
  )
}
