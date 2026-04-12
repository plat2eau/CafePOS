import Link from 'next/link'
import { cookies } from 'next/headers'
import GuestOrderHistoryPoller from '@/components/GuestOrderHistoryPoller'
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
          <article className="card successHeroCard">
            <p className="eyebrow">Order placed</p>
            <h2>Your order has been sent</h2>
            <p>The cafe team has your order now. You can check the latest details below.</p>
          </article>
        ) : null}

        <div className="compactGrid">
          {!accessibleSessionId ? (
            <article className="card supportCard">
              <p className="eyebrow">Session required</p>
              <h2>No linked table session</h2>
              <p>Start a table session before trying to view your order history.</p>
            </article>
          ) : error ? (
            <article className="card supportCard">
              <p className="eyebrow">Error</p>
              <h2>Could not load orders</h2>
              <p>{error.message}</p>
            </article>
          ) : orders && orders.length > 0 ? (
            orders.map((order) => (
              <article className="card" key={order.id}>
                <div className="summaryRow">
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <span>{order.status}</span>
                </div>
                <p>
                  Placed by {order.ordered_by_name} ({order.ordered_by_phone})
                </p>
                <div className="stack">
                  {(order.order_items ?? []).map((item, index) => (
                    <div className="summaryRow" key={`${order.id}-${index}`}>
                      <span>
                        {item.item_name} x {item.quantity}
                      </span>
                      <strong>{toPrice(item.line_total_cents)}</strong>
                    </div>
                  ))}
                </div>
                {order.note ? <p>Note: {order.note}</p> : null}
                <div className="summaryRow total">
                  <span>Total</span>
                  <strong>{toPrice(order.total_cents)}</strong>
                </div>
              </article>
            ))
          ) : (
            <article className="card">
              <p className="eyebrow">No orders yet</p>
              <h2>Your order history is empty</h2>
              <p>Place your first order from the menu page and it will appear here.</p>
            </article>
          )}
        </div>
      </section>
    </main>
  )
}
