import type { Database } from '@/lib/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AdminOrderItem = {
  id: string
  menu_item_id: string | null
  item_name: string
  portion: 'half' | 'full' | null
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

export type AdminOrder = {
  id: string
  table_id: string | null
  created_at: string
  status: 'placed' | 'preparing' | 'served' | 'cancelled'
  note: string | null
  total_cents: number
  session_id: string | null
  guest_name: string | null
  ordered_by_name: string
  ordered_by_phone: string
  items: AdminOrderItem[]
}

export type AdminServiceRequest = {
  id: string
  table_id: string
  session_id: string
  request_type: 'payment' | 'assistance'
  note: string | null
  status: 'open' | 'resolved'
  created_at: string
  guest_name: string | null
}

export type AdminSession = {
  id: string
  table_id: string
  guest_name: string
  guest_phone: string | null
  last_active_at: string
  session_pin: string
  started_at?: string
  status?: 'active' | 'closed'
}

export type AdminMenuItem = Pick<
  Database['public']['Tables']['menu_items']['Row'],
  'id' | 'category_id' | 'name' | 'description' | 'price_cents' | 'half_price_cents' | 'full_price_cents' | 'sort_order'
>

export type AdminMenuCategory = Pick<
  Database['public']['Tables']['menu_categories']['Row'],
  'id' | 'name' | 'sort_order'
>

export type AdminTableOption = Pick<
  Database['public']['Tables']['tables']['Row'],
  'id' | 'label' | 'is_active'
>

export type AdminOverviewData = {
  generatedAt: string
  sessions: AdminSession[]
  orders: AdminOrder[]
  serviceRequests: AdminServiceRequest[]
}

export type AdminDashboardRange = {
  timezone: string
  fromDate: string
  toDate: string
  fromTimestamp: number
  toTimestamp: number
  startAt: string
  endAt: string
  label: string
  isFallback: boolean
}

export type AdminDashboardStatusBreakdown = Record<AdminOrder['status'], number>

export type AdminDashboardTopItem = {
  itemName: string
  quantity: number
  revenueCents: number
}

export type AdminDashboardTrendGranularity = 'hour' | 'day'

export type AdminDashboardTrendPoint = {
  key: string
  label: string
  revenueCents: number
  orderCount: number
}

export type AdminDashboardData = {
  range: AdminDashboardRange
  generatedAt: string
  kpis: {
    salesCents: number
    orderCount: number
    averageOrderValueCents: number
    activeTablesNow: number
  }
  salesMix: {
    tableSalesCents: number
    outOrderSalesCents: number
    tableOrderCount: number
    outOrderCount: number
    statusBreakdown: AdminDashboardStatusBreakdown
    cancelledOrderCount: number
    cancelledValueCents: number
  }
  topItemsByQuantity: AdminDashboardTopItem[]
  topItemsByRevenue: AdminDashboardTopItem[]
  trendGranularity: AdminDashboardTrendGranularity
  salesTrend: Array<Pick<AdminDashboardTrendPoint, 'key' | 'label' | 'revenueCents'>>
  orderTrend: Array<Pick<AdminDashboardTrendPoint, 'key' | 'label' | 'orderCount'>>
  opsSnapshot: {
    openServiceRequests: number
    oldestOpenRequestMinutes: number | null
    occupiedTables: number
    longestOpenTableSession:
      | {
          tableId: string
          guestName: string
          durationMinutes: number
          startedAt: string
        }
      | null
  }
}

type TimeZoneDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>()
const defaultDashboardTimezone = 'Asia/Kolkata'

function normalizeTimezone(timezone?: string | null) {
  const candidate = timezone?.trim() || defaultDashboardTimezone

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return defaultDashboardTimezone
  }
}

function getTimeFormatter(timezone: string) {
  const key = `parts:${timezone}`

  if (!timeFormatterCache.has(key)) {
    timeFormatterCache.set(
      key,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      })
    )
  }

  return timeFormatterCache.get(key)!
}

