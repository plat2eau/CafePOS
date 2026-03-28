'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AdminOrder, AdminOverviewData } from '@/lib/admin-data'

type AdminConsoleProps = {
  initialData: AdminOverviewData
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}

export default function AdminConsole({ initialData }: AdminConsoleProps) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [newOrderNotice, setNewOrderNotice] = useState<AdminOrder | null>(null)
  const latestOrderIdRef = useRef(initialData.orders[0]?.id ?? null)

  useEffect(() => {
    let cancelled = false

    async function refreshOverview() {
      const response = await fetch('/api/admin/overview', {
        method: 'GET',
        cache: 'no-store'
      })

      if (!response.ok) {
        return
      }

      const nextData = (await response.json()) as AdminOverviewData

      if (cancelled) {
        return
      }

      const newestOrder = nextData.orders[0] ?? null

      if (newestOrder && latestOrderIdRef.current && newestOrder.id !== latestOrderIdRef.current) {
        setNewOrderNotice(newestOrder)
      }

      latestOrderIdRef.current = newestOrder?.id ?? null
      setData(nextData)
    }

    const interval = window.setInterval(refreshOverview, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const ordersByTable = useMemo(() => {
    const map = new Map<string, AdminOrder[]>()

    for (const order of data.orders) {
      const list = map.get(order.table_id)
      if (list) {
        list.push(order)
      } else {
        map.set(order.table_id, [order])
      }
    }

    return map
  }, [data.orders])

  return (
    <div className="sectionStack">
      {newOrderNotice ? (
        <article className="card supportCard adminAlertPopup" aria-live="polite">
          <p className="eyebrow">New order</p>
          <h2>{newOrderNotice.guest_name ?? 'Guest'} placed an order</h2>
          <p>
            Table {newOrderNotice.table_id} just placed a new order for{' '}
            <strong>{toPrice(newOrderNotice.total_cents)}</strong>.
          </p>
          <p>Open the table session to start handling it right away.</p>
          <div className="buttonRow">
            <button
              className="button"
              type="button"
              onClick={() => {
                const nextHref = `/admin/sessions/${newOrderNotice.table_id}`
                setNewOrderNotice(null)
                router.push(nextHref)
              }}
            >
              Open table session
            </button>
            <button className="button buttonSecondary" type="button" onClick={() => setNewOrderNotice(null)}>
              Dismiss
            </button>
          </div>
        </article>
      ) : null}

      <div className="compactGrid">
        <article className="card">
          <p className="eyebrow">Active tables</p>
          <h2>{data.sessions.length}</h2>
          <p>Tables with an active guest session right now.</p>
        </article>
        <article className="card">
          <p className="eyebrow">Recent orders</p>
          <h2>{data.orders.length}</h2>
          <p>Orders visible in the admin console feed.</p>
        </article>
      </div>

      <div className="responsiveSplit">
        <article className="card">
          <p className="eyebrow">Live order feed</p>
          <h2>Incoming orders</h2>
          <p>Refreshes automatically every few seconds.</p>

          <div className="stack">
            {data.orders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              data.orders.map((order) => (
                <div className="adminOrderCard" key={order.id}>
                  <div className="summaryRow">
                    <strong>Table {order.table_id}</strong>
                    <span>{formatTimestamp(order.created_at)}</span>
                  </div>
                  <p>
                    {order.guest_name ?? 'Guest'} · {order.status}
                  </p>
                  <div className="stack">
                    {order.items.map((item, index) => (
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
                  <Link className="button buttonSecondary" href={`/admin/sessions/${order.table_id}`}>
                    Manage table
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card supportCard">
          <p className="eyebrow">Occupied tables</p>
          <h2>Session overview</h2>
          <div className="stack">
            {data.sessions.length === 0 ? (
              <p>No active table sessions.</p>
            ) : (
              data.sessions.map((session) => {
                const orderCount = ordersByTable.get(session.table_id)?.length ?? 0

                return (
                  <div className="adminSessionCard" key={session.id}>
                    <div className="summaryRow">
                      <strong>Table {session.table_id}</strong>
                      <span>{orderCount} order{orderCount === 1 ? '' : 's'}</span>
                    </div>
                    <p>{session.guest_name}</p>
                    <p>{session.guest_phone}</p>
                    <p>Last active {formatTimestamp(session.last_active_at)}</p>
                    <Link className="button buttonSecondary" href={`/admin/sessions/${session.table_id}`}>
                      Open table
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
