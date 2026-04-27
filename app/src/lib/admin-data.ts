import type { Database } from '@/lib/database.types'
import {
  businessDateToRange,
  businessDayStartHour,
  formatDateKey,
  getBusinessDateKey,
  getBusinessDateLabel,
  getBusinessDateParts,
  getDateTimeParts,
  normalizeBusinessTimezone,
  parseDateKey
} from '@/lib/business-day'
import { logApiError } from '@/lib/api-errors'
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
  out_check_id: string | null
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

export type AdminOutCheck = {
  id: string
  customer_name: string
  customer_phone: string | null
  created_at: string
  orders: AdminOrder[]
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
  outChecks: AdminOutCheck[]
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

export type AdminDashboardOrderItem = {
  itemName: string
  portion: 'half' | 'full' | null
  quantity: number
  lineTotalCents: number
}

export type AdminDashboardOrderDetail = {
  id: string
  tableId: string | null
  createdAt: string
  status: AdminOrder['status']
  note: string | null
  totalCents: number
  orderedByName: string
  orderedByPhone: string
  guestName: string | null
  guestPhone: string | null
  items: AdminDashboardOrderItem[]
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
  orders: AdminDashboardOrderDetail[]
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

function buildRangeLabel(fromDateKey: string, toDateKey: string, timezone: string) {
  const fromLabel = getBusinessDateLabel(fromDateKey, timezone)

  if (fromDateKey === toDateKey) {
    return fromLabel
  }

  return `${fromLabel} - ${getBusinessDateLabel(toDateKey, timezone)}`
}

function getTodayDashboardRange(timezone: string, isFallback = false): AdminDashboardRange {
  const now = new Date()
  const today = getBusinessDateParts(now, timezone)
  const fromDate = formatDateKey(today)
  const { startAt, endAt } = businessDateToRange(today, timezone)

  return {
    timezone,
    fromDate,
    toDate: fromDate,
    fromTimestamp: toUnixSeconds(startAt),
    toTimestamp: toUnixSeconds(endAt),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    label: getBusinessDateLabel(fromDate, timezone),
    isFallback
  }
}

function resolveDashboardRange(options?: {
  fromTimestamp?: number | string | null
  toTimestamp?: number | string | null
  timezone?: string
}) {
  const timezone = normalizeBusinessTimezone(options?.timezone)
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
  const fromDate = getBusinessDateKey(startAt, timezone)
  const toDate = getBusinessDateKey(displayEndAt, timezone)

  return {
    timezone,
    fromDate,
    toDate,
    fromTimestamp,
    toTimestamp,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    label: buildRangeLabel(fromDate, toDate, timezone),
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

function createTrendPoints(range: AdminDashboardRange): AdminDashboardTrendPoint[] {
  if (range.fromDate === range.toDate) {
    return Array.from({ length: 24 }, (_, index) => {
      const hour = (businessDayStartHour + index) % 24

      return {
        key: hour.toString(),
        label: getHourLabel(hour),
        revenueCents: 0,
        orderCount: 0
      }
    })
  }

  const from = parseDateKey(range.fromDate)
  const to = parseDateKey(range.toDate)

  if (!from || !to) {
    return []
  }

  const points: AdminDashboardTrendPoint[] = []
  const cursor = new Date(Date.UTC(from.year, from.month - 1, from.day))
  const end = new Date(Date.UTC(to.year, to.month - 1, to.day))

  while (cursor.getTime() <= end.getTime()) {
    const key = formatDateKey({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate()
    })

    points.push({
      key,
      label: getBusinessDateLabel(key, range.timezone),
      revenueCents: 0,
      orderCount: 0
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return points
}

function throwDataLoadError(context: string, message: string, cause?: unknown): never {
  logApiError(context, cause)
  throw new Error(message)
}

async function fetchOrdersWithItems(options?: {
  tableId?: string
  sessionId?: string
  sessionIds?: string[]
  outCheckIds?: string[]
  limit?: number
}) {
  const supabase = createServerSupabaseClient()
  const ordersQuery = supabase
    .from('orders')
    .select('id, table_id, out_check_id, created_at, status, note, total_cents, session_id, ordered_by_name, ordered_by_phone')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 20)

  const filteredQuery = options?.tableId
    ? ordersQuery.eq('table_id', options.tableId)
    : options?.sessionId
      ? ordersQuery.eq('session_id', options.sessionId)
    : options?.sessionIds
      ? options.sessionIds.length > 0
        ? ordersQuery.in('session_id', options.sessionIds)
        : null
    : options?.outCheckIds
      ? options.outCheckIds.length > 0
        ? ordersQuery.in('out_check_id', options.outCheckIds)
        : null
      : ordersQuery

  const { data: orders, error: ordersError } = filteredQuery
    ? await filteredQuery
    : { data: [], error: null }

  if (ordersError) {
    throwDataLoadError('adminData.fetchOrdersWithItems.orders', 'Could not load orders.', ordersError)
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
    if (orderItemsError) {
      logApiError('adminData.fetchOrdersWithItems.orderItems', orderItemsError)
    }
    throwDataLoadError(
      'adminData.fetchOrdersWithItems.sessionDetails',
      'Could not load order details.',
      sessionDetailsError
    )
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
  const [{ data: sessions, error: sessionsError }, { data: outChecks, error: outChecksError }] =
    await Promise.all([
      supabase
        .from('table_sessions')
        .select('id, table_id, guest_name, guest_phone, started_at, last_active_at, session_pin')
        .eq('status', 'active')
        .order('last_active_at', { ascending: false }),
      supabase
        .from('out_checks')
        .select('id, customer_name, customer_phone, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
    ])

  if (sessionsError) {
    throwDataLoadError(
      'adminData.getAdminOverviewData.sessions',
      'Could not load active sessions.',
      sessionsError
    )
  }

  if (outChecksError) {
    throw new Error('Could not load open out checks.')
  }

  const activeSessionIds = (sessions ?? []).map((session) => session.id)
  const orders = await fetchOrdersWithItems()
  const openOutCheckOrders = await fetchOrdersWithItems({
    outCheckIds: (outChecks ?? []).map((outCheck) => outCheck.id),
    limit: 1000
  })
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
    throwDataLoadError(
      'adminData.getAdminOverviewData.serviceRequests',
      'Could not load service requests.',
      serviceRequestsError
    )
  }

  const sessionNameById = new Map((sessions ?? []).map((session) => [session.id, session.guest_name]))

  return {
    generatedAt: new Date().toISOString(),
    sessions: sessions ?? [],
    outChecks: (outChecks ?? []).map((outCheck) => ({
      ...outCheck,
      orders: openOutCheckOrders.filter((order) => order.out_check_id === outCheck.id)
    })),
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
  const timezone = normalizeBusinessTimezone(options?.timezone)
  const range = resolveDashboardRange({
    fromTimestamp: options?.fromTimestamp,
    toTimestamp: options?.toTimestamp,
    timezone
  })
  const supabase = createServerSupabaseClient()

  const [ordersResult, sessionsResult, serviceRequestsResult] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, table_id, session_id, out_check_id, status, note, total_cents, created_at, ordered_by_name, ordered_by_phone'
      )
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
    throwDataLoadError(
      'adminData.getAdminDashboardData.orders',
      'Could not load dashboard orders.',
      ordersResult.error
    )
  }

  if (sessionsResult.error) {
    throwDataLoadError(
      'adminData.getAdminDashboardData.sessions',
      'Could not load dashboard sessions.',
      sessionsResult.error
    )
  }

  if (serviceRequestsResult.error) {
    throwDataLoadError(
      'adminData.getAdminDashboardData.serviceRequests',
      'Could not load dashboard service requests.',
      serviceRequestsResult.error
    )
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
        .select('order_id, item_name, portion, quantity, line_total_cents')
        .in('order_id', orderIds)
    : { data: [], error: null }

  if (orderItemsResult.error) {
    throwDataLoadError(
      'adminData.getAdminDashboardData.orderItems',
      'Could not load dashboard order items.',
      orderItemsResult.error
    )
  }

  const orderSessionIds = Array.from(
    new Set(
      orders
        .map((order) => order.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId))
    )
  )
  const orderSessionsResult = orderSessionIds.length
    ? await supabase
        .from('table_sessions')
        .select('id, guest_name, guest_phone')
        .in('id', orderSessionIds)
    : { data: [], error: null }

  if (orderSessionsResult.error) {
    throwDataLoadError(
      'adminData.getAdminDashboardData.orderSessions',
      'Could not load dashboard order guests.',
      orderSessionsResult.error
    )
  }

  const sessionGuestById = new Map(
    (orderSessionsResult.data ?? []).map((session) => [
      session.id,
      {
        guestName: session.guest_name,
        guestPhone: session.guest_phone
      }
    ])
  )
  const orderItemsByOrderId = new Map<string, AdminDashboardOrderItem[]>()

  for (const item of orderItemsResult.data ?? []) {
    const orderItems = orderItemsByOrderId.get(item.order_id) ?? []

    orderItems.push({
      itemName: item.item_name,
      portion: item.portion,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents
    })
    orderItemsByOrderId.set(item.order_id, orderItems)
  }

  const dashboardOrders: AdminDashboardOrderDetail[] = [...orders]
    .sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
    .map((order) => {
      const sessionGuest = order.session_id ? sessionGuestById.get(order.session_id) : null

      return {
        id: order.id,
        tableId: order.table_id,
        createdAt: order.created_at,
        status: order.status,
        note: order.note,
        totalCents: order.total_cents,
        orderedByName: order.ordered_by_name,
        orderedByPhone: order.ordered_by_phone,
        guestName: sessionGuest?.guestName ?? null,
        guestPhone: sessionGuest?.guestPhone ?? null,
        items: orderItemsByOrderId.get(order.id) ?? []
      }
    })

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
        : getBusinessDateKey(orderDate, timezone)
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
    orders: dashboardOrders,
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
    throwDataLoadError('adminData.getAdminMenuItems', 'Could not load menu items.', error)
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
    throwDataLoadError('adminData.getAdminMenuCategories', 'Could not load menu categories.', error)
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
    throwDataLoadError('adminData.getAdminTableOptions', 'Could not load tables.', error)
  }

  return data ?? []
}
