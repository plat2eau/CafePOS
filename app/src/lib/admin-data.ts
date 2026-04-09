import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AdminOrderItem = {
  item_name: string
  quantity: number
  line_total_cents: number
}

export type AdminOrder = {
  id: string
  table_id: string
  created_at: string
  status: 'placed' | 'preparing' | 'served' | 'cancelled'
  note: string | null
  total_cents: number
  session_id: string
  guest_name: string | null
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
  guest_phone: string
  last_active_at: string
  started_at?: string
  status?: 'active' | 'closed'
}

export type AdminOverviewData = {
  generatedAt: string
  sessions: AdminSession[]
  orders: AdminOrder[]
  serviceRequests: AdminServiceRequest[]
  tables: AdminTableSummary[]
}

export type AdminTableSummary = {
  tableId: string
  tableLabel: string
  guestName: string
  guestPhone: string
  openOrderCount: number
  openRequestCount: number
  runningTotalCents: number
  lastActiveAt: string
  hasPaymentRequest: boolean
  hasAssistanceRequest: boolean
  hasUnservedOrders: boolean
}

export type AdminTableDetailData = {
  table: {
    id: string
    label: string
    is_active: boolean
  } | null
  activeSession: {
    id: string
    guest_name: string
    guest_phone: string
    started_at: string
    last_active_at: string
    status: 'active' | 'closed'
  } | null
  recentOrders: AdminOrder[]
  serviceRequests: AdminServiceRequest[]
}

async function fetchOrdersWithItems(options?: {
  tableId?: string
  sessionId?: string
  sessionIds?: string[]
}) {
  const supabase = createServerSupabaseClient()
  const ordersQuery = supabase
    .from('orders')
    .select('id, table_id, created_at, status, note, total_cents, session_id')
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

  const sessionIds = Array.from(new Set((orders ?? []).map((order) => order.session_id)))
  const orderIds = (orders ?? []).map((order) => order.id)

  const [{ data: orderItems, error: orderItemsError }, { data: sessionDetails, error: sessionDetailsError }] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from('order_items')
          .select('order_id, item_name, quantity, line_total_cents')
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
    guest_name: sessionNameById.get(order.session_id) ?? null,
    items: orderItemsByOrderId.get(order.id) ?? []
  }))
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const supabase = createServerSupabaseClient()
  const { data: sessions, error: sessionsError } = await supabase
    .from('table_sessions')
    .select('id, table_id, guest_name, guest_phone, last_active_at')
    .eq('status', 'active')
    .order('last_active_at', { ascending: false })

  if (sessionsError) {
    throw new Error('Could not load active sessions.')
  }

  const activeSessionIds = (sessions ?? []).map((session) => session.id)
  const orders = await fetchOrdersWithItems({
    sessionIds: activeSessionIds
  })
  const activeTableIds = Array.from(new Set((sessions ?? []).map((session) => session.table_id)))
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
  const { data: tables, error: tablesError } = activeTableIds.length
    ? await supabase
        .from('tables')
        .select('id, label')
        .in('id', activeTableIds)
    : { data: [], error: null }

  if (tablesError) {
    throw new Error('Could not load table labels.')
  }

  const openServiceRequests = (serviceRequests ?? []).map((request) => ({
    ...request,
    guest_name: sessionNameById.get(request.session_id) ?? null
  }))
  const tableLabelById = new Map((tables ?? []).map((table) => [table.id, table.label]))
  const requestCountsByTable = new Map<string, number>()
  const paymentRequestTables = new Set<string>()
  const assistanceRequestTables = new Set<string>()

  for (const request of openServiceRequests) {
    requestCountsByTable.set(request.table_id, (requestCountsByTable.get(request.table_id) ?? 0) + 1)

    if (request.request_type === 'payment') {
      paymentRequestTables.add(request.table_id)
    } else if (request.request_type === 'assistance') {
      assistanceRequestTables.add(request.table_id)
    }
  }

  const orderCountsByTable = new Map<string, number>()
  const orderTotalsByTable = new Map<string, number>()
  const unservedOrderTables = new Set<string>()

  for (const order of orders) {
    orderCountsByTable.set(order.table_id, (orderCountsByTable.get(order.table_id) ?? 0) + 1)
    orderTotalsByTable.set(order.table_id, (orderTotalsByTable.get(order.table_id) ?? 0) + order.total_cents)

    if (order.status === 'placed' || order.status === 'preparing') {
      unservedOrderTables.add(order.table_id)
    }
  }

  const tablesSummary: AdminTableSummary[] = (sessions ?? [])
    .map((session) => {
      const lastActiveAt = session.last_active_at

      return {
        tableId: session.table_id,
        tableLabel: tableLabelById.get(session.table_id) ?? `Table ${session.table_id}`,
        guestName: session.guest_name,
        guestPhone: session.guest_phone,
        openOrderCount: orderCountsByTable.get(session.table_id) ?? 0,
        openRequestCount: requestCountsByTable.get(session.table_id) ?? 0,
        runningTotalCents: orderTotalsByTable.get(session.table_id) ?? 0,
        lastActiveAt,
        hasPaymentRequest: paymentRequestTables.has(session.table_id),
        hasAssistanceRequest: assistanceRequestTables.has(session.table_id),
        hasUnservedOrders: unservedOrderTables.has(session.table_id)
      }
    })
    .sort((left, right) => {
      const leftPriority =
        Number(left.openRequestCount > 0) * 100 + Number(left.hasUnservedOrders) * 10
      const rightPriority =
        Number(right.openRequestCount > 0) * 100 + Number(right.hasUnservedOrders) * 10

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority
      }

      return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime()
    })

  return {
    generatedAt: new Date().toISOString(),
    sessions: sessions ?? [],
    orders,
    serviceRequests: openServiceRequests,
    tables: tablesSummary
  }
}

export async function getAdminTableDetailData(tableId: string): Promise<AdminTableDetailData> {
  const supabase = createServerSupabaseClient()
  const [{ data: table, error: tableError }, { data: activeSession, error: sessionError }] = await Promise.all([
    supabase
      .from('tables')
      .select('id, label, is_active')
      .eq('id', tableId)
      .maybeSingle(),
    supabase
      .from('table_sessions')
      .select('id, guest_name, guest_phone, started_at, last_active_at, status')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .maybeSingle()
  ])

  if (tableError || sessionError) {
    throw new Error('Could not load table details.')
  }

  const recentOrders = activeSession
    ? await fetchOrdersWithItems({ sessionId: activeSession.id })
    : []
  const { data: serviceRequests, error: serviceRequestsError } = activeSession
    ? await supabase
        .from('service_requests')
        .select('id, table_id, session_id, request_type, note, status, created_at')
        .eq('session_id', activeSession.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (serviceRequestsError) {
    throw new Error('Could not load service requests.')
  }

  return {
    table,
    activeSession,
    recentOrders,
    serviceRequests: (serviceRequests ?? []).map((request) => ({
      ...request,
      guest_name: activeSession?.guest_name ?? null
    }))
  }
}
