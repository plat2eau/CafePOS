import Link from 'next/link'
import { EmptyStateCard, MetricCard } from '@/components/AppCards'
import AdminDashboardDateFilter from '@/components/AdminDashboardDateFilter'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/section-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SummaryRow } from '@/components/ui/summary-row'
import { requireAdminAuth } from '@/lib/admin-auth'
import type { AdminDashboardData, AdminDashboardTopItem } from '@/lib/admin-data'
import { getAdminDashboardData } from '@/lib/admin-data'

type AdminDashboardPageProps = {
  searchParams: Promise<{
    from?: string
    to?: string
    timezone?: string
  }>
}

type TrendDisplayPoint = {
  key: string
  label: string
  revenueCents?: number
  orderCount?: number
}

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

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}

function formatMinutes(value: number | null) {
  if (value === null) {
    return 'None'
  }

  if (value < 60) {
    return `${value} min`
  }

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  if (minutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${minutes} min`
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return '0%'
  }

  return `${Math.round((numerator / denominator) * 100)}%`
}

function renderBarWidth(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return '0%'
  }

  const width = Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)
  return `${Math.min(width, 100)}%`
}

function getTrendPointValue(point: TrendDisplayPoint, metricLabel: 'revenue' | 'orders') {
  return metricLabel === 'revenue' ? point.revenueCents ?? 0 : point.orderCount ?? 0
}

function getTrendValueLabel(value: number, metricLabel: 'revenue' | 'orders') {
  return metricLabel === 'revenue' ? toPrice(value) : value.toString()
}

function getXAxisLabels(points: TrendDisplayPoint[]) {
  if (points.length <= 2) {
    return points.map((point, index) => ({ ...point, index }))
  }

  const middleIndex = Math.floor((points.length - 1) / 2)

  return [
    { ...points[0], index: 0 },
    { ...points[middleIndex], index: middleIndex },
    { ...points[points.length - 1], index: points.length - 1 }
  ]
}

function RankingList({
  eyebrow,
  title,
  description,
  items,
  metricLabel
}: {
  eyebrow: string
  title: string
  description: string
  items: AdminDashboardTopItem[]
  metricLabel: 'quantity' | 'revenue'
}) {
  const maxValue =
    items.length > 0
      ? Math.max(...items.map((item) => (metricLabel === 'quantity' ? item.quantity : item.revenueCents)))
      : 0

  return (
    <SectionCard>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="stack">
        {items.length === 0 ? (
          <EmptyStateCard
            eyebrow="No sales yet"
            title="No product activity"
            description="Selected-range sales will populate this ranking."
          />
        ) : (
          items.map((item, index) => {
            const value = metricLabel === 'quantity' ? item.quantity : item.revenueCents

            return (
              <div
                key={`${item.itemName}-${index}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4"
              >
                <SummaryRow>
                  <strong>{item.itemName}</strong>
                  <span>{metricLabel === 'quantity' ? `${item.quantity} sold` : toPrice(item.revenueCents)}</span>
                </SummaryRow>
                <div className="mt-3 h-2 rounded-full bg-[rgb(var(--accent-rgb)/0.12)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: renderBarWidth(value, maxValue) }}
                  />
                </div>
                <div className="mt-3">
                  <SummaryRow className="text-sm">
                    <span>Revenue</span>
                    <span>{toPrice(item.revenueCents)}</span>
                  </SummaryRow>
                  <SummaryRow className="text-sm">
                    <span>Quantity</span>
                    <span>{item.quantity}</span>
                  </SummaryRow>
                </div>
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}

function TrendGraph({
  points,
  metricLabel
}: {
  points: TrendDisplayPoint[]
  metricLabel: 'revenue' | 'orders'
}) {
  const values = points.map((point) => getTrendPointValue(point, metricLabel))
  const maxValue = Math.max(...values, 0)
  const totalValue = values.reduce((sum, value) => sum + value, 0)
  const peakIndex = values.reduce((peak, value, index) => (value > values[peak] ? index : peak), 0)
  const peakPoint = points[peakIndex] ?? null
  const chart = {
    width: 360,
    height: 220,
    left: 34,
    right: 18,
    top: 20,
    bottom: 172
  }
  const chartWidth = chart.width - chart.left - chart.right
  const chartHeight = chart.bottom - chart.top
  const getX = (index: number) =>
    points.length <= 1
      ? chart.left + chartWidth / 2
      : chart.left + (index / (points.length - 1)) * chartWidth
  const getY = (value: number) =>
    maxValue <= 0 ? chart.bottom : chart.bottom - (value / maxValue) * chartHeight
  const coordinates = values.map((value, index) => ({
    x: getX(index),
    y: getY(value),
    value,
    point: points[index]
  }))
  const linePath = coordinates
    .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x} ${coordinate.y}`)
    .join(' ')
  const areaPath =
    coordinates.length > 0
      ? [
          `M ${coordinates[0].x} ${chart.bottom}`,
          ...coordinates.map((coordinate) => `L ${coordinate.x} ${coordinate.y}`),
          `L ${coordinates[coordinates.length - 1].x} ${chart.bottom}`,
          'Z'
        ].join(' ')
      : ''
  const barWidth = Math.max(8, Math.min(24, (chartWidth / Math.max(points.length, 1)) * 0.52))
  const xAxisLabels = getXAxisLabels(points)
  const tooltip = {
    width: metricLabel === 'revenue' ? 106 : 92,
    height: 42
  }
  const getTooltipX = (x: number) =>
    Math.min(
      Math.max(chart.left, x - tooltip.width / 2),
      chart.width - chart.right - tooltip.width
    )
  const getTooltipY = (y: number) => Math.max(8, y - tooltip.height - 12)
  const renderTooltip = (coordinate: (typeof coordinates)[number]) => {
    const x = getTooltipX(coordinate.x)
    const y = getTooltipY(coordinate.y)
    const valueLabel =
      metricLabel === 'orders'
        ? `Orders: ${coordinate.value}`
        : `Sale: ${getTrendValueLabel(coordinate.value, metricLabel)}`

    return (
      <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        <rect
          x={x}
          y={y}
          width={tooltip.width}
          height={tooltip.height}
          rx="8"
          fill="var(--panel-strong)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x={x + 10} y={y + 17} fill="var(--text)" fontSize="12" fontWeight="700">
          {valueLabel}
        </text>
        <text x={x + 10} y={y + 32} fill="var(--muted)" fontSize="11" fontWeight="600">
          {coordinate.point.label}
        </text>
      </g>
    )
  }

  return (
    <div className="relative z-20 mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <svg
        role="img"
        aria-label={`${metricLabel === 'revenue' ? 'Daily sales' : 'Daily orders'} graph`}
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-auto w-full overflow-visible"
      >
        <line
          x1={chart.left}
          y1={chart.bottom}
          x2={chart.width - chart.right}
          y2={chart.bottom}
          stroke="rgb(var(--accent-rgb) / 0.24)"
          strokeWidth="1"
        />
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chart.bottom - chartHeight * ratio

          return (
            <line
              key={ratio}
              x1={chart.left}
              y1={y}
              x2={chart.width - chart.right}
              y2={y}
              stroke="rgb(var(--accent-rgb) / 0.12)"
              strokeWidth="1"
            />
          )
        })}

        {metricLabel === 'revenue' && areaPath ? (
          <path d={areaPath} fill="rgb(var(--accent-rgb) / 0.12)" />
        ) : null}

        {metricLabel === 'revenue' && linePath ? (
          <path d={linePath} fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        ) : null}

        {metricLabel === 'orders'
          ? coordinates.map((coordinate) => (
              <g key={coordinate.point.key}>
                <rect
                  x={coordinate.x - barWidth / 2}
                  y={coordinate.y}
                  width={barWidth}
                  height={Math.max(2, chart.bottom - coordinate.y)}
                  rx="4"
                  fill="var(--accent)"
                />
              </g>
            ))
          : coordinates.map((coordinate) => (
              <g key={coordinate.point.key}>
                <circle
                  cx={coordinate.x}
                  cy={coordinate.y}
                  r="4"
                  fill="var(--panel-strong)"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
              </g>
            ))}

        {xAxisLabels.map((point) => (
          <text
            key={`${point.key}-${point.index}`}
            x={getX(point.index)}
            y={chart.bottom + 24}
            textAnchor={point.index === 0 ? 'start' : point.index === points.length - 1 ? 'end' : 'middle'}
            fill="var(--muted)"
            fontSize="11"
          >
            {point.label}
          </text>
        ))}

        {coordinates.map((coordinate) => (
          <g
            key={`tooltip-${coordinate.point.key}`}
            className="group outline-none"
            tabIndex={0}
          >
            {metricLabel === 'orders' ? (
              <rect
                x={coordinate.x - Math.max(18, barWidth)}
                y={chart.top}
                width={Math.max(36, barWidth * 2)}
                height={chart.bottom - chart.top}
                fill="transparent"
              />
            ) : (
              <circle
                cx={coordinate.x}
                cy={coordinate.y}
                r="12"
                fill="transparent"
              />
            )}
            {renderTooltip(coordinate)}
          </g>
        ))}
      </svg>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <SummaryRow className="text-sm">
          <span>Total</span>
          <strong>{getTrendValueLabel(totalValue, metricLabel)}</strong>
        </SummaryRow>
        <SummaryRow className="text-sm">
          <span>Peak</span>
          <strong>
            {peakPoint ? `${peakPoint.label} - ${getTrendValueLabel(values[peakIndex] ?? 0, metricLabel)}` : 'None'}
          </strong>
        </SummaryRow>
      </div>
    </div>
  )
}

function TrendCard({
  eyebrow,
  title,
  description,
  points,
  metricLabel,
  display
}: {
  eyebrow: string
  title: string
  description: string
  points: TrendDisplayPoint[]
  metricLabel: 'revenue' | 'orders'
  display: 'bars' | 'graph'
}) {
  const values = points.map((point) =>
    getTrendPointValue(point, metricLabel)
  )
  const maxValue = values.length > 0 ? Math.max(...values) : 0

  return (
    <SectionCard>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>

      {display === 'graph' ? <TrendGraph points={points} metricLabel={metricLabel} /> : null}

      <div className="stack">
        {display === 'bars' ? points.map((point) => {
          const value = getTrendPointValue(point, metricLabel)

          return (
            <div
              key={point.key}
              className="grid grid-cols-[96px_minmax(0,1fr)_76px] items-center gap-3"
            >
              <span className="text-sm text-[var(--muted)]">{point.label}</span>
              <div className="h-3 rounded-full bg-[rgb(var(--accent-rgb)/0.12)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: renderBarWidth(value, maxValue) }}
                />
              </div>
              <strong className="text-right text-sm">
                {getTrendValueLabel(value, metricLabel)}
              </strong>
            </div>
          )
        }) : null}
      </div>
    </SectionCard>
  )
}

function getPeakSalesPoint(points: AdminDashboardData['salesTrend']) {
  return points.reduce<AdminDashboardData['salesTrend'][number] | null>((peak, point) => {
    if (!peak || point.revenueCents > peak.revenueCents) {
      return point
    }

    return peak
  }, null)
}

function getOrderCountForTrendPoint(
  orderTrend: AdminDashboardData['orderTrend'],
  key: string
) {
  return orderTrend.find((point) => point.key === key)?.orderCount ?? 0
}

function parseSearchTimestamp(value: string | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.floor(parsed) : null
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await searchParams
  const fromTimestamp = parseSearchTimestamp(params.from)
  const toTimestamp = parseSearchTimestamp(params.to)
  const timezone = params.timezone?.trim() || 'Asia/Kolkata'
  const [auth, dashboard] = await Promise.all([
    requireAdminAuth(),
    getAdminDashboardData({ fromTimestamp, toTimestamp, timezone })
  ])
  const totalSalesCents = dashboard.kpis.salesCents
  const totalOrderCount = dashboard.salesMix.tableOrderCount + dashboard.salesMix.outOrderCount
  const mostSoldItem = dashboard.topItemsByQuantity[0] ?? null
  const peakSalesPoint = getPeakSalesPoint(dashboard.salesTrend)
  const rangeLabel = dashboard.range.isFallback
    ? `${dashboard.range.label} (fallback)`
    : dashboard.range.label

  return (
    <main>
      <section className="hero heroShell adminSessionsShell">
        <div className="adminSessionsTopAction">
          <AdminLogoutButton />
        </div>

        <div className="heroHeader compact">
          <Link className="backLink" href="/admin/sessions">
            ← Back to live ops
          </Link>
          <p className="eyebrow">Admin Analytics</p>
          <h1>Dashboard</h1>
          <p className="lead">
            Review gross sales, order mix, product movement, and the current floor snapshot without leaving the admin area.
          </p>
          <div className="toolbar md:flex-row">
            <Button asChild variant="secondary" size="form" className="md:w-auto">
              <Link href="/admin/sessions">Open live sessions</Link>
            </Button>
          </div>
          <div className="metaPillRow">
            <span className="metaPill">
              Signed in as {auth.profile.display_name ?? auth.email ?? 'Staff'}
            </span>
            <span className="metaPill">Range {rangeLabel}</span>
            <span className="metaPill">Updated {formatGeneratedAt(dashboard.generatedAt)}</span>
          </div>
        </div>

        <AdminDashboardDateFilter
          fromDate={dashboard.range.fromDate}
          toDate={dashboard.range.toDate}
          timezone={dashboard.range.timezone}
        />

        <div className="compactGrid">
          <MetricCard
            eyebrow="Sales"
            value={toPrice(dashboard.kpis.salesCents)}
            description="Gross sales from non-cancelled orders in the selected range."
            tone="success"
          />
          <MetricCard
            eyebrow="Orders"
            value={dashboard.kpis.orderCount}
            description="Non-cancelled orders created in the selected range."
          />
          <MetricCard
            eyebrow="Average order"
            value={toPrice(dashboard.kpis.averageOrderValueCents)}
            description="Average gross value across selected-range non-cancelled orders."
          />
          <MetricCard
            eyebrow="Active tables now"
            value={dashboard.kpis.activeTablesNow}
            description="Tables with an active guest session right now."
            tone="support"
          />
        </div>

        <div className="grid">
          <TrendCard
            eyebrow="Sales trend"
            title={dashboard.trendGranularity === 'hour' ? 'Hourly sales' : 'Daily sales'}
            description="Gross sales by selected range bucket."
            points={dashboard.salesTrend}
            metricLabel="revenue"
            display={dashboard.trendGranularity === 'day' ? 'graph' : 'bars'}
          />
          <TrendCard
            eyebrow="Order trend"
            title={dashboard.trendGranularity === 'hour' ? 'Hourly orders' : 'Daily orders'}
            description="Non-cancelled order counts by selected range bucket."
            points={dashboard.orderTrend}
            metricLabel="orders"
            display={dashboard.trendGranularity === 'day' ? 'graph' : 'bars'}
          />
        </div>

        <div className="grid">
          <SectionCard>
            <p className="eyebrow">Sales mix</p>
            <h2>Table vs out orders</h2>
            <p>Revenue and order volume split for selected-range non-cancelled business.</p>

            <div className="stack">
              <SummaryRow>
                <strong>Table sales</strong>
                <span>
                  {toPrice(dashboard.salesMix.tableSalesCents)} - {dashboard.salesMix.tableOrderCount} orders -{' '}
                  {formatPercent(dashboard.salesMix.tableSalesCents, totalSalesCents)}
                </span>
              </SummaryRow>
              <SummaryRow>
                <strong>Out orders</strong>
                <span>
                  {toPrice(dashboard.salesMix.outOrderSalesCents)} - {dashboard.salesMix.outOrderCount} orders -{' '}
                  {formatPercent(dashboard.salesMix.outOrderSalesCents, totalSalesCents)}
                </span>
              </SummaryRow>
              <SummaryRow variant="total">
                <span>Total selected sales mix</span>
                <strong>
                  {toPrice(totalSalesCents)} - {totalOrderCount} orders
                </strong>
              </SummaryRow>
            </div>
          </SectionCard>

          <SectionCard>
            <p className="eyebrow">Status mix</p>
            <h2>Order status breakdown</h2>
            <p>Counts for all orders created in the selected range, including cancellations.</p>

            <div className="stack">
              {Object.entries(dashboard.salesMix.statusBreakdown).map(([status, count]) => (
                <SummaryRow key={status}>
                  <StatusBadge>{status}</StatusBadge>
                  <strong>{count}</strong>
                </SummaryRow>
              ))}
              <SummaryRow variant="total">
                <span>Cancelled value</span>
                <strong>
                  {toPrice(dashboard.salesMix.cancelledValueCents)} - {dashboard.salesMix.cancelledOrderCount} cancelled
                </strong>
              </SummaryRow>
            </div>
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard tone="support">
            <p className="eyebrow">Product spotlight</p>
            <h2>Most sold item</h2>
            <p>Best-performing item by quantity across selected-range non-cancelled orders.</p>

            {mostSoldItem ? (
              <div className="stack">
                <SummaryRow>
                  <strong>{mostSoldItem.itemName}</strong>
                  <span>{mostSoldItem.quantity} sold</span>
                </SummaryRow>
                <SummaryRow>
                  <span>Revenue contribution</span>
                  <strong>{toPrice(mostSoldItem.revenueCents)}</strong>
                </SummaryRow>
              </div>
            ) : (
              <EmptyStateCard
                eyebrow="Awaiting sales"
                title="No most-sold item yet"
                description="The first non-cancelled sale in this range will populate this card."
                tone="support"
              />
            )}
          </SectionCard>

          <SectionCard tone="support">
            <p className="eyebrow">Peak period</p>
            <h2>Best revenue {dashboard.trendGranularity === 'hour' ? 'hour' : 'day'}</h2>
            <p>Highest-grossing {dashboard.trendGranularity} in the selected range.</p>

            {peakSalesPoint && peakSalesPoint.revenueCents > 0 ? (
              <div className="stack">
                <SummaryRow>
                  <strong>{peakSalesPoint.label}</strong>
                  <span>{toPrice(peakSalesPoint.revenueCents)}</span>
                </SummaryRow>
                <SummaryRow>
                  <span>Orders in that {dashboard.trendGranularity}</span>
                  <strong>{getOrderCountForTrendPoint(dashboard.orderTrend, peakSalesPoint.key)}</strong>
                </SummaryRow>
              </div>
            ) : (
              <EmptyStateCard
                eyebrow="No revenue yet"
                title="Peak period unavailable"
                description="Range performance will appear once the selected range records its first sale."
                tone="support"
              />
            )}
          </SectionCard>
        </div>

        <div className="grid">
          <RankingList
            eyebrow="Top items"
            title="Top 5 by quantity"
            description="Most frequently sold items in the selected range, using stored item names so custom items still count."
            items={dashboard.topItemsByQuantity}
            metricLabel="quantity"
          />
          <RankingList
            eyebrow="Top revenue"
            title="Top 5 by revenue"
            description="Highest-grossing items in the selected range across non-cancelled order lines."
            items={dashboard.topItemsByRevenue}
            metricLabel="revenue"
          />
        </div>

        <SectionCard>
          <p className="eyebrow">Ops snapshot</p>
          <h2>What needs attention right now</h2>
          <p>Current service load pulled from active sessions and open service requests.</p>

          <div className="compactGrid">
            <MetricCard
              eyebrow="Open requests now"
              value={dashboard.opsSnapshot.openServiceRequests}
              description="Current payment or assistance requests still open."
              tone="support"
            />
            <MetricCard
              eyebrow="Oldest request now"
              value={formatMinutes(dashboard.opsSnapshot.oldestOpenRequestMinutes)}
              description="Age of the oldest unresolved service request."
              tone="support"
            />
            <MetricCard
              eyebrow="Occupied tables now"
              value={dashboard.opsSnapshot.occupiedTables}
              description="Tables currently tied to an active guest session."
              tone="support"
            />
            <MetricCard
              eyebrow="Longest open now"
              value={
                dashboard.opsSnapshot.longestOpenTableSession
                  ? formatMinutes(dashboard.opsSnapshot.longestOpenTableSession.durationMinutes)
                  : 'None'
              }
              description="Duration of the longest active table session."
              tone="support"
            />
          </div>

          {dashboard.opsSnapshot.longestOpenTableSession ? (
            <div className="stack">
              <SummaryRow>
                <strong>Longest open table</strong>
                <span>Table {dashboard.opsSnapshot.longestOpenTableSession.tableId}</span>
              </SummaryRow>
              <SummaryRow>
                <span>Guest</span>
                <span>{dashboard.opsSnapshot.longestOpenTableSession.guestName}</span>
              </SummaryRow>
              <SummaryRow>
                <span>Started</span>
                <span>{formatTimestamp(dashboard.opsSnapshot.longestOpenTableSession.startedAt)}</span>
              </SummaryRow>
            </div>
          ) : null}
        </SectionCard>
      </section>
    </main>
  )
}
