'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import type { AdminOrder, AdminServiceRequest, AdminTableDetailData } from '@/lib/admin-data'
import type { Database } from '@/lib/database.types'

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

type FlashMessage = {
  tone: 'success' | 'error'
  message: string
}

type AdminTableDetailClientProps = {
  tableId: string
  signedInLabel: string
  initialData: AdminTableDetailData
}

const orderStatuses: OrderStatus[] = ['placed', 'preparing', 'served', 'cancelled']

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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function AdminTableDetailClient({
  tableId,
  signedInLabel,
  initialData
}: AdminTableDetailClientProps) {
  const router = useRouter()
  const [table] = useState(initialData.table)
  const [activeSession, setActiveSession] = useState(initialData.activeSession)
  const [recentOrders, setRecentOrders] = useState(initialData.recentOrders)
  const [serviceRequests, setServiceRequests] = useState(initialData.serviceRequests)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  const [pendingStatusKey, setPendingStatusKey] = useState<string | null>(null)
  const [isClearingTable, setIsClearingTable] = useState(false)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refreshTableDetail() {
      const response = await fetch(`/api/admin/tables/${tableId}/detail`, {
        method: 'GET',
        cache: 'no-store'
      }).catch(() => null)

      if (!response || cancelled) {
        return
      }

      if (response.status === 401) {
        router.replace('/admin/login?error=unauthorized')
        return
      }

      if (!response.ok) {
        return
      }

      const nextData = (await response.json()) as AdminTableDetailData

      if (cancelled) {
        return
      }
      setActiveSession(nextData.activeSession)
      setRecentOrders(nextData.recentOrders)
      setServiceRequests(nextData.serviceRequests)
    }

    const interval = window.setInterval(refreshTableDetail, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [router, tableId])

  async function handleOrderStatusChange(orderId: string, nextStatus: OrderStatus) {
    setFlash(null)
    setPendingStatusKey(`${orderId}:${nextStatus}`)

    const response = await fetch(`/api/admin/tables/${tableId}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: nextStatus
      })
    })

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; status?: OrderStatus }
      | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not update the order status.'
      })
      setPendingStatusKey(null)
      return
    }

    setRecentOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: payload?.status ?? nextStatus
            }
          : order
      )
    )
    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Order status updated.'
    })
    setPendingStatusKey(null)
  }

  async function handleClearTable() {
    if (!activeSession) {
      return
    }

    setFlash(null)
    setIsClearingTable(true)

    const response = await fetch(`/api/admin/tables/${tableId}/session`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: activeSession.id
      })
    })

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not clear the table session.'
      })
      setIsClearingTable(false)
      return
    }

    setActiveSession(null)
    setServiceRequests([])
    setIsClearDialogOpen(false)
    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Table session cleared.'
    })
    setIsClearingTable(false)
  }

  function buildReceiptHtml() {
    if (!activeSession) {
      return ''
    }

    const orderedOrders = [...recentOrders].sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    )
    const grandTotalCents = orderedOrders.reduce((sum, order) => sum + order.total_cents, 0)
    const orderMarkup = orderedOrders
      .map((order) => {
        const itemsMarkup = order.items
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.item_name)} x ${item.quantity}</td>
                <td class="amount">${toPrice(item.line_total_cents)}</td>
              </tr>
            `
          )
          .join('')

        const noteMarkup = order.note
          ? `<p class="note">Note: ${escapeHtml(order.note)}</p>`
          : ''

        return `
          <section class="order">
            <div class="row">
              <strong>Order ${escapeHtml(order.id.slice(0, 8))}</strong>
              <span>${escapeHtml(formatTimestamp(order.created_at))}</span>
            </div>
            <table>
              <tbody>${itemsMarkup}</tbody>
            </table>
            ${noteMarkup}
            <div class="row total">
              <strong>Order total</strong>
              <strong>${toPrice(order.total_cents)}</strong>
            </div>
          </section>
        `
      })
      .join('')

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Receipt</title>
          <style>
            :root {
              color-scheme: light;
            }

            body {
              margin: 0;
              padding: 16px;
              background: #fff;
              color: #111;
              font-family: "Courier New", Courier, monospace;
              font-size: 12px;
              line-height: 1.45;
            }

            .receipt {
              width: min(320px, 100%);
              margin: 0 auto;
            }

            h1,
            h2,
            p {
              margin: 0;
            }

            .center {
              text-align: center;
            }

            .muted {
              color: #444;
            }

            .section {
              padding: 12px 0;
              border-bottom: 1px dashed #888;
            }

            .order {
              padding: 10px 0;
              border-bottom: 1px dashed #bbb;
            }

            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }

            td {
              padding: 2px 0;
              vertical-align: top;
            }

            .amount {
              text-align: right;
              white-space: nowrap;
            }

            .note {
              margin-top: 6px;
            }

            .total {
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px dashed #bbb;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <main class="receipt">
            <section class="section center">
              <h1>CafePOS</h1>
              <p>Tanda, Kangra, HP</p>
              <p>8629822304</p>
              <p class="muted">Printed ${escapeHtml(formatTimestamp(new Date().toISOString()))}</p>
            </section>
            <section class="section">
              <div class="row">
                <strong>Guest</strong>
                <span>${escapeHtml(activeSession.guest_name)}</span>
              </div>
            </section>
            <section class="section">
              ${orderMarkup || '<p>No billable orders found.</p>'}
            </section>
            <section class="section">
              <div class="row total">
                <strong>Grand total</strong>
                <strong>${toPrice(grandTotalCents)}</strong>
              </div>
            </section>
          </main>
          <script>
            window.addEventListener('load', () => {
              window.print()
            })
          </script>
        </body>
      </html>
    `
  }

  function printReceipt() {
    const receiptHtml = buildReceiptHtml()
    const receiptBlob = new Blob([receiptHtml], {
      type: 'text/html;charset=utf-8'
    })
    const receiptUrl = window.URL.createObjectURL(receiptBlob)
    const receiptWindow = window.open(receiptUrl, '_blank')

    if (!receiptWindow) {
      window.URL.revokeObjectURL(receiptUrl)
      return false
    }

    window.setTimeout(() => {
      window.URL.revokeObjectURL(receiptUrl)
    }, 60_000)

    return true
  }

  function handleOpenReceipt() {
    setFlash(null)

    const printStarted = printReceipt()

    if (!printStarted) {
      setFlash({
        tone: 'error',
        message: 'Receipt page was blocked. Allow pop-ups and try again.'
      })
      return
    }
  }

  function renderStatusButton(order: AdminOrder, status: OrderStatus) {
    const isCurrentStatus = order.status === status
    const isPending = pendingStatusKey === `${order.id}:${status}`

    return (
      <button
        className={`button${isCurrentStatus ? '' : ' buttonSecondary'}${isPending ? ' buttonLoading' : ''}`}
        type="button"
        disabled={isCurrentStatus || Boolean(pendingStatusKey)}
        aria-busy={isPending}
        onClick={() => void handleOrderStatusChange(order.id, status)}
      >
        {isPending ? (
          <>
            <span className="buttonSpinner" aria-hidden="true" />
            {`Updating to ${status}...`}
          </>
        ) : (
          status
        )}
      </button>
    )
  }

  return (
    <>
      <div className="heroHeader compact">
        <Link className="backLink" href="/admin/sessions">
          ← Back to sessions
        </Link>
        <p className="eyebrow">Admin Detail</p>
        <h1>{table?.label ?? `Table ${tableId}`}</h1>
        <p className="lead">
          Review the current guest session, update order progress, and clear the table when the
          visit is complete.
        </p>
        <div className="metaPillRow">
          <span className="metaPill">Signed in as {signedInLabel}</span>
        </div>
      </div>

      <div className="buttonRow">
        <Link className="button" href={`/table/${tableId}`}>
          Open guest view
        </Link>
        <Link className="button buttonSecondary" href="/admin/sessions">
          Back to all tables
        </Link>
        <AdminLogoutButton />
      </div>

      {flash ? <p className={`statusMessage ${flash.tone}`}>{flash.message}</p> : null}

      {!table ? (
        <article className="card supportCard">
          <p className="eyebrow">Missing table</p>
          <h2>Table not found</h2>
          <p>This table does not exist in the current database.</p>
        </article>
      ) : (
        <>
          <div className="compactGrid">
            <article className="card supportCard">
              <p className="eyebrow">Table status</p>
              <h2>{table.is_active ? 'Available for service' : 'Inactive table'}</h2>
              <p>
                {table.is_active
                  ? 'Guests can start new sessions on this table.'
                  : 'This table is currently disabled for guests.'}
              </p>
            </article>

            <article className="card">
              <p className="eyebrow">Current session</p>
              <h2>{activeSession ? activeSession.guest_name : 'No active session'}</h2>
              <p>
                {activeSession
                  ? `Started ${formatTimestamp(activeSession.started_at)}`
                  : 'This table is currently free.'}
              </p>
            </article>
          </div>

          <div className="responsiveSplit">
            <article className="card supportCard">
              <p className="eyebrow">Session overview</p>
              <h2>Current table session</h2>

              {activeSession ? (
                <div className="stack">
                  <div className="adminSessionCard">
                    <p>
                      <strong>{activeSession.guest_name}</strong>
                    </p>
                    <p>{activeSession.guest_phone}</p>
                    <p>Started {formatTimestamp(activeSession.started_at)}</p>
                    <p>Last active {formatTimestamp(activeSession.last_active_at)}</p>
                  </div>

                  <div className="adminActionStack">
                    <button
                      className={`button${isClearingTable ? ' buttonLoading' : ''}`}
                      type="button"
                      disabled={isClearingTable}
                      aria-busy={isClearingTable}
                      onClick={() => {
                        setIsClearDialogOpen(true)
                      }}
                    >
                      {isClearingTable ? (
                        <>
                          <span className="buttonSpinner" aria-hidden="true" />
                          Clearing table...
                        </>
                      ) : (
                        'Clear table'
                      )}
                    </button>
                    <p className="finePrint">
                      This closes the active guest session so the table can be used again.
                    </p>
                  </div>
                </div>
              ) : (
                <p>No guest is currently linked to this table.</p>
              )}
            </article>

            <article className="card">
              <p className="eyebrow">Server calls</p>
              <h2>Open service requests</h2>
              <div className="stack">
                {serviceRequests.length === 0 ? (
                  <p>No open service requests for this session.</p>
                ) : (
                  serviceRequests.map((request: AdminServiceRequest) => (
                    <div className="adminSessionCard" key={request.id}>
                      <div className="summaryRow">
                        <strong>
                          {request.request_type === 'payment' ? 'Payment requested' : 'Assistance requested'}
                        </strong>
                        <span>{formatTimestamp(request.created_at)}</span>
                      </div>
                      <p>{request.guest_name ?? 'Guest'}</p>
                      {request.note ? <p>Note: {request.note}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>

          <article className="card">
            <p className="eyebrow">Order queue</p>
            <h2>Recent orders for this table</h2>
            <div className="stack">
              {recentOrders.length === 0 ? (
                <p>No orders have been placed for this table yet.</p>
              ) : (
                recentOrders.map((order) => (
                  <div className="adminOrderCard" key={order.id}>
                    <div className="summaryRow">
                      <strong>Order {order.id.slice(0, 8)}</strong>
                      <span>{formatTimestamp(order.created_at)}</span>
                    </div>
                    <p>
                      {order.guest_name ?? 'Guest'} · <span className="statusChip">{order.status}</span>
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
                    <div className="adminStatusActions">
                      {orderStatuses.map((status) => (
                        <div key={`${order.id}-${status}`}>{renderStatusButton(order, status)}</div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </>
      )}

      {isClearDialogOpen && activeSession ? (
        <div
          className="dialogBackdrop"
          role="presentation"
          onClick={() => {
            if (!isClearingTable) {
              setIsClearDialogOpen(false)
            }
          }}
        >
          <div
            className="dialogCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-table-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Close session</p>
            <h2 id="clear-table-dialog-title">Open receipt before clearing the table?</h2>
            <p className="finePrint">
              Open the HTML receipt page first, then clear the table only after printing or sharing
              it.
            </p>
            <div className="dialogSummary">
              <div className="summaryRow">
                <span>Guest</span>
                <strong>{activeSession.guest_name}</strong>
              </div>
              <div className="summaryRow">
                <span>Orders</span>
                <strong>{recentOrders.length}</strong>
              </div>
              <div className="summaryRow total">
                <span>Total</span>
                <strong>
                  {toPrice(recentOrders.reduce((sum, order) => sum + order.total_cents, 0))}
                </strong>
              </div>
            </div>
            <div className="dialogActions">
              <button
                className="button"
                type="button"
                disabled={isClearingTable}
                onClick={handleOpenReceipt}
              >
                Open receipt
              </button>
              <button
                className={`button buttonSecondary${isClearingTable ? ' buttonLoading' : ''}`}
                type="button"
                disabled={isClearingTable}
                aria-busy={isClearingTable}
                onClick={() => void handleClearTable()}
              >
                {isClearingTable ? (
                  <>
                    <span className="buttonSpinner" aria-hidden="true" />
                    Clear table
                  </>
                ) : (
                  'Clear table'
                )}
              </button>
              <button
                className="button buttonSecondary"
                type="button"
                disabled={isClearingTable}
                onClick={() => setIsClearDialogOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
