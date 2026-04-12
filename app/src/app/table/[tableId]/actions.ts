'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getTableOrderIdentityCookieName,
  getTableSessionCookieName,
  parseTableOrderIdentityCookie,
  serializeTableOrderIdentityCookie,
  type TableOrderIdentity
} from '@/lib/table-session'

export type GuestSessionActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
}

export type PlaceOrderActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
}

export type ServiceRequestActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function normalizePin(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}

function generateSessionPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

function getValidatedOrderIdentity(name: string, phone: string): TableOrderIdentity | null {
  const normalizedName = name.trim()
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedName || !/^\d{10}$/.test(normalizedPhone)) {
    return null
  }

  return {
    name: normalizedName,
    phone: normalizedPhone
  }
}

async function setTableOrderIdentityCookie(tableId: string, identity: TableOrderIdentity) {
  const cookieStore = await cookies()
  cookieStore.set(
    getTableOrderIdentityCookieName(tableId),
    serializeTableOrderIdentityCookie(identity),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8
    }
  )
}

function normalizeOrderItems(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as Array<{ itemId?: string; quantity?: number }>

    return parsed
      .map((entry) => ({
        itemId: String(entry.itemId ?? '').trim(),
        quantity: Number(entry.quantity ?? 0)
      }))
      .filter((entry) => entry.itemId && Number.isInteger(entry.quantity) && entry.quantity > 0)
  } catch {
    return []
  }
}

export async function createOrRefreshTableSession(
  tableId: string,
  _prevState: GuestSessionActionState,
  formData: FormData
): Promise<GuestSessionActionState> {
  const name = String(formData.get('name') ?? '').trim()
  const phone = normalizePhone(String(formData.get('phone') ?? ''))
  const providedPin = normalizePin(String(formData.get('pin') ?? ''))
  const orderIdentity = getValidatedOrderIdentity(name, phone)

  if (!orderIdentity) {
    return {
      status: 'error',
      message: 'Please enter a valid name and 10-digit phone number.'
    }
  }

  const supabase = createServerSupabaseClient()
  const cookieStore = await cookies()
  const currentSessionId = cookieStore.get(getTableSessionCookieName(tableId))?.value

  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, is_active')
    .eq('id', tableId)
    .maybeSingle()

  if (tableError || !table) {
    return {
      status: 'error',
      message: 'This table does not exist in the database yet.'
    }
  }

  if (!table.is_active) {
    return {
      status: 'error',
      message: 'This table is inactive right now.'
    }
  }

  const { data: existingSession, error: existingSessionError } = await supabase
    .from('table_sessions')
    .select('id, session_pin')
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle()

  if (existingSessionError) {
    return {
      status: 'error',
      message: 'Could not check the current session for this table.'
    }
  }

  const now = new Date().toISOString()
  const isCurrentGuestSession = existingSession?.id === currentSessionId

  if (existingSession && !isCurrentGuestSession) {
    if (!/^\d{4}$/.test(providedPin)) {
      return {
        status: 'error',
        message: 'Enter the 4-digit session PIN to open this table.'
      }
    }

    if (providedPin !== existingSession.session_pin) {
      return {
        status: 'error',
        message: 'That PIN is incorrect for this table.'
      }
    }
  }

  const sessionMutation = existingSession
    ? isCurrentGuestSession
      ? await supabase
          .from('table_sessions')
          .update({
            guest_name: orderIdentity.name,
            guest_phone: orderIdentity.phone,
            last_active_at: now
          })
          .eq('id', existingSession.id)
          .select('id')
          .single()
      : await supabase
          .from('table_sessions')
          .update({
            last_active_at: now
          })
          .eq('id', existingSession.id)
          .select('id')
          .single()
    : await supabase
        .from('table_sessions')
        .insert({
          table_id: tableId,
          guest_name: orderIdentity.name,
          guest_phone: orderIdentity.phone,
          session_pin: generateSessionPin(),
          last_active_at: now
        })
        .select('id')
        .single()

  if (sessionMutation.error || !sessionMutation.data) {
    return {
      status: 'error',
      message: 'Could not save the guest session. Please try again.'
    }
  }

  cookieStore.set(getTableSessionCookieName(tableId), sessionMutation.data.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  })
  await setTableOrderIdentityCookie(tableId, orderIdentity)

  revalidatePath(`/table/${tableId}`)
  revalidatePath(`/table/${tableId}/orders`)
  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)

  return {
    status: 'success',
    message: existingSession
      ? isCurrentGuestSession
        ? 'Your table session was refreshed.'
        : 'PIN verified. This table session is now open on this device.'
      : 'Your table session has started.'
  }
}

