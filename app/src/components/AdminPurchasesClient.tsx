'use client'

import { useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import type {
  AdminPurchase,
  AdminPurchaseItem,
  AdminPurchasesData,
  AdminVendor
} from '@/lib/admin-data'
import {
  purchasePaymentMethods,
  purchasePaymentStatuses,
  purchaseUnits,
  type PurchasePaymentMethod,
  type PurchasePaymentStatus,
  type PurchaseUnit
} from '@/lib/purchase-options'
import { Button } from '@/components/ui/button'
import { FlashMessage } from '@/components/ui/flash-message'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { SectionCard } from '@/components/ui/section-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SummaryRow } from '@/components/ui/summary-row'
import { Textarea } from '@/components/ui/textarea'

type FlashState = {
  tone: 'success' | 'error'
  message: string
}

type PurchaseLineDraft = {
  localId: string
  purchaseItemId: string
  quantity: string
  unit: PurchaseUnit
  unitPrice: string
}

type PurchaseDraft = {
  editingPurchaseId: string | null
  vendorId: string
  purchaseDate: string
  invoiceNumber: string
  paymentStatus: PurchasePaymentStatus
  paymentMethod: PurchasePaymentMethod | ''
  notes: string
  tax: string
  discount: string
  lines: PurchaseLineDraft[]
}

type AdminPurchasesClientProps = {
  initialData: AdminPurchasesData
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `purchase-${Math.random().toString(16).slice(2)}-${Date.now()}`
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function centsToInput(priceCents: number) {
  return (priceCents / 100).toFixed(2)
}

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/,/g, '')

  if (!normalized) {
    return 0
  }

  const parsed = Number.parseFloat(normalized)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return Math.round(parsed * 100)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00+05:30`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ')
}

function createBlankLine(defaultUnit: PurchaseUnit = 'pcs'): PurchaseLineDraft {
  return {
    localId: createLocalId(),
    purchaseItemId: '',
    quantity: '1',
    unit: defaultUnit,
    unitPrice: ''
  }
}

function createDraft(vendors: AdminVendor[]): PurchaseDraft {
  return {
    editingPurchaseId: null,
    vendorId: vendors.find((vendor) => vendor.is_active)?.id ?? '',
    purchaseDate: todayDateKey(),
    invoiceNumber: '',
    paymentStatus: 'unpaid',
    paymentMethod: '',
    notes: '',
    tax: '',
    discount: '',
    lines: [createBlankLine()]
  }
}

export default function AdminPurchasesClient({ initialData }: AdminPurchasesClientProps) {
  const [data, setData] = useState(initialData)
  const [draft, setDraft] = useState(() => createDraft(initialData.vendors))
  const [flash, setFlash] = useState<FlashState | null>(null)
  const [isSavingPurchase, setIsSavingPurchase] = useState(false)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [pendingToggleKey, setPendingToggleKey] = useState<string | null>(null)
  const [vendorName, setVendorName] = useState('')
  const [vendorPhone, setVendorPhone] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [itemName, setItemName] = useState('')

  const activeVendors = useMemo(
    () => data.vendors.filter((vendor) => vendor.is_active),
    [data.vendors]
  )
  const activePurchaseItems = useMemo(
    () => data.purchaseItems.filter((item) => item.is_active),
    [data.purchaseItems]
  )
  const draftTotals = useMemo(() => {
    const subtotalCents = draft.lines.reduce((sum, line) => {
      const quantity = Number(line.quantity)
      const unitPriceCents = parsePriceToCents(line.unitPrice)

      if (!Number.isFinite(quantity) || quantity <= 0 || unitPriceCents === null) {
        return sum
      }

      return sum + Math.round(unitPriceCents * quantity)
    }, 0)
    const taxCents = parsePriceToCents(draft.tax)
    const discountCents = parsePriceToCents(draft.discount)

    return {
      subtotalCents,
      taxCents: taxCents ?? 0,
      discountCents: discountCents ?? 0,
      totalCents: Math.max(0, subtotalCents + (taxCents ?? 0) - (discountCents ?? 0))
    }
  }, [draft.discount, draft.lines, draft.tax])

  function resetDraft(nextData = data) {
    setDraft(createDraft(nextData.vendors))
  }

  async function refreshPurchasesData() {
    const result = await apiFetch<AdminPurchasesData>(
      '/api/admin/purchases',
      {
        method: 'GET',
        cache: 'no-store'
      },
      'Could not refresh purchases.'
    )

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return null
    }

    setData(result.data)
    return result.data
  }

  function updateLine(localId: string, updates: Partial<PurchaseLineDraft>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.localId === localId
          ? {
            ...line,
            ...updates
          }
          : line
      )
    }))
  }

  function selectLineItem(localId: string, purchaseItemId: string) {
    updateLine(localId, {
      purchaseItemId
    })
  }

  function addLine() {
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, createBlankLine()]
    }))
  }

  function removeLine(localId: string) {
    setDraft((current) => ({
      ...current,
      lines:
        current.lines.length > 1
          ? current.lines.filter((line) => line.localId !== localId)
          : current.lines
    }))
  }

  function editPurchase(purchase: AdminPurchase) {
    setFlash(null)
    setDraft({
      editingPurchaseId: purchase.id,
      vendorId: purchase.vendor_id,
      purchaseDate: purchase.purchase_date,
      invoiceNumber: purchase.invoice_number ?? '',
      paymentStatus: purchase.payment_status,
      paymentMethod: purchase.payment_method ?? '',
      notes: purchase.notes ?? '',
      tax: purchase.tax_cents ? centsToInput(purchase.tax_cents) : '',
      discount: purchase.discount_cents ? centsToInput(purchase.discount_cents) : '',
      lines:
        purchase.lines.length > 0
          ? purchase.lines.map((line) => ({
            localId: createLocalId(),
            purchaseItemId: line.purchase_item_id,
            quantity: String(line.quantity),
            unit: line.unit,
            unitPrice: centsToInput(line.unit_price_cents)
          }))
          : [createBlankLine()]
    })
  }

  async function handleAddVendor() {
    const name = vendorName.trim()

    if (!name) {
      setFlash({ tone: 'error', message: 'Enter a vendor name.' })
      return
    }

    setIsAddingVendor(true)
    setFlash(null)

    const result = await apiFetch<{ vendor: AdminVendor; message?: string }>(
      '/api/admin/vendors',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: vendorPhone,
          address: vendorAddress
        })
      },
      'Could not add vendor.'
    )

    setIsAddingVendor(false)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    setData((current) => ({
      ...current,
      vendors: [result.data.vendor, ...current.vendors]
    }))
    setDraft((current) => ({
      ...current,
      vendorId: result.data.vendor.id
    }))
    setVendorName('')
    setVendorPhone('')
    setVendorAddress('')
    setFlash({ tone: 'success', message: result.data.message ?? 'Vendor added.' })
  }

  async function handleAddPurchaseItem() {
    const name = itemName.trim()

    if (!name) {
      setFlash({ tone: 'error', message: 'Enter an item name.' })
      return
    }

    setIsAddingItem(true)
    setFlash(null)

    const result = await apiFetch<{ purchaseItem: AdminPurchaseItem; message?: string }>(
      '/api/admin/purchase-items',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name
        })
      },
      'Could not add purchase item.'
    )

    setIsAddingItem(false)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    setData((current) => ({
      ...current,
      purchaseItems: [result.data.purchaseItem, ...current.purchaseItems]
    }))
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line, index) =>
        index === current.lines.length - 1 && !line.purchaseItemId
          ? {
            ...line,
            purchaseItemId: result.data.purchaseItem.id,
            unit: 'pcs'
          }
          : line
      )
    }))
    setItemName('')
    setFlash({ tone: 'success', message: result.data.message ?? 'Purchase item added.' })
  }

  async function toggleVendor(vendor: AdminVendor) {
    const key = `vendor-${vendor.id}`
    setPendingToggleKey(key)
    setFlash(null)

    const result = await apiFetch<{ vendor: AdminVendor; message?: string }>(
      `/api/admin/vendors/${vendor.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !vendor.is_active })
      },
      'Could not update vendor.'
    )

    setPendingToggleKey(null)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    setData((current) => ({
      ...current,
      vendors: current.vendors.map((entry) =>
        entry.id === result.data.vendor.id ? result.data.vendor : entry
      )
    }))
    setFlash({ tone: 'success', message: result.data.message ?? 'Vendor updated.' })
  }

  async function togglePurchaseItem(purchaseItem: AdminPurchaseItem) {
    const key = `item-${purchaseItem.id}`
    setPendingToggleKey(key)
    setFlash(null)

    const result = await apiFetch<{ purchaseItem: AdminPurchaseItem; message?: string }>(
      `/api/admin/purchase-items/${purchaseItem.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !purchaseItem.is_active })
      },
      'Could not update purchase item.'
    )

    setPendingToggleKey(null)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    setData((current) => ({
      ...current,
      purchaseItems: current.purchaseItems.map((entry) =>
        entry.id === result.data.purchaseItem.id ? result.data.purchaseItem : entry
      )
    }))
    setFlash({ tone: 'success', message: result.data.message ?? 'Purchase item updated.' })
  }

  async function handleSavePurchase() {
    setIsSavingPurchase(true)
    setFlash(null)

    const payload = {
      vendorId: draft.vendorId,
      purchaseDate: draft.purchaseDate,
      invoiceNumber: draft.invoiceNumber,
      paymentStatus: draft.paymentStatus,
      paymentMethod: draft.paymentMethod || null,
      notes: draft.notes,
      taxCents: parsePriceToCents(draft.tax),
      discountCents: parsePriceToCents(draft.discount),
      lines: draft.lines.map((line) => ({
        purchaseItemId: line.purchaseItemId,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: parsePriceToCents(line.unitPrice)
      }))
    }
    const isEditing = Boolean(draft.editingPurchaseId)
    const result = await apiFetch<{ purchaseId: string; message?: string }>(
      isEditing ? `/api/admin/purchases/${draft.editingPurchaseId}` : '/api/admin/purchases',
      {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      isEditing ? 'Could not update purchase.' : 'Could not save purchase.'
    )

    setIsSavingPurchase(false)

    if (!result.ok) {
      setFlash({ tone: 'error', message: result.message })
      return
    }

    const refreshedData = await refreshPurchasesData()
    resetDraft(refreshedData ?? data)
    setFlash({ tone: 'success', message: result.data.message ?? 'Purchase saved.' })
  }

  return (
    <div className="stack">
      {flash ? (
        <FlashMessage tone={flash.tone}>
          {flash.message}
        </FlashMessage>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <SectionCard>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Purchase Ledger</p>
              <h2>Recent purchases</h2>
            </div>
            <Button variant="secondary" type="button" onClick={() => resetDraft()}>
              New purchase
            </Button>
          </div>

          <div className="space-y-3">
            {data.purchases.length === 0 ? (
              <p className="finePrint">No purchases recorded yet.</p>
            ) : (
              data.purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{purchase.vendor_name}</h3>
                        <StatusBadge variant={purchase.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {formatStatus(purchase.payment_status)}
                        </StatusBadge>
                      </div>
                      <p className="finePrint">
                        {formatDate(purchase.purchase_date)}
                        {purchase.invoice_number ? ` · Invoice ${purchase.invoice_number}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <strong>{toPrice(purchase.total_cents)}</strong>
                      <Button size="sm" variant="secondary" type="button" onClick={() => editPurchase(purchase)}>
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {purchase.lines.map((line) => (
                      <SummaryRow className="text-sm" key={line.id}>
                        <span>
                          {line.item_name} · {line.quantity} {line.unit}
                        </span>
                        <span>{toPrice(line.line_total_cents)}</span>
                      </SummaryRow>
                    ))}
                    <SummaryRow className="text-sm">
                      <span>Updated</span>
                      <span>{formatDateTime(purchase.updated_at)}</span>
                    </SummaryRow>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <p className="eyebrow">Bill Entry</p>
            <h2>{draft.editingPurchaseId ? 'Edit purchase' : 'New purchase'}</h2>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="formField">
                <label htmlFor="purchase-vendor">Vendor</label>
                <select
                  id="purchase-vendor"
                  value={draft.vendorId}
                  onChange={(event) => setDraft((current) => ({ ...current, vendorId: event.target.value }))}
                >
                  <option value="">Choose vendor</option>
                  {activeVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="formField">
                <label htmlFor="purchase-date">Date</label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={draft.purchaseDate}
                  onChange={(event) => setDraft((current) => ({ ...current, purchaseDate: event.target.value }))}
                />
              </div>
              <div className="formField">
                <label htmlFor="purchase-invoice">Invoice</label>
                <Input
                  id="purchase-invoice"
                  type="text"
                  placeholder="Optional"
                  value={draft.invoiceNumber}
                  onChange={(event) => setDraft((current) => ({ ...current, invoiceNumber: event.target.value }))}
                />
              </div>
              <div className="formField">
                <label htmlFor="purchase-status">Payment status</label>
                <select
                  id="purchase-status"
                  value={draft.paymentStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      paymentStatus: event.target.value as PurchasePaymentStatus
                    }))
                  }
                >
                  {purchasePaymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="formField">
                <label htmlFor="purchase-method">Payment method</label>
                <select
                  id="purchase-method"
                  value={draft.paymentMethod}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      paymentMethod: event.target.value as PurchasePaymentMethod | ''
                    }))
                  }
                >
                  <option value="">Not set</option>
                  {purchasePaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {formatStatus(method)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {draft.lines.map((line, index) => (
                <div
                  key={line.localId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_0.75fr_0.8fr_0.9fr_auto] sm:items-end">
                    <div className="formField">
                      <label htmlFor={`purchase-line-item-${line.localId}`}>Item</label>
                      <select
                        id={`purchase-line-item-${line.localId}`}
                        value={line.purchaseItemId}
                        onChange={(event) => selectLineItem(line.localId, event.target.value)}
                      >
                        <option value="">Choose item</option>
                        {activePurchaseItems.map((purchaseItem) => (
                          <option key={purchaseItem.id} value={purchaseItem.id}>
                            {purchaseItem.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="formField">
                      <label htmlFor={`purchase-line-quantity-${line.localId}`}>Qty</label>
                      <Input
                        id={`purchase-line-quantity-${line.localId}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.001"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.localId, { quantity: event.target.value })}
                      />
                    </div>
                    <div className="formField">
                      <label htmlFor={`purchase-line-unit-${line.localId}`}>Unit</label>
                      <select
                        id={`purchase-line-unit-${line.localId}`}
                        value={line.unit}
                        onChange={(event) => updateLine(line.localId, { unit: event.target.value as PurchaseUnit })}
                      >
                        {purchaseUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="formField">
                      <label htmlFor={`purchase-line-price-${line.localId}`}>Unit price</label>
                      <Input
                        id={`purchase-line-price-${line.localId}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.localId, { unitPrice: event.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={draft.lines.length === 1}
                      onClick={() => removeLine(line.localId)}
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="finePrint mt-2">
                    Line {index + 1}: {toPrice(Math.round((parsePriceToCents(line.unitPrice) ?? 0) * (Number(line.quantity) || 0)))}
                  </p>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => addLine()}>
                Add line
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="formField">
                <label htmlFor="purchase-tax">Tax</label>
                <Input
                  id="purchase-tax"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={draft.tax}
                  onChange={(event) => setDraft((current) => ({ ...current, tax: event.target.value }))}
                />
              </div>
              <div className="formField">
                <label htmlFor="purchase-discount">Discount</label>
                <Input
                  id="purchase-discount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={draft.discount}
                  onChange={(event) => setDraft((current) => ({ ...current, discount: event.target.value }))}
                />
              </div>
            </div>

            <div className="formField">
              <label htmlFor="purchase-notes">Notes</label>
              <Textarea
                id="purchase-notes"
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <SummaryRow>
                <span>Subtotal</span>
                <strong>{toPrice(draftTotals.subtotalCents)}</strong>
              </SummaryRow>
              <SummaryRow>
                <span>Tax</span>
                <span>{toPrice(draftTotals.taxCents)}</span>
              </SummaryRow>
              <SummaryRow>
                <span>Discount</span>
                <span>{toPrice(draftTotals.discountCents)}</span>
              </SummaryRow>
              <SummaryRow variant="total">
                <span>Total</span>
                <strong>{toPrice(draftTotals.totalCents)}</strong>
              </SummaryRow>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {draft.editingPurchaseId ? (
                <Button type="button" variant="secondary" size="form" onClick={() => resetDraft()}>
                  Cancel edit
                </Button>
              ) : null}
              <LoadingButton
                type="button"
                size="form"
                loading={isSavingPurchase}
                loadingLabel="Saving purchase..."
                onClick={() => void handleSavePurchase()}
              >
                {draft.editingPurchaseId ? 'Update purchase' : 'Save purchase'}
              </LoadingButton>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <div className="mb-4">
            <p className="eyebrow">Vendors</p>
            <h2>Vendor management</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_0.75fr]">
            <Input
              type="text"
              placeholder="Vendor name"
              value={vendorName}
              onChange={(event) => setVendorName(event.target.value)}
            />
            <Input
              type="tel"
              placeholder="Phone"
              value={vendorPhone}
              onChange={(event) => setVendorPhone(event.target.value)}
            />
            <Input
              className="sm:col-span-2"
              type="text"
              placeholder="Address"
              value={vendorAddress}
              onChange={(event) => setVendorAddress(event.target.value)}
            />
            <LoadingButton
              className="sm:col-span-2"
              type="button"
              size="form"
              loading={isAddingVendor}
              loadingLabel="Adding vendor..."
              onClick={() => void handleAddVendor()}
            >
              Add vendor
            </LoadingButton>
          </div>

          <div className="mt-4 space-y-2">
            {data.vendors.map((vendor) => (
              <SummaryRow key={vendor.id}>
                <span>
                  {vendor.name}
                  {vendor.phone ? ` · ${vendor.phone}` : ''}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pendingToggleKey === `vendor-${vendor.id}`}
                  onClick={() => void toggleVendor(vendor)}
                >
                  {vendor.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
              </SummaryRow>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <p className="eyebrow">Items</p>
            <h2>Purchase item catalog</h2>
          </div>

          <div className="grid gap-3">
            <Input
              type="text"
              placeholder="Item name"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
            />
            <LoadingButton
              type="button"
              size="form"
              loading={isAddingItem}
              loadingLabel="Adding item..."
              onClick={() => void handleAddPurchaseItem()}
            >
              Add purchase item
            </LoadingButton>
          </div>

          <div className="mt-4 space-y-2">
            {data.purchaseItems.map((purchaseItem) => (
              <SummaryRow key={purchaseItem.id}>
                <span>{purchaseItem.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pendingToggleKey === `item-${purchaseItem.id}`}
                  onClick={() => void togglePurchaseItem(purchaseItem)}
                >
                  {purchaseItem.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
              </SummaryRow>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
