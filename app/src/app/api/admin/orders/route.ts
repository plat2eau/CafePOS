import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createReceiptToken } from '@/lib/receipt-print-server'
import { buildReceiptPayloadForOrders } from '@/lib/receipt-print'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AdminOrder } from '@/lib/admin-data'

type RequestedOrderItem = {
  itemId?: string
  quantity?: number
  portion?: string
}

type RequestedCustomItem = {
  name?: string
  unitPriceCents?: number
  quantity?: number
}

function normalizePhone(value: string) {
  return value.trim()
}

export async function POST(request: Request) {
  const auth = await getAdminAuthContext()

  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        orderType?: 'table' | 'out'
        tableId?: string
        customerName?: string
        customerPhone?: string
        items?: RequestedOrderItem[]
        customItems?: RequestedCustomItem[]
        note?: string
      }
    | null

  const orderType = body?.orderType === 'out' ? 'out' : 'table'
  const tableId = body?.tableId?.trim()
  const customerName = body?.customerName?.trim() ?? ''
  const customerPhone = normalizePhone(body?.customerPhone ?? '')
  const note = body?.note?.trim() || null
  const requestedItems = Array.isArray(body?.items)
    ? body.items
        .map((item) => ({
          itemId: String(item?.itemId ?? '').trim(),
          quantity: Number(item?.quantity ?? 0),
          portion: item?.portion === 'half' || item?.portion === 'full' ? item.portion : null
        }))
        .filter((item) => item.itemId && Number.isInteger(item.quantity) && item.quantity > 0)
    : []
  const requestedCustomItems = Array.isArray(body?.customItems)
    ? body.customItems
        .map((item) => ({
          name: String(item?.name ?? '').trim(),
          unitPriceCents: Number(item?.unitPriceCents ?? 0),
          quantity: Number(item?.quantity ?? 0)
        }))
        .filter(
          (item) =>
            item.name &&
            Number.isInteger(item.unitPriceCents) &&
            item.unitPriceCents > 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        )
    : []

  if (orderType === 'table' && !tableId) {
    return NextResponse.json({ message: 'Choose a table first.' }, { status: 400 })
  }

  if (orderType === 'out' && !customerName) {
    return NextResponse.json({ message: 'Enter a customer name for the out order.' }, { status: 400 })
  }

  if (requestedItems.length === 0 && requestedCustomItems.length === 0) {
    return NextResponse.json({ message: 'Add at least one item to the order.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  let activeSessionId: string | null = null
  let createdSession = false

  if (orderType === 'table') {
    const tableIdForOrder = tableId as string

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('id, is_active')
      .eq('id', tableIdForOrder)
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
      .eq('table_id', tableIdForOrder)
      .eq('status', 'active')
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json(
        { message: 'Could not load the current table session.' },
        { status: 500 }
      )
    }

    activeSessionId = existingActiveSession?.id ?? null

    if (!activeSessionId) {
      const now = new Date().toISOString()
      const { data: createdSessionData, error: createSessionError } = await supabase
        .from('table_sessions')
        .insert({
          table_id: tableIdForOrder,
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
          .eq('table_id', tableIdForOrder)
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
  }

  let totalCents = 0

  try {
    const normalizedOrderItems: Array<{
      menu_item_id: string | null
      item_name: string
      unit_price_cents: number
      quantity: number
      line_total_cents: number
      portion: 'half' | 'full' | null
    }> = []

    const uniqueItemIds = Array.from(new Set(requestedItems.map((item) => item.itemId)))
    const menuItemMap = new Map<
      string,
      {
        id: string
        name: string
        price_cents: number
        half_price_cents: number | null
        full_price_cents: number | null
        is_available: boolean
      }
    >()

    if (uniqueItemIds.length > 0) {
      const { data: menuItems, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('id, name, price_cents, half_price_cents, full_price_cents, is_available')
        .in('id', uniqueItemIds)

      if (menuItemsError || !menuItems) {
        return NextResponse.json(
          { message: 'Could not validate the selected menu items.' },
          { status: 500 }
        )
      }

      for (const item of menuItems) {
        menuItemMap.set(item.id, item)
      }
    }

    for (const requestedItem of requestedItems) {
      const menuItem = menuItemMap.get(requestedItem.itemId)

      if (!menuItem || !menuItem.is_available) {
        throw new Error('Invalid menu item.')
      }

      const portionEnabled = (menuItem.half_price_cents ?? 0) > 0 && (menuItem.full_price_cents ?? 0) > 0
      let portion = requestedItem.portion as 'half' | 'full' | null

      if (portion && !portionEnabled) {
        throw new Error('Invalid portion selection.')
      }

      if (!portion && portionEnabled) {
        portion = 'full'
      }

      const unitPriceCents =
        portion === 'half'
          ? menuItem.half_price_cents
          : portion === 'full'
            ? menuItem.full_price_cents
            : menuItem.price_cents

      if (typeof unitPriceCents !== 'number' || !Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
        throw new Error('Invalid menu item price.')
      }

      const lineTotalCents = unitPriceCents * requestedItem.quantity
      totalCents += lineTotalCents

      normalizedOrderItems.push({
        menu_item_id: menuItem.id,
        portion,
        item_name: portion ? `${menuItem.name} (${portion === 'half' ? 'Half' : 'Full'})` : menuItem.name,
        unit_price_cents: unitPriceCents,
        quantity: requestedItem.quantity,
        line_total_cents: lineTotalCents
      })
    }

    for (const customItem of requestedCustomItems) {
      const lineTotalCents = customItem.unitPriceCents * customItem.quantity
      totalCents += lineTotalCents

      normalizedOrderItems.push({
        menu_item_id: null,
        portion: null,
        item_name: customItem.name,
        unit_price_cents: customItem.unitPriceCents,
        quantity: customItem.quantity,
        line_total_cents: lineTotalCents
      })
    }

    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: orderType === 'table' ? activeSessionId : null,
        table_id: orderType === 'table' ? tableId : null,
        ordered_by_name: orderType === 'table' ? 'Admin' : customerName,
        ordered_by_phone: orderType === 'table' ? '' : customerPhone,
        note,
        total_cents: totalCents
      })
      .select(
        'id, table_id, created_at, status, note, total_cents, session_id, ordered_by_name, ordered_by_phone'
      )
      .single()

    if (orderError || !createdOrder) {
      const orderErrorMessage = orderError?.message?.toLowerCase() ?? ''

      if (
        orderType === 'out' &&
        (orderErrorMessage.includes('table_id') || orderErrorMessage.includes('session_id'))
      ) {
        return NextResponse.json(
          {
            message:
              'The database still requires orders.table_id and orders.session_id. Apply migration 0007_make_orders_table_optional.sql and try again.'
          },
          { status: 500 }
        )
      }

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

    if (orderType === 'out') {
      const receiptPayload = buildReceiptPayloadForOrders({
        guestName: customerName,
        orders: [
          {
            ...(createdOrder as Omit<AdminOrder, 'items' | 'guest_name'>),
            guest_name: null,
            items: normalizedOrderItems.map((item) => ({
              menu_item_id: item.menu_item_id,
              item_name: item.item_name,
              quantity: item.quantity,
              line_total_cents: item.line_total_cents
            }))
          }
        ]
      })

      const token = createReceiptToken(receiptPayload)
      const receiptUrl = new URL('/print/receipt', request.url)
      receiptUrl.searchParams.set('token', token)

      revalidatePath('/admin/sessions')
      revalidatePath('/api/admin/overview')

      return NextResponse.json({
        ok: true,
        message: 'Out order created.',
        receiptUrl: receiptUrl.toString()
      })
    }
  } catch {
    return NextResponse.json(
      { message: 'One or more selected items are unavailable.' },
      { status: 400 }
    )
  }

  if (orderType === 'table' && activeSessionId && tableId) {
    await supabase
      .from('table_sessions')
      .update({
        last_active_at: new Date().toISOString()
      })
      .eq('id', activeSessionId)

    revalidatePath(`/table/${tableId}`)
    revalidatePath(`/table/${tableId}/orders`)
    revalidatePath(`/admin/sessions/${tableId}`)
  }

  revalidatePath('/admin/sessions')
  revalidatePath('/api/admin/overview')

  return NextResponse.json({
    ok: true,
    message:
      createdSession
          ? 'Admin order created and guest session started.'
          : 'Admin order created.'
  })
}
