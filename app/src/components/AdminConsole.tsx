'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { AdminOverviewData, AdminTableSummary } from '@/lib/admin-data'

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

function getTableAttentionLabel(table: AdminTableSummary) {
  if (table.hasPaymentRequest) {
    return 'Needs payment'
  }

  if (table.hasAssistanceRequest) {
    return 'Needs assistance'
  }

  if (table.hasUnservedOrders) {
    return 'Orders in progress'
  }

  return null
}

export default function AdminConsole({ initialData }: AdminConsoleProps) {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    let cancelled = false

    async function refreshOverview() {
      const response = await fetch('/api/admin/overview', {
        method: 'GET',
        cache: 'no-store'
      }).catch(() => null)

      if (!response || !response.ok || cancelled) {
        return
      }

      const nextData = (await response.json()) as AdminOverviewData

      if (!cancelled) {
        setData(nextData)
      }
    }

    const interval = window.setInterval(refreshOverview, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const tableCountLabel = useMemo(() => {
    const count = data.tables.length
    return `${count} table${count === 1 ? '' : 's'}`
  }, [data.tables.length])

  return (
    <section id="tables-grid" className="adminTablesColumn">
      <div className="summaryRow adminGridHeader">
        <div className="adminGridHeaderTitle">
          <p className="eyebrow">Live floor</p>
          <h2>Open tables</h2>
        </div>
        <div className="adminGridMeta">
          <span className="metaPill">{tableCountLabel}</span>
          <span className="metaPill">Updated {formatTimestamp(data.generatedAt)}</span>
        </div>
      </div>

      {data.tables.length === 0 ? (
        <article className="card supportCard adminEmptyState">
          <p className="eyebrow">No open tables</p>
          <h2>Nothing needs attention right now</h2>
          <p>
            When a guest opens a session, the table will appear here. New orders and service
            requests will show as popup alerts.
          </p>
        </article>
      ) : (
        <div className="adminTableGrid">
          {data.tables.map((table) => {
            const attentionLabel = getTableAttentionLabel(table)

            return (
              <Link
                className={`card adminTableCard adminTableCardLink${table.hasPaymentRequest ? ' attention-payment' : ''}${table.hasAssistanceRequest ? ' attention-assistance' : ''}${table.hasUnservedOrders ? ' attention-orders' : ''}`}
                key={table.tableId}
                href={`/admin/sessions/${table.tableId}`}
              >
                <div className="adminTableCardTopRight" aria-label="Table counters">
                  <div className="adminCounterPill" title="Open orders">
                    <span className="adminCounterIcon" aria-hidden="true">
                      ◔
                    </span>
                    <span className="adminCounterCircle">{table.openOrderCount}</span>
                  </div>
                  <div className="adminCounterPill" title="Open requests">
                    <span className="adminCounterIcon" aria-hidden="true">
                      ⌁
                    </span>
                    <span className="adminCounterCircle">{table.openRequestCount}</span>
                  </div>
                </div>

                <div className="adminTableCardHeader">
                  <p className="eyebrow">Table</p>
                  <h2>{table.tableLabel}</h2>
                  {attentionLabel ? <span className="statusChip">{attentionLabel}</span> : null}
                </div>

                <div className="adminTableMeta">
                  <p className="adminTableGuest adminClampTwoLines">{table.guestName}</p>
                  <p className="adminTableSubtle adminClampOneLine">{table.guestPhone}</p>
                  <p className="adminTableSubtle adminClampOneLine">
                    Bill {toPrice(table.runningTotalCents)}
                  </p>
                  <p className="adminTableSubtle adminClampOneLine">
                    Active {formatTimestamp(table.lastActiveAt)}
                  </p>
                </div>

                <div className="adminTableCardFooter">
                  <span className="adminTableOpenLabel">Open table</span>
                  <span className="adminTableOpenArrow" aria-hidden="true">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
