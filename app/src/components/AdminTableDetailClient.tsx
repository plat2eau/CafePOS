'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import { buildReceiptPayload } from '@/lib/receipt-print'
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
  const [isOpeningReceipt, setIsOpeningReceipt] = useState(false)

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

  async function handleOpenReceipt() {
    if (!activeSession) {
      return
    }

    setFlash(null)
    setIsOpeningReceipt(true)

    const payload = buildReceiptPayload({
      activeSession,
      recentOrders
    })

    if (!payload) {
      setFlash({
        tone: 'error',
        message: 'Could not build the receipt.'
      })
      setIsOpeningReceipt(false)
      return
    }

    const response = await fetch('/api/admin/print/receipt-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payload
      })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not open the receipt right now.'
      })
      setIsOpeningReceipt(false)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const result = (await response.json().catch(() => null)) as
      | { receiptUrl?: string; message?: string }
      | null

    if (!response.ok || !result?.receiptUrl) {
      setFlash({
        tone: 'error',
        message: result?.message ?? 'Could not open the receipt right now.'
      })
      setIsOpeningReceipt(false)
      return
    }

    const receiptWindow = window.open(result.receiptUrl, '_blank')

    if (!receiptWindow) {
      setFlash({
        tone: 'error',
        message: 'Receipt page was blocked. Allow pop-ups and try again.'
      })
      setIsOpeningReceipt(false)
      return
    }

    setIsOpeningReceipt(false)
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
                className={`button${isOpeningReceipt ? ' buttonLoading' : ''}`}
                type="button"
                disabled={isClearingTable || isOpeningReceipt}
                aria-busy={isOpeningReceipt}
                onClick={() => void handleOpenReceipt()}
              >
                {isOpeningReceipt ? (
                  <>
                    <span className="buttonSpinner" aria-hidden="true" />
                    Opening receipt...
                  </>
                ) : (
                  'Open receipt'
                )}
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
