'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import type {
  AdminMenuItem,
  AdminOrder,
  AdminOverviewData,
  AdminTableOption
} from '@/lib/admin-data'

type AdminConsoleProps = {
  initialData: AdminOverviewData
  menuItems: AdminMenuItem[]
  tables: AdminTableOption[]
}

type FlashMessage = {
  tone: 'success' | 'error'
  message: string
}

type OrderType = 'table' | 'out'

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}

function formatOrderIdentity(name: string, phone: string | null) {
  return phone?.trim() ? `${name} (${phone})` : name
}

async function fetchOverviewData() {
  const response = await fetch('/api/admin/overview', {
    method: 'GET',
    cache: 'no-store'
  }).catch(() => null)

  if (!response?.ok) {
    return null
  }

  return (await response.json()) as AdminOverviewData
}

export default function AdminConsole({ initialData, menuItems, tables }: AdminConsoleProps) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  const [isAddOrderDialogOpen, setIsAddOrderDialogOpen] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>(tables.length > 0 ? 'table' : 'out')
  const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id ?? '')
  const [customerName, setCustomerName] = useState('Guest')
  const [customerPhone, setCustomerPhone] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [note, setNote] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [pendingReceiptOrderId, setPendingReceiptOrderId] = useState<string | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase()

  useEffect(() => {
    let cancelled = false

    async function refreshOverview() {
      const nextData = await fetchOverviewData()

      if (!nextData || cancelled) {
        return
      }

      setData(nextData)
    }

    const interval = window.setInterval(refreshOverview, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    setOrderType((current) => (current === 'table' && tables.length === 0 ? 'out' : current))
    setSelectedTableId((current) =>
      tables.some((table) => table.id === current)
        ? current
        : tables[0]?.id ?? ''
    )
  }, [tables])

  const ordersByTable = useMemo(() => {
    const map = new Map<string, AdminOrder[]>()

    for (const order of data.orders) {
      if (!order.table_id) {
        continue
      }

      const list = map.get(order.table_id)
      if (list) {
        list.push(order)
      } else {
        map.set(order.table_id, [order])
      }
    }

    return map
  }, [data.orders])

  const filteredMenuItems = useMemo(() => {
    if (!normalizedSearchQuery) {
      return menuItems
    }

    return menuItems.filter((item) => {
      const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase()
      return haystack.includes(normalizedSearchQuery)
    })
  }, [menuItems, normalizedSearchQuery])

  const selectedItems = useMemo(
    () =>
      menuItems
        .map((item) => ({
          itemId: item.id,
          name: item.name,
          priceCents: item.price_cents,
          quantity: quantities[item.id] ?? 0
        }))
        .filter((item) => item.quantity > 0),
    [menuItems, quantities]
  )

  const totalCents = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [selectedItems]
  )

  const selectedSession = data.sessions.find((session) => session.table_id === selectedTableId) ?? null
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null
  const searchSummary = normalizedSearchQuery
    ? `${filteredMenuItems.length} matching item${filteredMenuItems.length === 1 ? '' : 's'}`
    : `${menuItems.length} item${menuItems.length === 1 ? '' : 's'} available`

  function adjustQuantity(itemId: string, delta: number) {
    setQuantities((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + delta)

      if (nextQuantity === 0) {
        const { [itemId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [itemId]: nextQuantity
      }
    })
  }

  function resetOrderComposer() {
    setOrderType(tables.length > 0 ? 'table' : 'out')
    setSearchQuery('')
    setNote('')
    setCustomerName('Guest')
    setCustomerPhone('')
    setQuantities({})
    setSelectedTableId((current) =>
      tables.some((table) => table.id === current)
        ? current
        : tables[0]?.id ?? ''
    )
  }

  async function handleCreateAdminOrder() {
    if (orderType === 'table' && !selectedTableId) {
      setFlash({
        tone: 'error',
        message: 'Choose a table before creating the order.'
      })
      return
    }

    if (orderType === 'out' && !customerName.trim()) {
      setFlash({
        tone: 'error',
        message: 'Enter a customer name for the out order.'
      })
      return
    }

    if (selectedItems.length === 0) {
      setFlash({
        tone: 'error',
        message: 'Add at least one item to the order.'
      })
      return
    }

    setFlash(null)
    setIsSubmittingOrder(true)

    const response = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderType,
        tableId: orderType === 'table' ? selectedTableId : undefined,
        customerName: orderType === 'out' ? customerName : undefined,
        customerPhone: orderType === 'out' ? customerPhone : undefined,
        note,
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity
        }))
      })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not create the admin order right now.'
      })
      setIsSubmittingOrder(false)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; receiptUrl?: string }
      | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not create the admin order.'
      })
      setIsSubmittingOrder(false)
      return
    }

    const nextData = await fetchOverviewData()

    if (nextData) {
      setData(nextData)
      resetOrderComposer()
    } else {
      resetOrderComposer()
    }

    setIsAddOrderDialogOpen(false)
    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Admin order created.'
    })
    setIsSubmittingOrder(false)

    if (orderType === 'out' && payload?.receiptUrl) {
      router.push(payload.receiptUrl)
    }
  }

  async function handleOpenOutOrderReceipt(orderId: string) {
    setPendingReceiptOrderId(orderId)

    const response = await fetch(`/api/admin/orders/${orderId}/receipt-token`, {
      method: 'POST'
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not open the receipt right now.'
      })
      setPendingReceiptOrderId(null)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; receiptUrl?: string }
      | null

    if (!response.ok || !payload?.receiptUrl) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not open the receipt right now.'
      })
      setPendingReceiptOrderId(null)
      return
    }

    setPendingReceiptOrderId(null)
    router.push(payload.receiptUrl)
  }

  return (
    <div className="sectionStack">
      <div className="buttonRow">
        <button
          className="button"
          type="button"
          onClick={() => {
            setFlash(null)
            setIsAddOrderDialogOpen(true)
          }}
        >
          Add order
        </button>
      </div>

      {flash ? <p className={`statusMessage ${flash.tone}`}>{flash.message}</p> : null}

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
        <article className="card">
          <p className="eyebrow">Server calls</p>
          <h2>{data.serviceRequests.length}</h2>
          <p>Open payment or assistance requests from active tables.</p>
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
                    <strong>{order.table_id ? `Table ${order.table_id}` : 'Out order'}</strong>
                    <span>{formatTimestamp(order.created_at)}</span>
                  </div>
                  <p>{formatOrderIdentity(order.ordered_by_name, order.ordered_by_phone)} · {order.status}</p>
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
                  <div className="adminOrderActions">
                    {order.table_id ? (
                      <Link className="button buttonSecondary" href={`/admin/sessions/${order.table_id}`}>
                        Manage table
                      </Link>
                    ) : (
                      <button
                        className={`button buttonSecondary${pendingReceiptOrderId === order.id ? ' buttonLoading' : ''}`}
                        type="button"
                        disabled={pendingReceiptOrderId !== null}
                        aria-busy={pendingReceiptOrderId === order.id}
                        onClick={() => void handleOpenOutOrderReceipt(order.id)}
                      >
                        {pendingReceiptOrderId === order.id ? (
                          <>
                            <span className="buttonSpinner" aria-hidden="true" />
                            Opening receipt...
                          </>
                        ) : (
                          'Print receipt'
                        )}
                      </button>
                    )}
                  </div>
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
                    {session.guest_phone ? <p>{session.guest_phone}</p> : null}
                    <p>
                      Session PIN <strong>{session.session_pin}</strong>
                    </p>
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

      {isAddOrderDialogOpen ? (
        <div
          className="dialogBackdrop"
          role="presentation"
          onClick={() => {
            if (!isSubmittingOrder) {
              setIsAddOrderDialogOpen(false)
            }
          }}
        >
          <div
            className="dialogCard adminOrderDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-add-order-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Admin Order</p>
            <h2 id="admin-add-order-title">Add order</h2>
            <p className="finePrint">
              Choose whether this is a table order or an out order, then build the order.
            </p>

            <div className="adminOrderDialogLayout">
              <div className="sectionStack">
                <div className="formField">
                  <label>Order type</label>
                  <div className="requestTypeRow">
                    <label className="radioChoice">
                      <input
                        type="radio"
                        name="admin-order-type"
                        value="table"
                        checked={orderType === 'table'}
                        disabled={tables.length === 0}
                        onChange={() => setOrderType('table')}
                      />
                      <span>Table order</span>
                    </label>
                    <label className="radioChoice">
                      <input
                        type="radio"
                        name="admin-order-type"
                        value="out"
                        checked={orderType === 'out'}
                        onChange={() => setOrderType('out')}
                      />
                      <span>Out order</span>
                    </label>
                  </div>
                </div>

                {orderType === 'table' ? (
                  <div className="formField">
                    <label htmlFor="admin-order-table">Table</label>
                    <select
                      id="admin-order-table"
                      name="admin-order-table"
                      value={selectedTableId}
                      onChange={(event) => setSelectedTableId(event.target.value)}
                    >
                      {tables.map((table) => {
                        const session = data.sessions.find((entry) => entry.table_id === table.id)

                        return (
                          <option key={table.id} value={table.id}>
                            {session
                              ? `${table.label} · ${session.guest_name}`
                              : `${table.label} · No active session`}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="formField">
                      <label htmlFor="admin-order-customer-name">Name</label>
                      <input
                        id="admin-order-customer-name"
                        name="admin-order-customer-name"
                        type="text"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="formField">
                      <label htmlFor="admin-order-customer-phone">Phone number</label>
                      <input
                        id="admin-order-customer-phone"
                        name="admin-order-customer-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="Optional"
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                      />
                    </div>
                  </>
                )}

                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  label="Search items"
                  placeholder="Search by item name"
                  summary={searchSummary}
                />

                <div className="adminMenuSearchResults">
                  {filteredMenuItems.length === 0 ? (
                    <p className="finePrint">No menu items match that search.</p>
                  ) : (
                    filteredMenuItems.map((item) => (
                      <div className="adminMenuItemRow" key={item.id}>
                        <div className="stack">
                          <div className="summaryRow">
                            <strong>{item.name}</strong>
                            <span>{toPrice(item.price_cents)}</span>
                          </div>
                          {item.description ? <p>{item.description}</p> : null}
                        </div>
                        <div className="quantityControls">
                          <button
                            className="quantityButton"
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => adjustQuantity(item.id, -1)}
                          >
                            −
                          </button>
                          <span className="quantityValue">{quantities[item.id] ?? 0}</span>
                          <button
                            className="quantityButton"
                            type="button"
                            aria-label={`Add one ${item.name}`}
                            onClick={() => adjustQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="adminOrderSummaryCard">
                <div className="dialogSummary">
                  <div className="summaryRow">
                    <span>Order type</span>
                    <strong>{orderType === 'table' ? 'Table order' : 'Out order'}</strong>
                  </div>
                  <div className="summaryRow">
                    <span>{orderType === 'table' ? 'Table' : 'Customer'}</span>
                    <strong>
                      {orderType === 'table'
                        ? selectedTable?.label ?? 'Choose table'
                        : customerName.trim() || 'Enter name'}
                    </strong>
                  </div>
                  <div className="summaryRow">
                    <span>{orderType === 'table' ? 'Session' : 'Phone'}</span>
                    <strong>
                      {orderType === 'table'
                        ? selectedSession?.guest_name ?? 'Guest session will be created'
                        : customerPhone.trim() || 'Not provided'}
                    </strong>
                  </div>
                </div>

                <div className="adminOrderSummaryList">
                  {selectedItems.length === 0 ? (
                    <p className="finePrint">Select menu items to build the order.</p>
                  ) : (
                    selectedItems.map((item) => (
                      <div className="adminOrderSummaryItem" key={item.itemId}>
                        <div className="stack">
                          <div className="summaryRow">
                            <strong>{item.name}</strong>
                            <span>{toPrice(item.priceCents * item.quantity)}</span>
                          </div>
                          <p className="finePrint">{toPrice(item.priceCents)} each</p>
                        </div>
                        <div className="quantityControls">
                          <button
                            className="quantityButton"
                            type="button"
                            aria-label={`Reduce ${item.name}`}
                            onClick={() => adjustQuantity(item.itemId, -1)}
                          >
                            −
                          </button>
                          <span className="quantityValue">{item.quantity}</span>
                          <button
                            className="quantityButton"
                            type="button"
                            aria-label={`Increase ${item.name}`}
                            onClick={() => adjustQuantity(item.itemId, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="formField">
                  <label htmlFor="admin-order-note">Note</label>
                  <textarea
                    id="admin-order-note"
                    name="admin-order-note"
                    rows={3}
                    placeholder="Optional order note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>

                <div className="summaryRow total">
                  <span>Total</span>
                  <strong>{toPrice(totalCents)}</strong>
                </div>

                <div className="dialogActions">
                  <button
                    className="button buttonSecondary"
                    type="button"
                    disabled={isSubmittingOrder}
                    onClick={() => setIsAddOrderDialogOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={`button${isSubmittingOrder ? ' buttonLoading' : ''}`}
                    type="button"
                    disabled={
                      isSubmittingOrder ||
                      selectedItems.length === 0 ||
                      (orderType === 'table' ? !selectedTableId : !customerName.trim())
                    }
                    aria-busy={isSubmittingOrder}
                    onClick={() => void handleCreateAdminOrder()}
                  >
                    {isSubmittingOrder ? (
                      <>
                        <span className="buttonSpinner" aria-hidden="true" />
                        Creating order...
                      </>
                    ) : (
                      'Create order'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
