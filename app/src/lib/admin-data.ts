import type { Database } from '@/lib/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AdminOrderItem = {
  menu_item_id: string | null
  item_name: string
  quantity: number
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
  'id' | 'category_id' | 'name' | 'description' | 'price_cents' | 'sort_order'
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
          .select('order_id, menu_item_id, item_name, quantity, line_total_cents')
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
export async function getAdminMenuItems(): Promise<AdminMenuItem[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, price_cents, sort_order')
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error('Could not load menu items.')
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