function getDateLabelFormatter(timezone: string) {
  const key = `label:${timezone}`

  if (!timeFormatterCache.has(key)) {
    timeFormatterCache.set(
      key,
      new Intl.DateTimeFormat('en-IN', {
        timeZone: timezone,
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    )
  }

  return timeFormatterCache.get(key)!
}

function getDateTimeParts(date: Date, timezone: string): TimeZoneDateParts {
  const parts = getTimeFormatter(timezone).formatToParts(date)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)])
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  }
}

function getTimeZoneOffsetMs(date: Date, timezone: string) {
  const parts = getDateTimeParts(date, timezone)

  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    ) - date.getTime()
  )
}

function zonedDateTimeToUtc(parts: TimeZoneDateParts, timezone: string) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  )
  const offset = getTimeZoneOffsetMs(utcGuess, timezone)

  return new Date(utcGuess.getTime() - offset)
}

function addCivilDays(year: number, month: number, day: number, days: number) {
  const next = new Date(Date.UTC(year, month - 1, day + days))

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  }
}

function padDatePart(value: number) {
  return value.toString().padStart(2, '0')
}

function formatDateKey(parts: Pick<TimeZoneDateParts, 'year' | 'month' | 'day'>) {
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`
}

function getDateKey(date: Date, timezone: string) {
  return formatDateKey(getDateTimeParts(date, timezone))
}

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000)
}

function parseUnixSeconds(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.floor(parsed > 9999999999 ? parsed / 1000 : parsed)
}

function buildRangeLabel(fromDate: Date, toDate: Date, timezone: string) {
  const formatter = getDateLabelFormatter(timezone)

  if (getDateKey(fromDate, timezone) === getDateKey(toDate, timezone)) {
    return formatter.format(fromDate)
  }

  return `${formatter.format(fromDate)} - ${formatter.format(toDate)}`
}

function getTodayDashboardRange(timezone: string, isFallback = false): AdminDashboardRange {
  const now = new Date()
  const today = getDateTimeParts(now, timezone)
  const tomorrow = addCivilDays(today.year, today.month, today.day, 1)
  const fromDate = formatDateKey(today)
  const startAt = zonedDateTimeToUtc(
    {
      year: today.year,
      month: today.month,
      day: today.day,
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  )
  const endAt = zonedDateTimeToUtc(
    {
      year: tomorrow.year,
      month: tomorrow.month,
      day: tomorrow.day,
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  )

  return {
    timezone,
    fromDate,
    toDate: fromDate,
    fromTimestamp: toUnixSeconds(startAt),
    toTimestamp: toUnixSeconds(endAt),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    label: getDateLabelFormatter(timezone).format(now),
    isFallback
  }
}

function resolveDashboardRange(options?: {
  fromTimestamp?: number | string | null
  toTimestamp?: number | string | null
  timezone?: string
}) {
  const timezone = normalizeTimezone(options?.timezone)
  const fromTimestamp = parseUnixSeconds(options?.fromTimestamp)
  const toTimestamp = parseUnixSeconds(options?.toTimestamp)

  if (fromTimestamp === null && toTimestamp === null) {
    return getTodayDashboardRange(timezone)
  }

  if (fromTimestamp === null || toTimestamp === null || fromTimestamp >= toTimestamp) {
    return getTodayDashboardRange(timezone, true)
  }

  const startAt = new Date(fromTimestamp * 1000)
  const endAt = new Date(toTimestamp * 1000)

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return getTodayDashboardRange(timezone, true)
  }

  const displayEndAt = new Date(endAt.getTime() - 1)

  return {
    timezone,
    fromDate: getDateKey(startAt, timezone),
    toDate: getDateKey(displayEndAt, timezone),
    fromTimestamp,
    toTimestamp,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    label: buildRangeLabel(startAt, displayEndAt, timezone),
    isFallback: false
  }
}

function createStatusBreakdown(): AdminDashboardStatusBreakdown {
  return {
    placed: 0,
    preparing: 0,
    served: 0,
    cancelled: 0
  }
}

function getHourLabel(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12
  return `${normalizedHour} ${suffix}`
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))

  if (!year || !month || !day) {
    return null
  }

  return { year, month, day }
}

function createTrendPoints(range: AdminDashboardRange): AdminDashboardTrendPoint[] {
  if (range.fromDate === range.toDate) {
    return Array.from({ length: 24 }, (_, hour) => ({
      key: hour.toString(),
      label: getHourLabel(hour),
      revenueCents: 0,
      orderCount: 0
    }))
  }

  const from = parseDateKey(range.fromDate)
  const to = parseDateKey(range.toDate)

  if (!from || !to) {
    return []
  }

  const points: AdminDashboardTrendPoint[] = []
  const cursor = new Date(Date.UTC(from.year, from.month - 1, from.day))
  const end = new Date(Date.UTC(to.year, to.month - 1, to.day))
  const formatter = getDateLabelFormatter(range.timezone)

  while (cursor.getTime() <= end.getTime()) {
    const key = formatDateKey({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate()
    })

    const labelDate = zonedDateTimeToUtc(
      {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        day: cursor.getUTCDate(),
        hour: 12,
        minute: 0,
        second: 0
      },
      range.timezone
    )

    points.push({
      key,
      label: formatter.format(labelDate),
      revenueCents: 0,
      orderCount: 0
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return points
}

async function fetchOrdersWithItems(options?: {
  tableId?: string
  sessionId?: string
  sessionIds?: string[]
}) {
  const supabase = createServerSupabaseClient()
  const ordersQuery = supabase
    .from('orders')
    .select('id, table_id, created_at, status, note, total_cents, session_id, ordered_by_name, ordered_by_phone')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const filteredQuery = options?.tableId
    ? ordersQuery.eq('table_id', options.tableId)
    : options?.sessionId
      ? ordersQuery.eq('session_id', options.sessionId)
    : options?.sessionIds
      ? options.sessionIds.length > 0
        ? ordersQuery.in('session_id', options.sessionIds)
        : null
      : ordersQuery

  const { data: orders, error: ordersError } = filteredQuery
    ? await filteredQuery
    : { data: [], error: null }

  if (ordersError) {
    throw new Error('Could not load orders.')
  }

  const sessionIds = Array.from(
    new Set(
      (orders ?? [])
        .map((order) => order.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId))
    )
  )
  const orderIds = (orders ?? []).map((order) => order.id)

  const [{ data: orderItems, error: orderItemsError }, { data: sessionDetails, error: sessionDetailsError }] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from('order_items')
          .select('id, order_id, menu_item_id, item_name, portion, quantity, unit_price_cents, line_total_cents')
          .in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length > 0
      ? supabase
          .from('table_sessions')
          .select('id, guest_name')
          .in('id', sessionIds)
      : Promise.resolve({ data: [], error: null })
  ])

  if (orderItemsError || sessionDetailsError) {
    throw new Error('Could not load order details.')
  }

  const sessionNameById = new Map(
    (sessionDetails ?? []).map((session) => [session.id, session.guest_name])
  )

  const orderItemsByOrderId = new Map<string, AdminOrderItem[]>()

  for (const item of orderItems ?? []) {
    const list = orderItemsByOrderId.get(item.order_id)
    if (list) {
      list.push(item)
    } else {
      orderItemsByOrderId.set(item.order_id, [item])
    }
  }

  return (orders ?? []).map((order) => ({
    ...order,
    guest_name: order.session_id ? sessionNameById.get(order.session_id) ?? null : null,
    items: orderItemsByOrderId.get(order.id) ?? []
  }))
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const supabase = createServerSupabaseClient()
  const { data: sessions, error: sessionsError } = await supabase
    .from('table_sessions')
    .select('id, table_id, guest_name, guest_phone, started_at, last_active_at, session_pin')
    .eq('status', 'active')
    .order('last_active_at', { ascending: false })

  if (sessionsError) {
    throw new Error('Could not load active sessions.')
  }

  const activeSessionIds = (sessions ?? []).map((session) => session.id)
  const orders = await fetchOrdersWithItems()
  const { data: serviceRequests, error: serviceRequestsError } = activeSessionIds.length
    ? await supabase
        .from('service_requests')
        .select('id, table_id, session_id, request_type, note, status, created_at')
        .in('session_id', activeSessionIds)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [], error: null }

  if (serviceRequestsError) {
    throw new Error('Could not load service requests.')
  }

  const sessionNameById = new Map((sessions ?? []).map((session) => [session.id, session.guest_name]))

  return {
    generatedAt: new Date().toISOString(),
    sessions: sessions ?? [],
    orders,
    serviceRequests: (serviceRequests ?? []).map((request) => ({
      ...request,
      guest_name: sessionNameById.get(request.session_id) ?? null
    }))
  }
}

export async function getAdminDashboardData(options?: {
  fromTimestamp?: number | string | null
  toTimestamp?: number | string | null
  timezone?: string
}): Promise<AdminDashboardData> {
  const timezone = normalizeTimezone(options?.timezone)
  const range = resolveDashboardRange({
    fromTimestamp: options?.fromTimestamp,
    toTimestamp: options?.toTimestamp,
    timezone
  })
  const supabase = createServerSupabaseClient()

  const [ordersResult, sessionsResult, serviceRequestsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, table_id, status, total_cents, created_at')
      .gte('created_at', range.startAt)
      .lt('created_at', range.endAt)
      .order('created_at', { ascending: true }),
    supabase
      .from('table_sessions')
      .select('id, table_id, guest_name, started_at')
      .eq('status', 'active'),
    supabase
      .from('service_requests')
      .select('id, table_id, session_id, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
  ])

  if (ordersResult.error) {
    throw new Error('Could not load dashboard orders.')
  }

  if (sessionsResult.error) {
    throw new Error('Could not load dashboard sessions.')
  }

  if (serviceRequestsResult.error) {
    throw new Error('Could not load dashboard service requests.')
  }

  const orders = ordersResult.data ?? []
  const activeSessions = sessionsResult.data ?? []
  const openServiceRequests = serviceRequestsResult.data ?? []
  const orderIds = orders.map((order) => order.id)
  const nonCancelledOrders = orders.filter((order) => order.status !== 'cancelled')
  const nonCancelledOrderIds = new Set(nonCancelledOrders.map((order) => order.id))
  const orderItemsResult = orderIds.length
    ? await supabase
        .from('order_items')
        .select('order_id, item_name, quantity, line_total_cents')
        .in('order_id', orderIds)
    : { data: [], error: null }

  if (orderItemsResult.error) {
    throw new Error('Could not load dashboard order items.')
  }

  const statusBreakdown = createStatusBreakdown()
  const itemMetrics = new Map<string, AdminDashboardTopItem>()
  const trendGranularity: AdminDashboardTrendGranularity =
    range.fromDate === range.toDate ? 'hour' : 'day'
  const trendPoints = createTrendPoints(range)
  const trendPointByKey = new Map(trendPoints.map((point) => [point.key, point]))

  let salesCents = 0
  let tableSalesCents = 0
  let outOrderSalesCents = 0
  let tableOrderCount = 0
  let outOrderCount = 0
  let cancelledOrderCount = 0
  let cancelledValueCents = 0

  for (const order of orders) {
    statusBreakdown[order.status] += 1

    if (order.status === 'cancelled') {
      cancelledOrderCount += 1
      cancelledValueCents += order.total_cents
      continue
    }

    salesCents += order.total_cents

    if (order.table_id) {
      tableSalesCents += order.total_cents
      tableOrderCount += 1
    } else {
      outOrderSalesCents += order.total_cents
      outOrderCount += 1
    }

    const orderDate = new Date(order.created_at)
    const trendKey =
      trendGranularity === 'hour'
        ? getDateTimeParts(orderDate, timezone).hour.toString()
        : getDateKey(orderDate, timezone)
    const trendPoint = trendPointByKey.get(trendKey)

    if (trendPoint) {
      trendPoint.revenueCents += order.total_cents
      trendPoint.orderCount += 1
    }
  }

  for (const item of orderItemsResult.data ?? []) {
    if (!nonCancelledOrderIds.has(item.order_id)) {
      continue
    }

    const existing = itemMetrics.get(item.item_name)
    if (existing) {
      existing.quantity += item.quantity
      existing.revenueCents += item.line_total_cents
      continue
    }

    itemMetrics.set(item.item_name, {
      itemName: item.item_name,
      quantity: item.quantity,
      revenueCents: item.line_total_cents
    })
  }

  const rankedItems = Array.from(itemMetrics.values())
  const now = Date.now()
  const oldestOpenRequestMinutes =
    openServiceRequests.length > 0
      ? Math.max(
          0,
          Math.floor((now - new Date(openServiceRequests[0].created_at).getTime()) / 60000)
        )
      : null
  const longestOpenTableSession = activeSessions.reduce<AdminDashboardData['opsSnapshot']['longestOpenTableSession']>(
    (longest, session) => {
      const durationMinutes = Math.max(
        0,
        Math.floor((now - new Date(session.started_at).getTime()) / 60000)
      )

      if (!longest || durationMinutes > longest.durationMinutes) {
        return {
          tableId: session.table_id,
          guestName: session.guest_name,
          durationMinutes,
          startedAt: session.started_at
        }
      }

      return longest
    },
    null
  )
  const orderCount = nonCancelledOrders.length

  return {
    range,
    generatedAt: new Date().toISOString(),
    kpis: {
      salesCents,
      orderCount,
      averageOrderValueCents: orderCount > 0 ? Math.round(salesCents / orderCount) : 0,
      activeTablesNow: activeSessions.length
    },
    salesMix: {
      tableSalesCents,
      outOrderSalesCents,
      tableOrderCount,
      outOrderCount,
      statusBreakdown,
      cancelledOrderCount,
      cancelledValueCents
    },
    topItemsByQuantity: [...rankedItems]
      .sort((left, right) => right.quantity - left.quantity || right.revenueCents - left.revenueCents)
      .slice(0, 5),
    topItemsByRevenue: [...rankedItems]
      .sort((left, right) => right.revenueCents - left.revenueCents || right.quantity - left.quantity)
      .slice(0, 5),
    trendGranularity,
    salesTrend: trendPoints.map((point) => ({
      key: point.key,
      label: point.label,
      revenueCents: point.revenueCents
    })),
    orderTrend: trendPoints.map((point) => ({
      key: point.key,
      label: point.label,
      orderCount: point.orderCount
    })),
    opsSnapshot: {
      openServiceRequests: openServiceRequests.length,
      oldestOpenRequestMinutes,
      occupiedTables: activeSessions.length,
      longestOpenTableSession
    }
  }
}

export async function getAdminMenuItems(): Promise<AdminMenuItem[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, price_cents, half_price_cents, full_price_cents, sort_order')
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error('Could not load menu items.')
  }

  return data ?? []
}

export async function getAdminMenuCategories(): Promise<AdminMenuCategory[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('menu_categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error('Could not load menu categories.')
  }

  return data ?? []
}

export async function getAdminTableOptions(): Promise<AdminTableOption[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('tables')
    .select('id, label, is_active')
    .eq('is_active', true)
    .order('label', { ascending: true })

  if (error) {
    throw new Error('Could not load tables.')
  }

  return data ?? []
}
