import type { AdminOrder, AdminTableDetailData } from '@/lib/admin-data'

export const cafeReceiptHeader = {
  name: "Cheekoo's Cafe",
  address: 'Tanda, Kangra, HP',
  phone: '8629822304'
} as const

export type ReceiptPayloadItem = {
  name: string
  quantity: number
  lineTotalCents: number
}

export type ReceiptPayloadOrder = {
  id: string
  createdAt: string
  totalCents: number
  note: string | null
  items: ReceiptPayloadItem[]
}

export type ReceiptPayload = {
  generatedAt: string
  guestName: string
  orders: ReceiptPayloadOrder[]
  subtotalCents: number
  discountPercentage: number | null
  discountAmountCents: number | null
  grandTotalCents: number
}

type BuildReceiptPayloadOptions = Pick<AdminTableDetailData, 'activeSession' | 'recentOrders'> & {
  discountPercentage?: number | null
}

type BuildReceiptPayloadForOrdersOptions = {
  guestName: string
  orders: AdminOrder[]
  discountPercentage?: number | null
}

export function toReceiptPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

export function formatReceiptTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}

export function buildReceiptQrValue(payload: ReceiptPayload) {
  const params = new URLSearchParams({
    pa: '9816822303@ptsbi',
    pn: cafeReceiptHeader.name,
    am: (payload.grandTotalCents / 100).toFixed(2),
    cu: 'INR',
    tn: "Cheekoo's Bill"
  })

  return `upi://pay?${params.toString()}`
}

export function buildReceiptPayload({
  activeSession,
  recentOrders,
  discountPercentage
}: BuildReceiptPayloadOptions): ReceiptPayload | null {
  if (!activeSession) {
    return null
  }

  return buildReceiptPayloadForOrders({
    guestName: activeSession.guest_name,
    orders: recentOrders,
    discountPercentage
  })
}

export function buildReceiptPayloadForOrders({
  guestName,
  orders,
  discountPercentage
}: BuildReceiptPayloadForOrdersOptions): ReceiptPayload {
  const normalizedGuestName = guestName.trim() || 'Guest'

  const orderedOrders = [...orders].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  )

  const subtotalCents = orderedOrders.reduce((sum, order) => sum + order.total_cents, 0)
  const normalizedDiscountPercentage =
    typeof discountPercentage === 'number' && Number.isFinite(discountPercentage) && discountPercentage > 0
      ? Math.min(discountPercentage, 100)
      : null
  const discountAmountCents = normalizedDiscountPercentage
    ? Math.round((subtotalCents * normalizedDiscountPercentage) / 100)
    : null

  return {
    generatedAt: new Date().toISOString(),
    guestName: normalizedGuestName,
    orders: orderedOrders.map((order: AdminOrder) => ({
      id: order.id,
      createdAt: order.created_at,
      totalCents: order.total_cents,
      note: order.note,
      items: order.items.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        lineTotalCents: item.line_total_cents
      }))
    })),
    subtotalCents,
    discountPercentage: normalizedDiscountPercentage,
    discountAmountCents,
    grandTotalCents: subtotalCents - (discountAmountCents ?? 0)
  }
}

export function buildBluetoothPrintJson(payload: ReceiptPayload) {
  const separator = '--------------------------------'
  const qrValue = buildReceiptQrValue(payload)
  const lines: Array<Record<string, number | string>> = [
    {
      type: 0,
      content: cafeReceiptHeader.name,
      bold: 1,
      align: 1,
      format: 2
    },
    {
      type: 0,
      content: cafeReceiptHeader.address,
      bold: 0,
      align: 1,
      format: 0
    },
    {
      type: 0,
      content: cafeReceiptHeader.phone,
      bold: 0,
      align: 1,
      format: 0
    },
    {
      type: 0,
      content: separator,
      bold: 0,
      align: 1,
      format: 0
    },
    {
      type: 0,
      content: `Printed ${formatReceiptTimestamp(payload.generatedAt)}`,
      bold: 0,
      align: 1,
      format: 4
    },
    {
      type: 0,
      content: ' ',
      bold: 0,
      align: 0,
      format: 0
    },
    {
      type: 0,
      content: `Guest: ${payload.guestName}`,
      bold: 1,
      align: 0,
      format: 0
    },
    {
      type: 0,
      content: separator,
      bold: 0,
      align: 1,
      format: 0
    }
  ]

  for (const order of payload.orders) {
    lines.push({
      type: 0,
      content: `Order ${order.id.slice(0, 8)}  ${formatReceiptTimestamp(order.createdAt)}`,
      bold: 1,
      align: 0,
      format: 0
    })

    lines.push({
      type: 0,
      content: 'Item            Qty      Price',
      bold: 1,
      align: 0,
      format: 4
    })

    for (const item of order.items) {
      const truncatedName =
        item.name.length > 14 ? `${item.name.slice(0, 13).trimEnd()}.` : item.name

      lines.push({
        type: 0,
        content: `${truncatedName.padEnd(14)}${String(item.quantity).padStart(5)}${toReceiptPrice(item.lineTotalCents).padStart(11)}`,
        bold: 0,
        align: 0,
        format: 0
      })
    }

    if (order.note) {
      lines.push({
        type: 0,
        content: `Note: ${order.note}`,
        bold: 0,
        align: 0,
        format: 0
      })
    }

    lines.push({
      type: 0,
      content: `Order total  ${toReceiptPrice(order.totalCents)}`,
      bold: 1,
      align: 2,
      format: 0
    })

    lines.push({
      type: 0,
      content: separator,
      bold: 0,
      align: 1,
      format: 0
    })
  }

  lines.push(
    {
      type: 0,
      content: separator,
      bold: 0,
      align: 1,
      format: 0
    },
    ...(payload.discountPercentage && payload.discountAmountCents
      ? [
          {
            type: 0,
            content: `Discount (${payload.discountPercentage}%)  -${toReceiptPrice(payload.discountAmountCents)}`,
            bold: 0,
            align: 2,
            format: 0
          } satisfies Record<string, number | string>
        ]
      : []),
    {
      type: 0,
      content: `Grand total  ${toReceiptPrice(payload.grandTotalCents)}`,
      bold: 1,
      align: 2,
      format: 0
    },
    {
      type: 0,
      content: ' ',
      bold: 0,
      align: 0,
      format: 0
    },
    {
      type: 0,
      content: 'Scan this QR code to pay.',
      bold: 0,
      align: 1,
      format: 0
    },
    {
      type: 3,
      value: qrValue,
      size: 30,
      align: 1
    },
    {
      type: 0,
      content: ' ',
      bold: 0,
      align: 0,
      format: 0
    },
    {
      type: 0,
      content: ' ',
      bold: 0,
      align: 0,
      format: 0
    }
  )

  return Object.fromEntries(lines.map((line, index) => [String(index), line]))
}

export function isReceiptPayload(value: unknown): value is ReceiptPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as ReceiptPayload

  return (
    typeof candidate.generatedAt === 'string' &&
    typeof candidate.guestName === 'string' &&
    typeof candidate.subtotalCents === 'number' &&
    typeof candidate.grandTotalCents === 'number' &&
    Array.isArray(candidate.orders)
  )
}
