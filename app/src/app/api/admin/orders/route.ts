import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RequestedOrderItem = {
  itemId?: string
  quantity?: number
}

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        tableId?: string
        items?: RequestedOrderItem[]
        note?: string
      }
    | null

  const tableId = body?.tableId?.trim()
  const note = body?.note?.trim() || null
  const requestedItems = Array.isArray(body?.items)
    ? body.items
        .map((item) => ({
          itemId: String(item?.itemId ?? '').trim(),
          quantity: Number(item?.quantity ?? 0)
        }))
        .filter((item) => item.itemId && Number.isInteger(item.quantity) && item.quantity > 0)
    : []

  if (!tableId) {
    return NextResponse.json({ message: 'Choose a table first.' }, { status: 400 })
  }

  if (requestedItems.length === 0) {
    return NextResponse.json({ message: 'Add at least one item to the order.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, is_active')
    .eq('id', tableId)
    .maybeSingle()

  if (tableError || !table) {
    return NextResponse.json({ message: 'That table could not be found.' }, { status: 404 })
  }

  if (!table.is_active) {
    return NextResponse.json({ message: 'That table is inactive right now.' }, { status: 400 })
  }

  const { data: existingActiveSession, error: sessionError } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle()

  if (sessionError) {
    return NextResponse.json({ message: 'Could not load the current table session.' }, { status: 500 })
  }

  let activeSessionId = existingActiveSession?.id ?? null
  let createdSession = false

  if (!activeSessionId) {
    const now = new Date().toISOString()
    const { data: createdSessionData, error: createSessionError } = await supabase
      .from('table_sessions')
      .insert({
        table_id: tableId,
        guest_name: 'Guest',
        guest_phone: null,
        last_active_at: now
      })
      .select('id')
      .single()

    if (createSessionError || !createdSessionData) {
      const createSessionErrorMessage = createSessionError?.message?.toLowerCase() ?? ''

      if (createSessionErrorMessage.includes('guest_phone')) {
        return NextResponse.json(
          {
            message:
              'The database still requires table_sessions.guest_phone. Apply migration 0006_make_guest_phone_nullable.sql and try again.'
          },
          { status: 500 }
        )
      }

      const { data: recoveredSession, error: recoverSessionError } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle()

      if (recoverSessionError || !recoveredSession) {
        return NextResponse.json(
          { message: 'Could not start a guest session for that table.' },
          { status: 500 }
        )
      }

      activeSessionId = recoveredSession.id
    } else {
      activeSessionId = createdSessionData.id
      createdSession = true
    }
  }

  const uniqueItemIds = Array.from(new Set(requestedItems.map((item) => item.itemId)))
  const { data: menuItems, error: menuItemsError } = await supabase
    .from('menu_items')
    .select('id, name, price_cents, is_available')
    .in('id', uniqueItemIds)

  if (menuItemsError || !menuItems) {
    return NextResponse.json(
      { message: 'Could not validate the selected menu items.' },
      { status: 500 }
    )
  }

  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]))
  let totalCents = 0

  try {
    const normalizedOrderItems = requestedItems.map((requestedItem) => {
      const menuItem = menuItemMap.get(requestedItem.itemId)

      if (!menuItem || !menuItem.is_available) {
        throw new Error('Invalid menu item.')
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

    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: activeSessionId,
        table_id: tableId,
        ordered_by_name: 'Admin',
        ordered_by_phone: '',
        note,
        total_cents: totalCents
      })
      .select('id')
      .single()

    if (orderError || !createdOrder) {
      return NextResponse.json({ message: 'Could not create the order.' }, { status: 500 })
    }

    const { error: orderItemsError } = await supabase.from('order_items').insert(
      normalizedOrderItems.map((item) => ({
        order_id: createdOrder.id,
        ...item
      }))
    )

    if (orderItemsError) {
      await supabase.from('orders').delete().eq('id', createdOrder.id)

      return NextResponse.json(
        { message: 'Could not save the order items.' },
        { status: 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { message: 'One or more selected items are unavailable.' },
      { status: 400 }
    )
  }

  await supabase
    .from('table_sessions')
    .update({
      last_active_at: new Date().toISOString()
    })
    .eq('id', activeSessionId)

  revalidatePath(`/table/${tableId}`)
  revalidatePath(`/table/${tableId}/orders`)
  revalidatePath('/admin/sessions')
  revalidatePath(`/admin/sessions/${tableId}`)
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message: createdSession ? 'Admin order created and guest session started.' : 'Admin order created.'
  })
}
