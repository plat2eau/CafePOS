'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyStateCard, MetricCard, OrderCard, ServiceRequestCard } from '@/components/AppCards'
import SearchBar from '@/components/SearchBar'
import { ActionGroup } from '@/components/ui/action-group'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { FlashMessage } from '@/components/ui/flash-message'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { SectionCard } from '@/components/ui/section-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SummaryRow } from '@/components/ui/summary-row'
import { Textarea } from '@/components/ui/textarea'
import { searchMenuItems } from '@/lib/menu-search'
import { buildReceiptPayloadForOrders } from '@/lib/receipt-print'
import type {
  AdminMenuCategory,
  AdminMenuItem,
  AdminOrder,
  AdminOverviewData,
  AdminTableOption
} from '@/lib/admin-data'
import type { Database } from '@/lib/database.types'

type AdminConsoleProps = {
  initialData: AdminOverviewData
  menuCategories: AdminMenuCategory[]
  menuItems: AdminMenuItem[]
  tables: AdminTableOption[]
}

type FlashState = {
  tone: 'success' | 'error'
  message: string
}

type OrderType = 'table' | 'out'
type OrderStatus = Database['public']['Tables']['orders']['Row']['status']
type OrderItemMutationAction = 'decrement' | 'remove'

const orderStatuses: OrderStatus[] = ['placed', 'preparing', 'served', 'cancelled']

type Portion = 'half' | 'full'

type CustomOrderItemDraft = {
  id: string
  name: string
  unitPriceCents: number
  quantity: number
}

type RemoveOrderItemTarget = {
  orderId: string
  itemId: string
  itemName: string
  cancelsOrder: boolean
}

function buildQuantityKey(itemId: string, portion?: Portion | null) {
  return portion ? `${itemId}::${portion}` : itemId
}

function isPortionEnabled(item: Pick<AdminMenuItem, 'half_price_cents' | 'full_price_cents'>) {
  return (item.half_price_cents ?? 0) > 0 && (item.full_price_cents ?? 0) > 0
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized) return null

  const numberValue = Number.parseFloat(normalized)
  if (!Number.isFinite(numberValue) || numberValue < 0) return null

  return Math.round(numberValue * 100)
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `custom-${Math.random().toString(16).slice(2)}-${Date.now()}`
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))
}

function formatOrderIdentity(name: string, phone: string | null) {
  return phone?.trim() ? `${name} (${phone})` : name
}

async function fetchOverviewData() {
  const response = await fetch('/api/admin/overview', {
    method: 'GET',
    cache: 'no-store'
  }).catch(() => null)

  if (!response?.ok) {
    return null
  }

  return (await response.json()) as AdminOverviewData
}