export async function placeOrderForTable(
  tableId: string,
  _prevState: PlaceOrderActionState,
  formData: FormData
): Promise<PlaceOrderActionState> {
  const rawItems = String(formData.get('items') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  const requestedItems = normalizeOrderItems(rawItems)

  if (requestedItems.length === 0) {
    return {
      status: 'error',
      message: 'Add at least one item to place an order.'
    }
  }

  const supabase = createServerSupabaseClient()
  const cookieStore = await cookies()
  const currentSessionId = cookieStore.get(getTableSessionCookieName(tableId))?.value
  const storedIdentity = parseTableOrderIdentityCookie(
    cookieStore.get(getTableOrderIdentityCookieName(tableId))?.value
  )

  if (!currentSessionId) {
    return {
      status: 'error',
      message: 'Start your table session before placing an order.'
    }
  }

  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .select('id, table_id, status, guest_name, guest_phone')
    .eq('id', currentSessionId)
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle()

  if (sessionError || !session) {
    return {
      status: 'error',
      message: 'Your session is no longer active. Please refresh your session and try again.'
    }
  }

  const orderIdentity =
    storedIdentity ?? getValidatedOrderIdentity(session.guest_name, session.guest_phone)

  if (!orderIdentity) {
    return {
      status: 'error',
      message: 'Your order identity is missing. Reopen the table and try again.'
    }
  }

  if (!storedIdentity) {
    await setTableOrderIdentityCookie(tableId, orderIdentity)
  }

  const uniqueItemIds = Array.from(new Set(requestedItems.map((item) => item.itemId)))
  const { data: menuItems, error: menuItemsError } = await supabase
    .from('menu_items')
    .select('id, name, price_cents, is_available')
    .in('id', uniqueItemIds)

  if (menuItemsError || !menuItems) {
    return {
      status: 'error',
      message: 'Could not validate the selected menu items.'
    }
  }

  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]))
  let totalCents = 0

  const normalizedOrderItems = requestedItems.map((requestedItem) => {
    const menuItem = menuItemMap.get(requestedItem.itemId)

    if (!menuItem || !menuItem.is_available) {
      throw new Error(`Invalid or unavailable item: ${requestedItem.itemId}`)
    }

    const lineTotalCents = menuItem.price_cents * requestedItem.quantity
    totalCents += lineTotalCents

    return {
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      unit_price_cents: menuItem.price_cents,
      quantity: requestedItem.quantity,
      line_total_cents: lineTotalCents
    }
  })

  if (normalizedOrderItems.length === 0) {
    return {
      status: 'error',
      message: 'Add at least one valid item to place an order.'
    }
  }

  const { data: createdOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      session_id: session.id,
      table_id: tableId,
      ordered_by_name: orderIdentity.name,
      ordered_by_phone: orderIdentity.phone,
      note: note || null,
      total_cents: totalCents
    })
    .select('id')
    .single()

  if (orderError || !createdOrder) {
    return {
      status: 'error',
      message: 'Could not create the order. Please try again.'
    }
  }

  const { error: orderItemsError } = await supabase
    .from('order_items')
    .insert(
      normalizedOrderItems.map((item) => ({
        order_id: createdOrder.id,
        ...item
      }))
    )

  if (orderItemsError) {
    await supabase.from('orders').delete().eq('id', createdOrder.id)

    return {
      status: 'error',
      message: 'Could not save the order items. Please try again.'
    }
  }

  await supabase
    .from('table_sessions')
    .update({
      last_active_at: new Date().toISOString()
    })
    .eq('id', session.id)

  revalidatePath(`/table/${tableId}`)
  revalidatePath(`/table/${tableId}/orders`)
  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)

  return {
    status: 'success',
    message: 'Order placed successfully.'
  }
}

export async function createServiceRequestForTable(
  tableId: string,
  _prevState: ServiceRequestActionState,
  formData: FormData
): Promise<ServiceRequestActionState> {
  const requestType = String(formData.get('requestType') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (requestType !== 'payment' && requestType !== 'assistance') {
    return {
      status: 'error',
      message: 'Choose what you need help with first.'
    }
  }

  const supabase = createServerSupabaseClient()
  const cookieStore = await cookies()
  const currentSessionId = cookieStore.get(getTableSessionCookieName(tableId))?.value

  if (!currentSessionId) {
    return {
      status: 'error',
      message: 'Start your table session before requesting help.'
    }
  }

  const { data: session, error: sessionError } = await supabase
    .from('table_sessions')
    .select('id, table_id, status')
    .eq('id', currentSessionId)
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle()

  if (sessionError || !session) {
    return {
      status: 'error',
      message: 'Your session is no longer active. Please refresh and try again.'
    }
  }

  const { error: requestError } = await supabase
    .from('service_requests')
    .insert({
      session_id: session.id,
      table_id: tableId,
      request_type: requestType,
      note: note || null
    })

  if (requestError) {
    return {
      status: 'error',
      message: 'Could not notify the staff right now. Please try again.'
    }
  }

  await supabase
    .from('table_sessions')
    .update({
      last_active_at: new Date().toISOString()
    })
    .eq('id', session.id)

  revalidatePath(`/table/${tableId}`)
  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)

  return {
    status: 'success',
    message:
      requestType === 'payment'
        ? 'The staff has been called for payment.'
        : 'The staff has been notified that you need assistance.'
  }
}
