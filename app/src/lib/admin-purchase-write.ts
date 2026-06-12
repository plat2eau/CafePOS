import { apiError } from '@/lib/api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  isPurchasePaymentMethod,
  isPurchasePaymentStatus,
  isPurchaseUnit,
  type PurchasePaymentMethod,
  type PurchasePaymentStatus,
  type PurchaseUnit
} from '@/lib/purchase-options'

type RequestedPurchaseLine = {
  purchaseItemId?: string
  quantity?: number | string
  unit?: string
  unitPriceCents?: number | string | null
}

export type RequestedPurchasePayload = {
  vendorId?: string
  purchaseDate?: string
  invoiceNumber?: string
  paymentStatus?: string
  paymentMethod?: string | null
  notes?: string
  taxCents?: number | string
  discountCents?: number | string
  lines?: RequestedPurchaseLine[]
}

type NormalizedPurchaseLine = {
  id?: string
  purchase_item_id: string
  item_name: string
  quantity: number
  unit: PurchaseUnit
  unit_price_cents: number
  line_total_cents: number
}

type NormalizedPurchasePayload = {
  purchase: {
    vendor_id: string
    purchase_date: string
    invoice_number: string | null
    payment_status: PurchasePaymentStatus
    payment_method: PurchasePaymentMethod | null
    notes: string | null
    subtotal_cents: number
    tax_cents: number
    discount_cents: number
    total_cents: number
  }
  lines: NormalizedPurchaseLine[]
}

type NormalizeResult =
  | {
      ok: true
      payload: NormalizedPurchasePayload
    }
  | {
      ok: false
      response: ReturnType<typeof apiError>
    }

function parseCents(value: number | string | null | undefined, fallback = 0) {
  if (value === null) {
    return null
  }

  if (value === undefined || value === '') {
    return fallback
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function parseQuantity(value: number | string | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  const rounded = Math.round(parsed * 1000) / 1000

  if (rounded <= 0) {
    return null
  }

  return rounded
}

function normalizePurchaseDate(value?: string) {
  const candidate = value?.trim()

  if (!candidate) {
    return new Date().toISOString().slice(0, 10)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null
  }

  const date = new Date(`${candidate}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return candidate
}

export async function normalizeAdminPurchasePayload(
  body: RequestedPurchasePayload | null
): Promise<NormalizeResult> {
  const vendorId = body?.vendorId?.trim() ?? ''

  if (!vendorId) {
    return {
      ok: false,
      response: apiError('Choose a vendor.', 400, { code: 'vendor_required' })
    }
  }

  const purchaseDate = normalizePurchaseDate(body?.purchaseDate)

  if (!purchaseDate) {
    return {
      ok: false,
      response: apiError('Choose a valid purchase date.', 400, { code: 'invalid_purchase_date' })
    }
  }

  const paymentStatus = body?.paymentStatus?.trim() || 'unpaid'

  if (!isPurchasePaymentStatus(paymentStatus)) {
    return {
      ok: false,
      response: apiError('Choose a valid payment status.', 400, { code: 'invalid_payment_status' })
    }
  }

  const rawPaymentMethod = body?.paymentMethod?.trim() || ''
  let paymentMethod: PurchasePaymentMethod | null = null

  if (rawPaymentMethod && !isPurchasePaymentMethod(rawPaymentMethod)) {
    return {
      ok: false,
      response: apiError('Choose a valid payment method.', 400, { code: 'invalid_payment_method' })
    }
  }

  if (rawPaymentMethod) {
    paymentMethod = rawPaymentMethod as PurchasePaymentMethod
  }

  const taxCents = parseCents(body?.taxCents)
  const discountCents = parseCents(body?.discountCents)

  if (taxCents === null || discountCents === null) {
    return {
      ok: false,
      response: apiError('Tax and discount must be valid amounts.', 400, { code: 'invalid_purchase_adjustment' })
    }
  }

  const requestedLines = Array.isArray(body?.lines) ? body.lines : []

  if (requestedLines.length === 0) {
    return {
      ok: false,
      response: apiError('Add at least one purchase line.', 400, { code: 'purchase_lines_required' })
    }
  }

  const supabase = createServerSupabaseClient()
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, is_active')
    .eq('id', vendorId)
    .maybeSingle()

  if (vendorError || !vendor) {
    return {
      ok: false,
      response: apiError('That vendor could not be found.', 404, {
        code: 'vendor_not_found',
        context: 'admin.purchases.normalize.vendor',
        cause: vendorError
      })
    }
  }

  if (!vendor.is_active) {
    return {
      ok: false,
      response: apiError('Choose an active vendor.', 400, { code: 'vendor_inactive' })
    }
  }

  const itemIds = Array.from(
    new Set(
      requestedLines
        .map((line) => String(line?.purchaseItemId ?? '').trim())
        .filter(Boolean)
    )
  )

  if (itemIds.length === 0) {
    return {
      ok: false,
      response: apiError('Choose an item for each purchase line.', 400, { code: 'purchase_item_required' })
    }
  }

  const { data: purchaseItems, error: purchaseItemsError } = await supabase
    .from('purchase_items')
    .select('id, name, is_active')
    .in('id', itemIds)

  if (purchaseItemsError || !purchaseItems) {
    return {
      ok: false,
      response: apiError('Could not validate purchase items.', 500, {
        code: 'purchase_item_validation_failed',
        context: 'admin.purchases.normalize.items',
        cause: purchaseItemsError
      })
    }
  }

  const purchaseItemById = new Map(purchaseItems.map((item) => [item.id, item]))
  const lines: NormalizedPurchaseLine[] = []
  let subtotalCents = 0

  for (const requestedLine of requestedLines) {
    const purchaseItemId = String(requestedLine?.purchaseItemId ?? '').trim()
    const unit = String(requestedLine?.unit ?? '').trim()
    const quantity = parseQuantity(requestedLine?.quantity)
    const unitPriceCents = parseCents(requestedLine?.unitPriceCents)
    const purchaseItem = purchaseItemById.get(purchaseItemId)

    if (!purchaseItemId || !purchaseItem || !purchaseItem.is_active) {
      return {
        ok: false,
        response: apiError('Choose active purchase items only.', 400, { code: 'purchase_item_inactive' })
      }
    }

    if (quantity === null) {
      return {
        ok: false,
        response: apiError('Line quantities must be greater than zero.', 400, { code: 'invalid_purchase_quantity' })
      }
    }

    if (!isPurchaseUnit(unit)) {
      return {
        ok: false,
        response: apiError('Choose a supported unit for each line.', 400, { code: 'invalid_purchase_unit' })
      }
    }

    if (unitPriceCents === null) {
      return {
        ok: false,
        response: apiError('Line prices must be zero or greater.', 400, { code: 'invalid_purchase_price' })
      }
    }

    const lineTotalCents = Math.round(unitPriceCents * quantity)
    subtotalCents += lineTotalCents
    lines.push({
      purchase_item_id: purchaseItem.id,
      item_name: purchaseItem.name,
      quantity,
      unit,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents
    })
  }

  const totalCents = subtotalCents + taxCents - discountCents

  if (totalCents < 0) {
    return {
      ok: false,
      response: apiError('Discount cannot be greater than subtotal plus tax.', 400, { code: 'invalid_purchase_total' })
    }
  }

  return {
    ok: true,
    payload: {
      purchase: {
        vendor_id: vendorId,
        purchase_date: purchaseDate,
        invoice_number: body?.invoiceNumber?.trim() || null,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        notes: body?.notes?.trim() || null,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        discount_cents: discountCents,
        total_cents: totalCents
      },
      lines
    }
  }
}