export default function AdminConsole({
  initialData,
  menuCategories,
  menuItems,
  tables
}: AdminConsoleProps) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [flash, setFlash] = useState<FlashState | null>(null)
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)
  const [isAddOrderDialogOpen, setIsAddOrderDialogOpen] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>(tables.length > 0 ? 'table' : 'out')
  const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id ?? '')
  const [customerName, setCustomerName] = useState('Guest')
  const [customerPhone, setCustomerPhone] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [note, setNote] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [customItems, setCustomItems] = useState<CustomOrderItemDraft[]>([])
  const [customItemName, setCustomItemName] = useState('')
  const [customItemPrice, setCustomItemPrice] = useState('')
  const [pendingStatusKey, setPendingStatusKey] = useState<string | null>(null)
  const [clearTargetTableId, setClearTargetTableId] = useState<string | null>(null)
  const [isClearingTable, setIsClearingTable] = useState(false)
  const [isOpeningReceipt, setIsOpeningReceipt] = useState(false)
  const [discountPercentage, setDiscountPercentage] = useState('')
  const [pendingReceiptOrderId, setPendingReceiptOrderId] = useState<string | null>(null)
  const [pendingCloseOutOrderId, setPendingCloseOutOrderId] = useState<string | null>(null)
  const [pendingOrderItemIds, setPendingOrderItemIds] = useState<string[]>([])
  const [removeOrderItemTarget, setRemoveOrderItemTarget] = useState<RemoveOrderItemTarget | null>(null)
  const adminMenuResultsRef = useRef<HTMLDivElement | null>(null)
  const adminNavigatorInnerRef = useRef<HTMLDivElement | null>(null)
  const lastNavigatorScrollIdRef = useRef<string | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase()
  const categoryNameById = useMemo(
    () => new Map(menuCategories.map((category) => [category.id, category.name])),
    [menuCategories]
  )

  useEffect(() => {
    let cancelled = false

    async function refreshOverview() {
      const nextData = await fetchOverviewData()

      if (!nextData || cancelled) {
        return
      }

      setData(nextData)
    }

    const interval = window.setInterval(refreshOverview, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    setOrderType((current) => (current === 'table' && tables.length === 0 ? 'out' : current))
    setSelectedTableId((current) =>
      tables.some((table) => table.id === current)
        ? current
        : tables[0]?.id ?? ''
    )
  }, [tables])

  useEffect(() => {
    if (expandedTableId && !data.sessions.some((session) => session.table_id === expandedTableId)) {
      setExpandedTableId(null)
    }

    if (clearTargetTableId && !data.sessions.some((session) => session.table_id === clearTargetTableId)) {
      setClearTargetTableId(null)
      setDiscountPercentage('')
    }
  }, [clearTargetTableId, data.sessions, expandedTableId])

  const ordersByTable = useMemo(() => {
    const map = new Map<string, AdminOrder[]>()

    for (const order of data.orders) {
      if (!order.table_id) {
        continue
      }

      const list = map.get(order.table_id)
      if (list) {
        list.push(order)
      } else {
        map.set(order.table_id, [order])
      }
    }

    return map
  }, [data.orders])

  const serviceRequestsByTable = useMemo(() => {
    const map = new Map<string, AdminOverviewData['serviceRequests']>()

    for (const request of data.serviceRequests) {
      const list = map.get(request.table_id)
      if (list) {
        list.push(request)
      } else {
        map.set(request.table_id, [request])
      }
    }

    return map
  }, [data.serviceRequests])

  const tableLabelById = useMemo(
    () => new Map(tables.map((table) => [table.id, table.label])),
    [tables]
  )

  const filteredMenuItems = useMemo(() => {
    return searchMenuItems(menuItems, deferredSearchQuery, categoryNameById)
  }, [categoryNameById, deferredSearchQuery, menuItems])

  const filteredMenuCategoryIds = useMemo(
    () => new Set(filteredMenuItems.map((item) => item.category_id)),
    [filteredMenuItems]
  )

  const menuCategorySections = useMemo(
    () =>
      menuCategories
        .filter((category) => filteredMenuCategoryIds.has(category.id))
        .map((category) => ({
          ...category,
          anchorId: `admin-menu-category-${category.id}`
        })),
    [filteredMenuCategoryIds, menuCategories]
  )

  const filteredMenuItemsByCategory = useMemo(() => {
    const map = new Map<string, AdminMenuItem[]>(
      menuCategorySections.map((category) => [category.id, []])
    )

    for (const item of filteredMenuItems) {
      const list = map.get(item.category_id)
      if (list) {
        list.push(item)
      } else {
        map.set(item.category_id, [item])
      }
    }

    return map
  }, [filteredMenuItems, menuCategorySections])

  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState(menuCategorySections[0]?.id ?? '')

  const selectedItems = useMemo(
    () =>
      menuItems.flatMap((item) => {
        if (!isPortionEnabled(item)) {
          const quantity = quantities[buildQuantityKey(item.id)] ?? 0
          return quantity > 0
            ? [
                {
                  key: buildQuantityKey(item.id),
                  itemId: item.id,
                  portion: null as Portion | null,
                  name: item.name,
                  unitPriceCents: item.price_cents,
                  quantity
                }
              ]
            : []
        }

        const halfQuantity = quantities[buildQuantityKey(item.id, 'half')] ?? 0
        const fullQuantity = quantities[buildQuantityKey(item.id, 'full')] ?? 0
        const result: Array<{
          key: string
          itemId: string
          portion: Portion | null
          name: string
          unitPriceCents: number
          quantity: number
        }> = []

        if (halfQuantity > 0) {
          result.push({
            key: buildQuantityKey(item.id, 'half'),
            itemId: item.id,
            portion: 'half',
            name: `${item.name} (Half)`,
            unitPriceCents: item.half_price_cents ?? 0,
            quantity: halfQuantity
          })
        }

        if (fullQuantity > 0) {
          result.push({
            key: buildQuantityKey(item.id, 'full'),
            itemId: item.id,
            portion: 'full',
            name: `${item.name} (Full)`,
            unitPriceCents: item.full_price_cents ?? 0,
            quantity: fullQuantity
          })
        }

        return result
      }),
    [menuItems, quantities]
  )

  const normalizedCustomItems = useMemo(
    () =>
      customItems
        .map((item) => ({
          ...item,
          name: item.name.trim()
        }))
        .filter(
          (item) =>
            item.name &&
            Number.isInteger(item.unitPriceCents) &&
            item.unitPriceCents > 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        ),
    [customItems]
  )

  const totalCents = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) +
      normalizedCustomItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    [normalizedCustomItems, selectedItems]
  )

  const hasAnyOrderItems = selectedItems.length > 0 || normalizedCustomItems.length > 0

  const selectedSession = data.sessions.find((session) => session.table_id === selectedTableId) ?? null
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null
  const clearTargetSession =
    data.sessions.find((session) => session.table_id === clearTargetTableId) ?? null
  const clearTargetOrders = clearTargetTableId ? ordersByTable.get(clearTargetTableId) ?? [] : []
  const searchSummary = normalizedSearchQuery
    ? `${filteredMenuItems.length} matching item${filteredMenuItems.length === 1 ? '' : 's'}`
    : `${menuItems.length} item${menuItems.length === 1 ? '' : 's'} available`
  const isRemovingOrderItem = removeOrderItemTarget
    ? pendingOrderItemIds.includes(removeOrderItemTarget.itemId)
    : false

  useEffect(() => {
    if (!menuCategorySections.length) {
      setActiveMenuCategoryId('')
      return
    }

    setActiveMenuCategoryId((current) =>
      menuCategorySections.some((category) => category.id === current)
        ? current
        : menuCategorySections[0].id
    )
  }, [menuCategorySections])

  useEffect(() => {
    if (!isAddOrderDialogOpen) {
      lastNavigatorScrollIdRef.current = null
      return
    }

    const container = adminMenuResultsRef.current
    if (!container || menuCategorySections.length < 2) {
      return
    }

    let rafId: number | null = null

    const updateActiveCategory = () => {
      rafId = null

      const containerTop = container.getBoundingClientRect().top
      let bestId: string | null = null
      let bestTop = Number.NEGATIVE_INFINITY
      let closestPositiveId: string | null = null
      let closestPositiveTop = Number.POSITIVE_INFINITY

      for (const category of menuCategorySections) {
        const element = document.getElementById(category.anchorId)
        if (!(element instanceof HTMLElement)) {
          continue
        }

        const top = element.getBoundingClientRect().top - containerTop

        if (top <= 16 && top > bestTop) {
          bestTop = top
          bestId = category.id
        } else if (top > 16 && top < closestPositiveTop) {
          closestPositiveTop = top
          closestPositiveId = category.id
        }
      }

      const nextId = bestId ?? closestPositiveId ?? menuCategorySections[0]?.id ?? ''
      if (nextId && nextId !== activeMenuCategoryId) {
        setActiveMenuCategoryId(nextId)
      }
    }

    const handleScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(updateActiveCategory)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [activeMenuCategoryId, isAddOrderDialogOpen, menuCategorySections])

  useEffect(() => {
    if (!isAddOrderDialogOpen) return
    if (menuCategorySections.length < 2) return
    if (!activeMenuCategoryId) return

    const container = adminNavigatorInnerRef.current
    if (!container) return

    if (lastNavigatorScrollIdRef.current === activeMenuCategoryId) return

    const pill = container.querySelector(
      `[data-category-id="${activeMenuCategoryId}"]`
    ) as HTMLElement | null
    if (!pill) return

    lastNavigatorScrollIdRef.current = activeMenuCategoryId
    pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeMenuCategoryId, isAddOrderDialogOpen, menuCategorySections.length])

  function adjustQuantity(itemId: string, delta: number, portion?: Portion | null) {
    setQuantities((current) => {
      const key = buildQuantityKey(itemId, portion ?? null)
      const nextQuantity = Math.max(0, (current[key] ?? 0) + delta)

      if (nextQuantity === 0) {
        const { [key]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [key]: nextQuantity
      }
    })
  }

  function resetOrderComposer() {
    setOrderType(tables.length > 0 ? 'table' : 'out')
    setSearchQuery('')
    setNote('')
    setCustomerName('Guest')
    setCustomerPhone('')
    setQuantities({})
    setCustomItems([])
    setCustomItemName('')
    setCustomItemPrice('')
    setSelectedTableId((current) =>
      tables.some((table) => table.id === current)
        ? current
        : tables[0]?.id ?? ''
    )
  }

  function handleAddCustomItem() {
    const name = customItemName.trim()
    const unitPriceCents = parsePriceToCents(customItemPrice)

    if (!name) {
      setFlash({ tone: 'error', message: 'Enter a custom item name.' })
      return
    }

    if (unitPriceCents === null || unitPriceCents <= 0) {
      setFlash({ tone: 'error', message: 'Enter a valid custom item price.' })
      return
    }

    setCustomItems((current) => [
      ...current,
      {
        id: createLocalId(),
        name,
        unitPriceCents,
        quantity: 1
      }
    ])
    setCustomItemName('')
    setCustomItemPrice('')
  }

  function adjustCustomItemQuantity(customItemId: string, delta: number) {
    setCustomItems((current) => {
      const next = current
        .map((item) =>
          item.id === customItemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)

      return next
    })
  }

  async function refreshAdminOverviewState() {
    const nextData = await fetchOverviewData()

    if (nextData) {
      setData(nextData)
      return
    }

    router.refresh()
  }

  function setOrderItemPending(itemId: string, isPending: boolean) {
    setPendingOrderItemIds((current) => {
      if (isPending) {
        return current.includes(itemId) ? current : [...current, itemId]
      }

      return current.filter((currentItemId) => currentItemId !== itemId)
    })
  }

  async function handleCreateAdminOrder() {
    if (orderType === 'table' && !selectedTableId) {
      setFlash({
        tone: 'error',
        message: 'Choose a table before creating the order.'
      })
      return
    }

    if (orderType === 'out' && !customerName.trim()) {
      setFlash({
        tone: 'error',
        message: 'Enter a customer name for the out order.'
      })
      return
    }

    if (!hasAnyOrderItems) {
      setFlash({
        tone: 'error',
        message: 'Add at least one item to the order.'
      })
      return
    }

    setFlash(null)
    setIsSubmittingOrder(true)

    const response = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderType,
        tableId: orderType === 'table' ? selectedTableId : undefined,
        customerName: orderType === 'out' ? customerName : undefined,
        customerPhone: orderType === 'out' ? customerPhone : undefined,
        note,
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          portion: item.portion ?? undefined
        })),
        customItems: normalizedCustomItems.map((item) => ({
          name: item.name,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity
        }))
      })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not create the admin order right now.'
      })
      setIsSubmittingOrder(false)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; receiptUrl?: string }
      | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not create the admin order.'
      })
      setIsSubmittingOrder(false)
      return
    }

    await refreshAdminOverviewState()
    resetOrderComposer()

    setIsAddOrderDialogOpen(false)
    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Admin order created.'
    })
    setIsSubmittingOrder(false)

    if (orderType === 'out' && payload?.receiptUrl) {
      router.push(payload.receiptUrl)
    }
  }

  async function handleOpenOutOrderReceipt(orderId: string) {
    setPendingReceiptOrderId(orderId)

    const response = await fetch(`/api/admin/orders/${orderId}/receipt-token`, {
      method: 'POST'
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not open the receipt right now.'
      })
      setPendingReceiptOrderId(null)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; receiptUrl?: string }
      | null

    if (!response.ok || !payload?.receiptUrl) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not open the receipt right now.'
      })
      setPendingReceiptOrderId(null)
      return
    }

    setPendingReceiptOrderId(null)
    router.push(payload.receiptUrl)
  }

  async function handleCloseOutOutOrder(orderId: string) {
    setFlash(null)
    setPendingCloseOutOrderId(orderId)

    const response = await fetch(`/api/admin/orders/${orderId}/close-out`, {
      method: 'POST'
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not close out the order right now.'
      })
      setPendingCloseOutOrderId(null)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not close out the order.'
      })
      setPendingCloseOutOrderId(null)
      return
    }

    const nextData = await fetchOverviewData()
    if (nextData) {
      setData(nextData)
    }

    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Order closed out.'
    })
    setPendingCloseOutOrderId(null)
  }

  async function handleOrderStatusChange(
    tableId: string,
    orderId: string,
    nextStatus: OrderStatus
  ) {
    setFlash(null)
    setPendingStatusKey(`${orderId}:${nextStatus}`)

    const response = await fetch(`/api/admin/tables/${tableId}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: nextStatus
      })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not update the order status.'
      })
      setPendingStatusKey(null)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; status?: OrderStatus }
      | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not update the order status.'
      })
      setPendingStatusKey(null)
      return
    }

    setData((current) => ({
      ...current,
      orders: current.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: payload?.status ?? nextStatus
            }
          : order
      )
    }))
    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Order status updated.'
    })
    setPendingStatusKey(null)
  }

  async function mutateOrderItem(
    orderId: string,
    itemId: string,
    action: OrderItemMutationAction
  ) {
    setFlash(null)
    setOrderItemPending(itemId, true)

    const response = await fetch(`/api/admin/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message:
          action === 'decrement'
            ? 'Could not update the order item.'
            : 'Could not remove the order item.'
      })
      setOrderItemPending(itemId, false)
      return false
    }

    if (response.status === 401) {
      setOrderItemPending(itemId, false)
      router.replace('/admin/login?error=unauthorized')
      return false
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message:
          payload?.message ??
          (action === 'decrement'
            ? 'Could not update the order item.'
            : 'Could not remove the order item.')
      })
      setOrderItemPending(itemId, false)
      return false
    }

    await refreshAdminOverviewState()
    setFlash({
      tone: 'success',
      message:
        payload?.message ??
        (action === 'decrement' ? 'Order item quantity updated.' : 'Order item removed.')
    })
    setOrderItemPending(itemId, false)
    return true
  }

  async function handleDecrementOrderItem(orderId: string, itemId: string) {
    await mutateOrderItem(orderId, itemId, 'decrement')
  }

  async function handleConfirmRemoveOrderItem() {
    if (!removeOrderItemTarget) {
      return
    }

    const { orderId, itemId } = removeOrderItemTarget
    const didRemove = await mutateOrderItem(orderId, itemId, 'remove')

    if (didRemove) {
      setRemoveOrderItemTarget(null)
    }
  }

  function renderOrderItemActions(order: AdminOrder, item: AdminOrder['items'][number]) {
    const isPending = pendingOrderItemIds.includes(item.id)

    return (
      <>
        <LoadingButton
          variant="secondary"
          size="sm"
          type="button"
          loading={isPending}
          loadingLabel="-1"
          disabled={isPending}
          onClick={() => void handleDecrementOrderItem(order.id, item.id)}
        >
          -1
        </LoadingButton>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={isPending}
          onClick={() =>
            setRemoveOrderItemTarget({
              orderId: order.id,
              itemId: item.id,
              itemName: item.item_name,
              cancelsOrder: order.items.length === 1
            })
          }
        >
          Remove
        </Button>
      </>
    )
  }

  async function handleClearTable() {
    if (!clearTargetTableId || !clearTargetSession) {
      return
    }

    setFlash(null)
    setIsClearingTable(true)

    const response = await fetch(`/api/admin/tables/${clearTargetTableId}/session`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: clearTargetSession.id
      })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not clear the table session.'
      })
      setIsClearingTable(false)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      setFlash({
        tone: 'error',
        message: payload?.message ?? 'Could not clear the table session.'
      })
      setIsClearingTable(false)
      return
    }

    const nextData = await fetchOverviewData()

    if (nextData) {
      setData(nextData)
    } else {
      setData((current) => ({
        ...current,
        sessions: current.sessions.filter((session) => session.id !== clearTargetSession.id),
        orders: current.orders.filter((order) => order.session_id !== clearTargetSession.id),
        serviceRequests: current.serviceRequests.filter(
          (request) => request.session_id !== clearTargetSession.id
        )
      }))
    }

    if (expandedTableId === clearTargetTableId) {
      setExpandedTableId(null)
    }

    setClearTargetTableId(null)
    setDiscountPercentage('')
    setFlash({
      tone: 'success',
      message: payload?.message ?? 'Table session cleared.'
    })
    setIsClearingTable(false)
  }

  async function handleOpenTableReceipt() {
    if (!clearTargetSession) {
      return
    }

    setFlash(null)
    setIsOpeningReceipt(true)

    const payload = buildReceiptPayloadForOrders({
      guestName: clearTargetSession.guest_name,
      orders: clearTargetOrders,
      discountPercentage:
        discountPercentage.trim() === '' ? null : Number.parseFloat(discountPercentage)
    })

    const response = await fetch('/api/admin/print/receipt-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payload
      })
    }).catch(() => null)

    if (!response) {
      setFlash({
        tone: 'error',
        message: 'Could not open the receipt right now.'
      })
      setIsOpeningReceipt(false)
      return
    }

    if (response.status === 401) {
      router.replace('/admin/login?error=unauthorized')
      return
    }

    const result = (await response.json().catch(() => null)) as
      | { receiptUrl?: string; message?: string }
      | null

    if (!response.ok || !result?.receiptUrl) {
      setFlash({
        tone: 'error',
        message: result?.message ?? 'Could not open the receipt right now.'
      })
      setIsOpeningReceipt(false)
      return
    }

    const receiptWindow = window.open(result.receiptUrl, '_blank')

    if (!receiptWindow) {
      setFlash({
        tone: 'error',
        message: 'Receipt page was blocked. Allow pop-ups and try again.'
      })
      setIsOpeningReceipt(false)
      return
    }

    setIsOpeningReceipt(false)
  }

  function renderStatusButton(order: AdminOrder, status: OrderStatus) {
    const isCurrentStatus = order.status === status
    const isPending = pendingStatusKey === `${order.id}:${status}`

    return (
      <LoadingButton
        variant={isCurrentStatus ? 'default' : 'secondary'}
        size="form"
        className="md:w-auto"
        type="button"
        loading={isPending}
        loadingLabel={`Updating to ${status}...`}
        disabled={isCurrentStatus || Boolean(pendingStatusKey) || !order.table_id}
        onClick={() => {
          if (order.table_id) {
            void handleOrderStatusChange(order.table_id, order.id, status)
          }
        }}
      >
        {status}
      </LoadingButton>
    )
  }

  function jumpToAdminMenuCategory(categoryId: string, anchorId: string) {
    const container = adminMenuResultsRef.current
    const element = document.getElementById(anchorId)

    if (!(container instanceof HTMLElement) || !(element instanceof HTMLElement)) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const nextTop = container.scrollTop + (elementRect.top - containerRect.top) - 12

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth'
    })
    setActiveMenuCategoryId(categoryId)
  }

  return (
    <div className="sectionStack">
      <ActionGroup>
        <Button
          size="form"
          className="md:w-auto"
          type="button"
          onClick={() => {
            setFlash(null)
            setIsAddOrderDialogOpen(true)
          }}
        >
          Add order
        </Button>
      </ActionGroup>

      {flash ? <FlashMessage tone={flash.tone}>{flash.message}</FlashMessage> : null}

      <div className="compactGrid">
        <MetricCard
          eyebrow="Active tables"
          value={data.sessions.length}
          description="Tables with an active guest session right now."
        />
        <MetricCard
          eyebrow="Recent orders"
          value={data.orders.length}
          description="Orders visible in the admin console feed."
        />
        <MetricCard
          eyebrow="Server calls"
          value={data.serviceRequests.length}
          description="Open payment or assistance requests from active tables."
        />
      </div>

      <div className="responsiveSplit">
        <SectionCard>
          <p className="eyebrow">Live order feed</p>
          <h2>Incoming orders</h2>
          <p>Refreshes automatically every few seconds.</p>

          <div className="stack">
            {data.orders.length === 0 ? (
              <EmptyStateCard
                eyebrow="Order queue"
                title="No orders yet"
                description="New table and out orders will appear here as they come in."
              />
            ) : (
              data.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  title={order.table_id ? `Table ${order.table_id}` : 'Out order'}
                  timestamp={formatTimestamp(order.created_at)}
                  summary={
                    <p>
                      {formatOrderIdentity(order.ordered_by_name, order.ordered_by_phone)} ·{' '}
                      <StatusBadge>{order.status}</StatusBadge>
                    </p>
                  }
                  items={order.items.map((item, index) => ({
                    id: item.id ?? `${order.id}-${index}`,
                    name: item.item_name,
                    quantity: item.quantity,
                    total: toPrice(item.line_total_cents),
                    actions: renderOrderItemActions(order, item)
                  }))}
                  note={order.note}
                  total={toPrice(order.total_cents)}
                  actions={
                    <ActionGroup>
                      {!order.table_id ? (
                        <>
                          <LoadingButton
                            variant="secondary"
                            size="form"
                            className="md:w-auto"
                            type="button"
                            loading={pendingReceiptOrderId === order.id}
                            loadingLabel="Opening receipt..."
                            disabled={pendingReceiptOrderId !== null || pendingCloseOutOrderId !== null}
                            onClick={() => void handleOpenOutOrderReceipt(order.id)}
                          >
                            Print receipt
                          </LoadingButton>

                          <LoadingButton
                            variant="default"
                            size="form"
                            className="md:w-auto"
                            type="button"
                            loading={pendingCloseOutOrderId === order.id}
                            loadingLabel="Closing out..."
                            disabled={pendingReceiptOrderId !== null || pendingCloseOutOrderId !== null}
                            onClick={() => void handleCloseOutOutOrder(order.id)}
                          >
                            Close out
                          </LoadingButton>
                        </>
                      ) : (
                        ''
                      )}
                    </ActionGroup>
                  }
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard tone="support" style={{flexGrow: 1}}>
          <p className="eyebrow">Occupied tables</p>
          <h2>Session overview</h2>
          <div className="stack">
            {data.sessions.length === 0 ? (
              <EmptyStateCard
                eyebrow="Sessions"
                title="No active table sessions"
                description="Occupied tables will appear here while guests are still checked in."
                tone="support"
              />
            ) : (
              data.sessions.map((session) => {
                const orderCount = ordersByTable.get(session.table_id)?.length ?? 0
                const tableOrders = ordersByTable.get(session.table_id) ?? []
                const tableServiceRequests = serviceRequestsByTable.get(session.table_id) ?? []
                const isExpanded = expandedTableId === session.table_id
                const tableLabel = tableLabelById.get(session.table_id) ?? `Table ${session.table_id}`

                return (
                  <SectionCard
                    key={session.id}
                    tone="support"
                    style={{display: "flex", gap: "16px", flexDirection: "column"}}
                    className="bg-[radial-gradient(circle_at_top_right,rgb(var(--accent-rgb)/0.08),transparent_32%),var(--card-bg-strong)]"
                  >
                    <SummaryRow>
                      <strong>{tableLabel}</strong>
                      <span>{orderCount} order{orderCount === 1 ? '' : 's'}</span>
                    </SummaryRow>
                    <p>{session.guest_name}</p>
                    {session.guest_phone ? <p>{session.guest_phone}</p> : null}
                    <div className="metaPillRow">
                      <span className="metaPill">
                        Session PIN <strong>{session.session_pin}</strong>
                      </span>
                      <span className="metaPill">Last active {formatTimestamp(session.last_active_at)}</span>
                    </div>
                    <ActionGroup>
                      <LoadingButton
                            size="form"
                            className="md:w-auto"
                            type="button"
                            loading={isClearingTable && clearTargetTableId === session.table_id}
                            loadingLabel="Clearing table..."
                            disabled={isClearingTable}
                            onClick={() => {
                              setDiscountPercentage('')
                              setClearTargetTableId(session.table_id)
                            }}
                          >
                            Clear table
                          </LoadingButton>
                      <Button
                        size="form"
                        className="md:w-auto"
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setExpandedTableId((current) =>
                            current === session.table_id ? null : session.table_id
                          )
                        }
                      >
                        {isExpanded ? 'Hide details' : 'View Details'}
                      </Button>
                    </ActionGroup>

                    {isExpanded ? (
                      <div className="stack pt-2">
                        <div className="stack">
                          <SummaryRow>
                            <strong>Open service requests</strong>
                            <span>{tableServiceRequests.length}</span>
                          </SummaryRow>
                          {tableServiceRequests.length === 0 ? (
                            <p className="finePrint">
                              No open payment or assistance requests for this table.
                            </p>
                          ) : (
                            tableServiceRequests.map((request) => (
                              <ServiceRequestCard
                                key={request.id}
                                title={
                                  request.request_type === 'payment'
                                    ? 'Payment requested'
                                    : 'Assistance requested'
                                }
                                timestamp={formatTimestamp(request.created_at)}
                                guestName={request.guest_name}
                                note={request.note}
                              />
                            ))
                          )}
                        </div>

                        <div className="stack">
                          <SummaryRow>
                            <strong>Current orders</strong>
                            <span>{tableOrders.length}</span>
                          </SummaryRow>
                          {tableOrders.length === 0 ? (
                            <p className="finePrint">
                              No orders for this table yet.
                            </p>
                          ) : (
                            tableOrders.map((order) => (
                              <OrderCard
                                key={order.id}
                                title={`Order ${order.id.slice(0, 8)}`}
                                timestamp={formatTimestamp(order.created_at)}
                                summary={
                                  <p>
                                    {formatOrderIdentity(order.ordered_by_name, order.ordered_by_phone)} ·{' '}
                                    <StatusBadge>{order.status}</StatusBadge>
                                  </p>
                                }
                                items={order.items.map((item, index) => ({
                                  id: item.id ?? `${order.id}-${index}`,
                                  name: item.item_name,
                                  quantity: item.quantity,
                                  total: toPrice(item.line_total_cents),
                                  actions: renderOrderItemActions(order, item)
                                }))}
                                note={order.note}
                                total={toPrice(order.total_cents)}
                                actions={
                                  <div className="adminStatusActions">
                                    {orderStatuses.map((status) => (
                                      <div key={`${order.id}-${status}`}>
                                        {renderStatusButton(order, status)}
                                      </div>
                                    ))}
                                  </div>
                                }
                              />
                            ))
                          )}
                        </div>

                        <ActionGroup layout="stack">
                          <LoadingButton
                            size="form"
                            className="md:w-auto"
                            type="button"
                            loading={isClearingTable && clearTargetTableId === session.table_id}
                            loadingLabel="Clearing table..."
                            disabled={isClearingTable}
                            onClick={() => {
                              setDiscountPercentage('')
                              setClearTargetTableId(session.table_id)
                            }}
                          >
                            Clear table
                          </LoadingButton>
                          <p className="finePrint">
                            This closes the active guest session and archives its orders.
                          </p>
                        </ActionGroup>
                      </div>
                    ) : null}
                  </SectionCard>
                )
              })
            )}
          </div>
        </SectionCard>
      </div>

      <Dialog
        open={Boolean(removeOrderItemTarget)}
        onOpenChange={(open) => {
          if (!open && !isRemovingOrderItem) {
            setRemoveOrderItemTarget(null)
          }
        }}
      >
        <DialogContent
          aria-labelledby="admin-remove-order-item-title"
          onEscapeKeyDown={(event) => {
            if (isRemovingOrderItem) {
              event.preventDefault()
            }
          }}
          onInteractOutside={(event) => {
            if (isRemovingOrderItem) {
              event.preventDefault()
            }
          }}
        >
          {removeOrderItemTarget ? (
            <>
              <DialogHeader>
                <p className="eyebrow">Edit order</p>
                <DialogTitle id="admin-remove-order-item-title">Remove this item?</DialogTitle>
                <DialogDescription>
                  {removeOrderItemTarget.cancelsOrder
                    ? `Removing ${removeOrderItemTarget.itemName} will leave the order empty and mark it as cancelled.`
                    : `Remove ${removeOrderItemTarget.itemName} from the order.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild disabled={isRemovingOrderItem}>
                  <Button variant="secondary" size="form" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <LoadingButton
                  size="form"
                  type="button"
                  loading={isRemovingOrderItem}
                  loadingLabel="Removing item..."
                  disabled={isRemovingOrderItem}
                  onClick={() => void handleConfirmRemoveOrderItem()}
                >
                  {removeOrderItemTarget.cancelsOrder ? 'Remove item and cancel order' : 'Remove item'}
                </LoadingButton>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(clearTargetSession)}
        onOpenChange={(open) => {
          if (!open && !isClearingTable && !isOpeningReceipt) {
            setClearTargetTableId(null)
            setDiscountPercentage('')
          }
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (isClearingTable || isOpeningReceipt) {
              event.preventDefault()
            }
          }}
          onInteractOutside={(event) => {
            if (isClearingTable || isOpeningReceipt) {
              event.preventDefault()
            }
          }}
        >
          {clearTargetSession ? (
            <>
              <DialogHeader>
                <p className="eyebrow">Close session</p>
                <DialogTitle id="clear-table-dialog-title">
                  Open receipt before clearing the table?
                </DialogTitle>
                <DialogDescription>
                  Open the HTML receipt page first, then clear the table after printing or sharing it.
                </DialogDescription>
              </DialogHeader>
              <div className="dialogSummary">
                <SummaryRow>
                  <span>Guest</span>
                  <strong>{clearTargetSession.guest_name}</strong>
                </SummaryRow>
                <SummaryRow>
                  <span>Orders</span>
                  <strong>{clearTargetOrders.length}</strong>
                </SummaryRow>
                <SummaryRow variant="total">
                  <span>Total</span>
                  <strong>
                    {toPrice(clearTargetOrders.reduce((sum, order) => sum + order.total_cents, 0))}
                  </strong>
                </SummaryRow>
              </div>
              <div className="formField">
                <label htmlFor="receipt-discount">Discount %</label>
                <Input
                  id="receipt-discount"
                  name="receipt-discount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Optional"
                  value={discountPercentage}
                  onChange={(event) => setDiscountPercentage(event.target.value)}
                />
              </div>
              <DialogFooter>
                <LoadingButton
                  size="form"
                  type="button"
                  loading={isOpeningReceipt}
                  loadingLabel="Opening receipt..."
                  disabled={isClearingTable || isOpeningReceipt}
                  onClick={() => void handleOpenTableReceipt()}
                >
                  Open receipt
                </LoadingButton>
                <LoadingButton
                  variant="secondary"
                  size="form"
                  type="button"
                  loading={isClearingTable}
                  loadingLabel="Clearing table..."
                  disabled={isClearingTable}
                  onClick={() => void handleClearTable()}
                >
                  Clear table
                </LoadingButton>
                <DialogClose asChild disabled={isClearingTable || isOpeningReceipt}>
                  <Button variant="secondary" size="form" type="button">
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddOrderDialogOpen}
        onOpenChange={(open) => {
          if (!isSubmittingOrder) {
            setIsAddOrderDialogOpen(open)
          }
        }}
      >
        <DialogContent
          className="adminOrderDialog"
          aria-labelledby="admin-add-order-title"
          onEscapeKeyDown={(event) => {
            if (isSubmittingOrder) {
              event.preventDefault()
            }
          }}
          onInteractOutside={(event) => {
            if (isSubmittingOrder) {
              event.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <p className="eyebrow">Admin Order</p>
            <DialogTitle id="admin-add-order-title">Add order</DialogTitle>
            <DialogDescription>
              Choose whether this is a table order or an out order, then build the order.
            </DialogDescription>
          </DialogHeader>

          <div className="adminOrderDialogLayout">
            <div className="sectionStack">
              <div className="formField">
                <label>Order type</label>
                <div className="requestTypeRow">
                  <label className="radioChoice">
                    <input
                      type="radio"
                      name="admin-order-type"
                      value="table"
                      checked={orderType === 'table'}
                      disabled={tables.length === 0}
                      onChange={() => setOrderType('table')}
                    />
                    <span>Table order</span>
                  </label>
                  <label className="radioChoice">
                    <input
                      type="radio"
                      name="admin-order-type"
                      value="out"
                      checked={orderType === 'out'}
                      onChange={() => setOrderType('out')}
                    />
                    <span>Out order</span>
                  </label>
                </div>
              </div>

              {orderType === 'table' ? (
                <div className="formField">
                  <label htmlFor="admin-order-table">Table</label>
                  <select
                    id="admin-order-table"
                    name="admin-order-table"
                    value={selectedTableId}
                    onChange={(event) => setSelectedTableId(event.target.value)}
                  >
                    {tables.map((table) => {
                      const session = data.sessions.find((entry) => entry.table_id === table.id)

                      return (
                        <option key={table.id} value={table.id}>
                          {session
                            ? `${table.label} · ${session.guest_name}`
                            : `${table.label} · No active session`}
                        </option>
                      )
                    })}
                  </select>
                </div>
              ) : (
                <>
                  <div className="formField">
                    <label htmlFor="admin-order-customer-name">Name</label>
                    <Input
                      id="admin-order-customer-name"
                      name="admin-order-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="formField">
                    <label htmlFor="admin-order-customer-phone">Phone number</label>
                    <Input
                      id="admin-order-customer-phone"
                      name="admin-order-customer-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="Optional"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                    />
                  </div>
                </>
              )}

              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                label="Search items"
                placeholder="Search by item, description, or category"
                summary={searchSummary}
              >
                {menuCategorySections.length > 1 ? (
                  <nav className="menuFloatingNavigator" aria-label="Menu sections">
                    <div className="menuFloatingNavigatorInner" ref={adminNavigatorInnerRef}>
                      {menuCategorySections.map((category) => (
                        <Button
                          key={category.id}
                          className="menuFloatingNavigatorPill"
                          size="sm"
                          variant={activeMenuCategoryId === category.id ? 'default' : 'secondary'}
                          type="button"
                          data-category-id={category.id}
                          onClick={() => jumpToAdminMenuCategory(category.id, category.anchorId)}
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </nav>
                ) : null}
              </SearchBar>

              <div className="adminMenuSearchResults" ref={adminMenuResultsRef}>
                {filteredMenuItems.length === 0 ? (
                  <p className="finePrint">No menu items match that search.</p>
                ) : (
                  menuCategorySections.map((category) => (
                    <section
                      className="adminMenuCategorySection"
                      key={category.id}
                      id={category.anchorId}
                      data-category-id={category.id}
                    >
                      <div className="menuCategoryHeader">
                        <p className="eyebrow">{category.name}</p>
                        <h2>{category.name}</h2>
                      </div>
                      <div className="adminMenuCategoryRows">
                        {(filteredMenuItemsByCategory.get(category.id) ?? []).map((item) => (
                          (() => {
                            const portionEnabled = isPortionEnabled(item)

                            if (!portionEnabled) {
                              return (
                                <div className="adminMenuItemRow" key={item.id}>
                                  <div className="adminMenuItemInfo">
                                    <div className="adminMenuItemHeading">
                                      <strong>{item.name}</strong>
                                      <p className="finePrint">{toPrice(item.price_cents)}</p>
                                    </div>
                                  </div>
                                  <QuantityStepper
                                    className="adminMenuItemStepper"
                                    value={quantities[buildQuantityKey(item.id)] ?? 0}
                                    decrementLabel={`Remove one ${item.name}`}
                                    incrementLabel={`Add one ${item.name}`}
                                    onDecrement={() => adjustQuantity(item.id, -1)}
                                    onIncrement={() => adjustQuantity(item.id, 1)}
                                  />
                                </div>
                              )
                            }

                            return (
                              <Fragment key={item.id}>
                                <div className="adminMenuItemRow">
                                  <div className="adminMenuItemInfo">
                                    <div className="adminMenuItemHeading">
                                      <strong>{item.name} (Half)</strong>
                                      <p className="finePrint">{toPrice(item.half_price_cents ?? 0)}</p>
                                    </div>
                                  </div>
                                  <QuantityStepper
                                    className="adminMenuItemStepper"
                                    value={quantities[buildQuantityKey(item.id, 'half')] ?? 0}
                                    decrementLabel={`Remove half ${item.name}`}
                                    incrementLabel={`Add half ${item.name}`}
                                    onDecrement={() => adjustQuantity(item.id, -1, 'half')}
                                    onIncrement={() => adjustQuantity(item.id, 1, 'half')}
                                  />
                                </div>
                                <div className="adminMenuItemRow">
                                  <div className="adminMenuItemInfo">
                                    <div className="adminMenuItemHeading">
                                      <strong>{item.name} (Full)</strong>
                                      <p className="finePrint">{toPrice(item.full_price_cents ?? 0)}</p>
                                    </div>
                                  </div>
                                  <QuantityStepper
                                    className="adminMenuItemStepper"
                                    value={quantities[buildQuantityKey(item.id, 'full')] ?? 0}
                                    decrementLabel={`Remove full ${item.name}`}
                                    incrementLabel={`Add full ${item.name}`}
                                    onDecrement={() => adjustQuantity(item.id, -1, 'full')}
                                    onIncrement={() => adjustQuantity(item.id, 1, 'full')}
                                  />
                                </div>
                              </Fragment>
                            )
                          })()
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>

            <div className="adminOrderSummaryCard">
              <div className="dialogSummary">
                <SummaryRow>
                  <span>Order type</span>
                  <strong>{orderType === 'table' ? 'Table order' : 'Out order'}</strong>
                </SummaryRow>
                <SummaryRow>
                  <span>{orderType === 'table' ? 'Table' : 'Customer'}</span>
                  <strong>
                    {orderType === 'table'
                      ? selectedTable?.label ?? 'Choose table'
                      : customerName.trim() || 'Enter name'}
                  </strong>
                </SummaryRow>
                <SummaryRow>
                  <span>{orderType === 'table' ? 'Session' : 'Phone'}</span>
                  <strong>
                    {orderType === 'table'
                      ? selectedSession?.guest_name ?? 'Guest session will be created'
                      : customerPhone.trim() || 'Not provided'}
                  </strong>
                </SummaryRow>
              </div>

              <div className="adminOrderSummaryList">
                {!hasAnyOrderItems ? (
                  <p className="finePrint">Select menu items or add a custom item to build the order.</p>
                ) : null}

                {selectedItems.map((item) => (
                    <div className="adminOrderSummaryItem" key={item.key}>
                      <div className="stack">
                        <SummaryRow>
                          <strong>{item.name}</strong>
                          <span>{toPrice(item.unitPriceCents * item.quantity)}</span>
                        </SummaryRow>
                        <p className="finePrint">{toPrice(item.unitPriceCents)} each</p>
                      </div>
                      <QuantityStepper
                        value={item.quantity}
                        decrementLabel={`Reduce ${item.name}`}
                        incrementLabel={`Increase ${item.name}`}
                        onDecrement={() => adjustQuantity(item.itemId, -1, item.portion)}
                        onIncrement={() => adjustQuantity(item.itemId, 1, item.portion)}
                      />
                    </div>
                  ))}

                {normalizedCustomItems.length > 0
                  ? normalizedCustomItems.map((item) => (
                      <div className="adminOrderSummaryItem" key={item.id}>
                        <div className="stack">
                          <SummaryRow>
                            <strong>{item.name}</strong>
                            <span>{toPrice(item.unitPriceCents * item.quantity)}</span>
                          </SummaryRow>
                          <p className="finePrint">{toPrice(item.unitPriceCents)} each</p>
                        </div>
                        <QuantityStepper
                          value={item.quantity}
                          decrementLabel={`Reduce ${item.name}`}
                          incrementLabel={`Increase ${item.name}`}
                          onDecrement={() => adjustCustomItemQuantity(item.id, -1)}
                          onIncrement={() => adjustCustomItemQuantity(item.id, 1)}
                        />
                      </div>
                    ))
                  : null}
              </div>

              <div className="formField">
                <label htmlFor="admin-order-custom-item-name">Custom item</label>
                <div className="adminCustomItemRow">
                  <Input
                    id="admin-order-custom-item-name"
                    name="admin-order-custom-item-name"
                    type="text"
                    placeholder="Item name"
                    value={customItemName}
                    onChange={(event) => setCustomItemName(event.target.value)}
                  />
                  <Input
                    id="admin-order-custom-item-price"
                    name="admin-order-custom-item-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={customItemPrice}
                    onChange={(event) => setCustomItemPrice(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="adminCustomItemAdd"
                    disabled={isSubmittingOrder}
                    onClick={() => handleAddCustomItem()}
                  >
                    Add
                  </Button>
                </div>
                <p className="finePrint">Adds a one-off line item to this order (not saved to the menu).</p>
              </div>

              <div className="formField">
                <label htmlFor="admin-order-note">Note</label>
                <Textarea
                  id="admin-order-note"
                  name="admin-order-note"
                  rows={3}
                  placeholder="Optional order note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              <SummaryRow variant="total">
                <span>Total</span>
                <strong>{toPrice(totalCents)}</strong>
              </SummaryRow>

              <DialogFooter>
                <DialogClose asChild disabled={isSubmittingOrder}>
                  <Button variant="secondary" size="form" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <LoadingButton
                  size="form"
                  type="button"
                  loading={isSubmittingOrder}
                  loadingLabel="Creating order..."
                  disabled={
                    isSubmittingOrder ||
                    !hasAnyOrderItems ||
                    (orderType === 'table' ? !selectedTableId : !customerName.trim())
                  }
                  onClick={() => void handleCreateAdminOrder()}
                >
                  Create order
                </LoadingButton>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
