'use client'

import { useActionState, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlaceOrderActionState } from '@/app/table/[tableId]/actions'
import AppOverlaySheet from '@/components/AppOverlaySheet'
import FormActionButton from '@/components/FormActionButton'
import SearchBar from '@/components/SearchBar'
import { ActionGroup } from '@/components/ui/action-group'
import { Button } from '@/components/ui/button'
import { FlashMessage } from '@/components/ui/flash-message'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { SectionCard } from '@/components/ui/section-card'
import { SummaryRow } from '@/components/ui/summary-row'
import { Textarea } from '@/components/ui/textarea'

type MenuCategory = {
  id: string
  name: string
}

type MenuItem = {
  id: string
  category_id: string
  name: string
  description: string | null
  price_cents: number
}

type GuestOrderingExperienceProps = {
  tableId: string
  categories: MenuCategory[]
  items: MenuItem[]
  action: (
    state: PlaceOrderActionState,
    formData: FormData
  ) => Promise<PlaceOrderActionState>
  guestName: string
  previewMode?: boolean
}

const initialState: PlaceOrderActionState = {
  status: 'idle'
}

function toPrice(priceCents: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(priceCents / 100)
}

export default function GuestOrderingExperience({
  tableId,
  categories,
  items,
  action,
  guestName,
  previewMode = false
}: GuestOrderingExperienceProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(action, initialState)
  const [note, setNote] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuccessCard, setShowSuccessCard] = useState(false)
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false)
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase()
  const orderFormId = `guest-order-form-${tableId}`

  const filteredItems = useMemo(() => {
    if (!normalizedSearchQuery) {
      return items
    }

    return items.filter((item) => {
      const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase()
      return haystack.includes(normalizedSearchQuery)
    })
  }, [items, normalizedSearchQuery])

  const filteredCategoryIds = useMemo(
    () => new Set(filteredItems.map((item) => item.category_id)),
    [filteredItems]
  )

  const categorySections = useMemo(
    () =>
      categories
        .filter((category) => filteredCategoryIds.has(category.id))
        .map((category) => ({
          ...category,
          anchorId: `menu-category-${category.id}`
        })),
    [categories, filteredCategoryIds]
  )

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>(
      categorySections.map((category) => [category.id, []])
    )

    for (const item of filteredItems) {
      const list = map.get(item.category_id)
      if (list) {
        list.push(item)
      } else {
        map.set(item.category_id, [item])
      }
    }

    return map
  }, [categorySections, filteredItems])

  const [activeCategoryId, setActiveCategoryId] = useState(categorySections[0]?.id ?? '')

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => ({
          itemId: item.id,
          quantity: quantities[item.id] ?? 0,
          name: item.name,
          priceCents: item.price_cents
        }))
        .filter((item) => item.quantity > 0),
    [items, quantities]
  )

  const totalCents = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.priceCents,
    0
  )

  useEffect(() => {
    if (state.status === 'success') {
      setQuantities({})
      setNote('')
      setShowSuccessCard(true)
      setIsOrderSheetOpen(false)
      setIsNavigatorOpen(false)
      const timeout = window.setTimeout(() => {
        router.push(`/table/${tableId}/orders?placed=1`)
      }, 900)

      return () => window.clearTimeout(timeout)
    }

    if (state.status === 'error') {
      setShowSuccessCard(false)
      setIsOrderSheetOpen(true)
      return
    }
  }, [router, state.status, tableId])

  useEffect(() => {
    if (!categorySections.length) {
      setActiveCategoryId('')
      return
    }

    setActiveCategoryId((current) =>
      categorySections.some((category) => category.id === current)
        ? current
        : categorySections[0].id
    )
  }, [categorySections])

  useEffect(() => {
    if (!categorySections.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)

        if (!visibleEntries[0]) {
          return
        }

        const nextCategoryId = visibleEntries[0].target.getAttribute('data-category-id')
        if (nextCategoryId) {
          setActiveCategoryId(nextCategoryId)
        }
      },
      {
        rootMargin: '-15% 0px -55% 0px',
        threshold: [0.2, 0.35, 0.5, 0.75]
      }
    )

    for (const category of categorySections) {
      const element = document.getElementById(category.anchorId)
      if (element) {
        observer.observe(element)
      }
    }

    return () => observer.disconnect()
  }, [categorySections])

  useEffect(() => {
    if (isOrderSheetOpen) {
      setIsNavigatorOpen(false)
    }
  }, [isOrderSheetOpen])

  useEffect(() => {
    if (isNavigatorOpen) {
      setIsOrderSheetOpen(false)
    }
  }, [isNavigatorOpen])

  function adjustQuantity(itemId: string, delta: number) {
    setQuantities((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + delta)
      if (nextQuantity === 0) {
        const { [itemId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [itemId]: nextQuantity
      }
    })
  }

  function jumpToCategory(categoryId: string, anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    setActiveCategoryId(categoryId)
    setIsNavigatorOpen(false)
  }

  const searchSummary = normalizedSearchQuery
    ? `${filteredItems.length} matching item${filteredItems.length === 1 ? '' : 's'}`
    : `${items.length} item${items.length === 1 ? '' : 's'} on the menu`

  return (
    <form id={orderFormId} action={formAction} className="sectionStack">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          selectedItems.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity
          }))
        )}
      />
      <input type="hidden" name="note" value={note} />

      <div className="orderLayout">
        <div className="sectionStack">
          {showSuccessCard ? (
            <SectionCard tone="success">
              <p className="eyebrow">Order placed</p>
              <h2>Your order is in</h2>
              <p>Thanks, {guestName}. The cafe team has received your order and will start preparing it.</p>
              <div className="buttonRow">
                <Button
                  className="min-h-12 w-full rounded-full px-4 py-3 md:w-auto"
                  type="button"
                  onClick={() => setShowSuccessCard(false)}
                >
                  Add more items
                </Button>
              </div>
            </SectionCard>
          ) : null}

          <div className="menuSearchBarWrap">
            <SearchBar
              label="Menu search"
              placeholder="Search coffee, tea, snacks..."
              value={searchQuery}
              onChange={setSearchQuery}
              summary={searchSummary}
            />
          </div>

          <div className="grid">
            {categorySections.length === 0 ? (
              <SectionCard tone="support">
                <p className="eyebrow">No matches</p>
                <h2>No menu items found</h2>
                <p>Try a different search term to find something from the menu.</p>
              </SectionCard>
            ) : (
              categorySections.map((category) => (
                <SectionCard
                  className="menuCategoryCard"
                  key={category.id}
                  id={category.anchorId}
                  data-category-id={category.id}
                >
                  <p className="eyebrow">{category.name}</p>
                  <h2>{category.name}</h2>
                  {(itemsByCategory.get(category.id) ?? []).length === 0 ? (
                    <p>No available items in this category yet.</p>
                  ) : (
                    <div className="stack">
                      {(itemsByCategory.get(category.id) ?? []).map((item) => {
                        const quantity = quantities[item.id] ?? 0

                        return (
                          <div className="menuItem" key={item.id}>
                            <div className="sectionStack compact">
                              <div>
                                <h3>{item.name}</h3>
                                {item.description ? <p>{item.description}</p> : null}
                              </div>
                              <strong>{toPrice(item.price_cents)}</strong>
                            </div>

                            <QuantityStepper
                              value={quantity}
                              disabled={previewMode}
                              decrementLabel={`Remove one ${item.name}`}
                              incrementLabel={`Add one ${item.name}`}
                              onDecrement={() => adjustQuantity(item.id, -1)}
                              onIncrement={() => adjustQuantity(item.id, 1)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>
              ))
            )}
          </div>
        </div>

        <div className="fixed inset-x-3 bottom-[max(12px,calc(env(safe-area-inset-bottom)+12px))] z-30 mx-auto flex w-[min(720px,calc(100vw-24px))] flex-col gap-3 rounded-[22px] border border-border bg-[var(--panel-strong)] p-3 shadow-[0_16px_32px_rgb(var(--shadow-rgb)/0.12)] backdrop-blur-xl sm:inset-x-5 sm:w-[min(720px,calc(100vw-40px))]">
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-[var(--card-bg)] px-4 py-3">
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-foreground">
                {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}
              </p>
              <p className="m-0 text-sm text-[var(--muted)]">
                {selectedItems.length === 0
                  ? 'Add items to start an order.'
                  : 'Review your cart before placing the order.'}
              </p>
            </div>
            <strong className="shrink-0 text-base">{toPrice(totalCents)}</strong>
          </div>

          <ActionGroup className="sm:justify-end">
            {categorySections.length > 1 ? (
              <Button
                className="sm:w-auto"
                variant="secondary"
                size="form"
                type="button"
                onClick={() => setIsNavigatorOpen(true)}
              >
                Menu sections
              </Button>
            ) : null}
            <Button
              className="sm:w-auto"
              size="form"
              type="button"
              disabled={previewMode || selectedItems.length === 0}
              onClick={() => setIsOrderSheetOpen(true)}
            >
              {previewMode ? 'Preview mode' : 'Review order'}
            </Button>
          </ActionGroup>
        </div>

        <AppOverlaySheet
          open={isOrderSheetOpen}
          onOpenChange={setIsOrderSheetOpen}
          eyebrow="Your cart"
          title="Review your order"
          description="Confirm the selected items, add a note for the cafe, and place the order when you are ready."
        >
          <div className="stack mt-0">
            {selectedItems.length === 0 ? (
              <p>No items selected yet.</p>
            ) : (
              selectedItems.map((item) => (
                <SummaryRow key={item.itemId}>
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <strong>{toPrice(item.quantity * item.priceCents)}</strong>
                </SummaryRow>
              ))
            )}
          </div>

          <SummaryRow variant="total">
            <span>Total</span>
            <strong>{toPrice(totalCents)}</strong>
          </SummaryRow>

          <div className="formField">
            <label htmlFor="order-note">Note for the cafe</label>
            <Textarea
              id="order-note"
              rows={4}
              placeholder="Extra hot, less sugar, no onions..."
              disabled={previewMode}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <FormActionButton
              form={orderFormId}
              label={previewMode ? 'Preview mode' : 'Place order'}
              loadingLabel="Placing order..."
              disabled={previewMode || selectedItems.length === 0}
            />
            <p className="finePrint">
              {previewMode
                ? 'Admin preview: ordering is disabled in guest view preview mode.'
                : 'Your order will go straight to the cafe team.'}
            </p>
          </div>

          {state.status === 'error' ? (
            <FlashMessage tone="error">{state.message}</FlashMessage>
          ) : null}
        </AppOverlaySheet>

        {categorySections.length > 1 ? (
          <AppOverlaySheet
            open={isNavigatorOpen}
            onOpenChange={setIsNavigatorOpen}
            eyebrow="Browse menu"
            title="Jump to a section"
            description="Move straight to the category you want without scrolling through the full menu."
          >
            <div className="flex flex-col gap-2" aria-label="Menu sections">
              {categorySections.map((category) => (
                <Button
                  key={category.id}
                  className="h-auto justify-start rounded-2xl px-4 py-3 text-left"
                  variant={activeCategoryId === category.id ? 'default' : 'secondary'}
                  type="button"
                  onClick={() => jumpToCategory(category.id, category.anchorId)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </AppOverlaySheet>
        ) : null}
      </div>
    </form>
  )
}
