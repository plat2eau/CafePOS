'use client'

import { useMemo, useState } from 'react'
import { EmptyStateCard } from '@/components/AppCards'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { SectionCard } from '@/components/ui/section-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SummaryRow } from '@/components/ui/summary-row'
import type { AdminDashboardOrderDetail } from '@/lib/admin-data'

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function formatOrderTimestamp(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}

function getPlacedByName(order: AdminDashboardOrderDetail) {
  return order.orderedByName || order.guestName || 'Guest'
}

function getGuestName(order: AdminDashboardOrderDetail) {
  return order.guestName || order.orderedByName || 'Guest'
}

function getCustomerPhone(order: AdminDashboardOrderDetail) {
  return order.orderedByPhone || order.guestPhone || 'No phone captured'
}

function getOrderLocation(order: AdminDashboardOrderDetail) {
  return order.tableId ? `Table ${order.tableId}` : 'Out order'
}

function getItemCount(order: AdminDashboardOrderDetail) {
  return order.items.reduce((count, item) => count + item.quantity, 0)
}

function getPortionLabel(portion: AdminDashboardOrderDetail['items'][number]['portion']) {
  if (!portion) {
    return null
  }

  return portion === 'half' ? 'Half' : 'Full'
}

export default function AdminDashboardOrdersDialog({
  orders,
  rangeLabel,
  timezone
}: {
  orders: AdminDashboardOrderDetail[]
  rangeLabel: string
  timezone: string
}) {
  const [open, setOpen] = useState(false)
  const summary = useMemo(() => {
    const totalCents = orders.reduce((sum, order) => sum + order.totalCents, 0)
    const tableOrders = orders.filter((order) => order.tableId).length
    const outOrders = orders.length - tableOrders

    return { totalCents, tableOrders, outOrders }
  }, [orders])

  return (
    <SectionCard as="div" density="compact" className="bg-[var(--card-bg-strong)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Past orders</p>
          <h2>Orders in selected range</h2>
          <p>
            Open a popup with expandable order cards for {rangeLabel}. Each card starts with the date,
            amount, person, and table/out order type.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="form" className="md:w-auto">
              View orders in range
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(920px,calc(100vw-24px))]">
            <DialogHeader>
              <DialogTitle>Orders in {rangeLabel}</DialogTitle>
              <DialogDescription>
                Expand any order to view items, quantities, guest contact details, status, and notes.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <p className="finePrint">Total orders</p>
                <strong className="text-2xl">{orders.length}</strong>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <p className="finePrint">Listed value</p>
                <strong className="text-2xl">{toPrice(summary.totalCents)}</strong>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <p className="finePrint">Order split</p>
                <strong className="text-2xl">
                  {summary.tableOrders} table / {summary.outOrders} out
                </strong>
              </div>
            </div>

            <div className="mt-5 flex max-h-[58vh] flex-col gap-3 overflow-y-auto pr-1">
              {orders.length === 0 ? (
                <EmptyStateCard
                  eyebrow="No orders"
                  title="No past orders in this range"
                  description="Change the dashboard date range to review previous order details."
                />
              ) : (
                orders.map((order) => {
                  const itemCount = getItemCount(order)

                  return (
                    <details
                      key={order.id}
                      className="group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4"
                    >
                      <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[1.2fr_0.9fr_0.9fr_auto] md:items-center [&::-webkit-details-marker]:hidden">
                        <div>
                          <p className="finePrint">Date</p>
                          <strong>{formatOrderTimestamp(order.createdAt, timezone)}</strong>
                        </div>
                        <div>
                          <p className="finePrint">Amount</p>
                          <strong>{toPrice(order.totalCents)}</strong>
                        </div>
                        <div>
                          <p className="finePrint">Person</p>
                          <strong>{getPlacedByName(order)}</strong>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <StatusBadge variant={order.tableId ? 'secondary' : 'outline'}>
                            {getOrderLocation(order)}
                          </StatusBadge>
                          <span className="text-sm font-semibold text-[var(--accent)] group-open:hidden">
                            Expand
                          </span>
                          <span className="hidden text-sm font-semibold text-[var(--accent)] group-open:inline">
                            Collapse
                          </span>
                        </div>
                      </summary>

                      <div className="mt-4 border-t border-[var(--border)] pt-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-[rgb(var(--accent-rgb)/0.08)] p-4">
                            <SummaryRow>
                              <span>Where</span>
                              <strong>{getOrderLocation(order)}</strong>
                            </SummaryRow>
                            <SummaryRow>
                              <span>Status</span>
                              <StatusBadge variant={order.status === 'cancelled' ? 'outline' : 'secondary'}>
                                {order.status}
                              </StatusBadge>
                            </SummaryRow>
                            <SummaryRow>
                              <span>Total items</span>
                              <strong>{itemCount}</strong>
                            </SummaryRow>
                          </div>
                          <div className="rounded-2xl bg-[rgb(var(--accent-rgb)/0.08)] p-4">
                            <SummaryRow>
                              <span>Placed by</span>
                              <strong>{getPlacedByName(order)}</strong>
                            </SummaryRow>
                            <SummaryRow>
                              <span>Guest name</span>
                              <strong>{getGuestName(order)}</strong>
                            </SummaryRow>
                            <SummaryRow>
                              <span>Phone number</span>
                              <strong>{getCustomerPhone(order)}</strong>
                            </SummaryRow>
                            {order.note ? (
                              <SummaryRow>
                                <span>Note</span>
                                <strong>{order.note}</strong>
                              </SummaryRow>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="eyebrow">Items</p>
                          <div className="mt-2 flex flex-col gap-2">
                            {order.items.length === 0 ? (
                              <p className="finePrint">No item lines were recorded for this order.</p>
                            ) : (
                              order.items.map((item, index) => {
                                const portionLabel = getPortionLabel(item.portion)

                                return (
                                  <SummaryRow
                                    key={`${order.id}-${item.itemName}-${index}`}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3"
                                  >
                                    <span>
                                      {item.itemName}
                                      {portionLabel ? (
                                        <span className="finePrint ml-2 inline">({portionLabel})</span>
                                      ) : null}
                                    </span>
                                    <strong>Qty {item.quantity} · {toPrice(item.lineTotalCents)}</strong>
                                  </SummaryRow>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </details>
                  )
                })
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SectionCard>
  )
}
