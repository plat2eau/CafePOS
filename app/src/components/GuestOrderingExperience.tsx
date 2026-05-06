'use client'

import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
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
import { searchMenuItems } from '@/lib/menu-search'

type Portion = 'half' | 'full'
type DietKind = 'veg' | 'non-veg'

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
  half_price_cents: number | null
  full_price_cents: number | null
  sort_order: number
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

function buildQuantityKey(itemId: string, portion?: Portion | null) {
  return portion ? `${itemId}::${portion}` : itemId
}

function isPortionEnabled(item: Pick<MenuItem, 'half_price_cents' | 'full_price_cents'>) {
  return (item.half_price_cents ?? 0) > 0 && (item.full_price_cents ?? 0) > 0
}

function getDietKind(description: string | null): DietKind | null {
  const normalized = description?.trim().toLowerCase() ?? ''
  if (!normalized) return null

  if (/\bnon[-\s]?veg\b/i.test(normalized)) {
    return 'non-veg'
  }

  if (/\bveg\b/i.test(normalized)) {
    return 'veg'
  }

  return null
}

function getDisplayDescription(description: string | null) {
  if (!description?.trim()) {
    return null
  }

  const segments = description
    .split(/[•·|]/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length < 2) {
    return description.trim()
  }

  const visibleSegments = segments.filter((segment) => {
    const normalized = segment.toLowerCase()

    if (/^non[-\s]?veg$/.test(normalized) || normalized === 'veg') {
      return false
    }

    if (/^services?$/.test(normalized)) {
      return false
    }

    if (/^\d+\s+servings?$/.test(normalized)) {
      return false
    }

    return true
  })

  return visibleSegments.length > 0 ? visibleSegments.join(' • ') : null
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
  const searchBarWrapRef = useRef<HTMLDivElement | null>(null)
  const floatingOrderBarRef = useRef<HTMLDivElement | null>(null)
  const mobileNavigatorInnerRef = useRef<HTMLDivElement | null>(null)
  const lastNavigatorScrollIdRef = useRef<string | null>(null)
  const [menuStickyOffsetPx, setMenuStickyOffsetPx] = useState<number>(92)
  const [floatingOrderBarHeightPx, setFloatingOrderBarHeightPx] = useState<number>(196)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase()
  const orderFormId = `guest-order-form-${tableId}`
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )

  useEffect(() => {
    const element = searchBarWrapRef.current
    if (!element) return

    const updateOffset = () => {
      const height = element.getBoundingClientRect().height
      setMenuStickyOffsetPx(Math.round(height + 24))
    }

    updateOffset()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOffset)
      return () => window.removeEventListener('resize', updateOffset)
    }

    const observer = new ResizeObserver(updateOffset)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = floatingOrderBarRef.current
    if (!element) return

    const updateHeight = () => {
      const height = element.getBoundingClientRect().height
      setFloatingOrderBarHeightPx(Math.round(height + 24))
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }

    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const filteredItems = useMemo(() => {
    return searchMenuItems(items, deferredSearchQuery, categoryNameById)
  }, [categoryNameById, deferredSearchQuery, items])

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

  useEffect(() => {
    if (!categorySections.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(categorySections[0]?.id ?? '')
    }
  }, [activeCategoryId, categorySections])

  useEffect(() => {
    if (categorySections.length < 2) return

    const categoriesWithElements = categorySections
      .map((category) => ({
        id: category.id,
        element: document.getElementById(category.anchorId)
      }))
      .filter(
        (entry): entry is { id: string; element: HTMLElement } => entry.element instanceof HTMLElement
      )

    if (categoriesWithElements.length < 2) return

    const triggerPx = 24
    let rafId: number | null = null

    const updateActiveCategory = () => {
      rafId = null
      let bestId: string | null = null
      let bestTop = Number.NEGATIVE_INFINITY
      let closestPositiveId: string | null = null
      let closestPositiveTop = Number.POSITIVE_INFINITY

      for (const entry of categoriesWithElements) {
        const top = entry.element.getBoundingClientRect().top - menuStickyOffsetPx

        if (top <= triggerPx && top > bestTop) {
          bestTop = top
          bestId = entry.id
        } else if (top > triggerPx && top < closestPositiveTop) {
          closestPositiveTop = top
          closestPositiveId = entry.id
        }
      }

      const nextId = bestId ?? closestPositiveId ?? categorySections[0]?.id ?? ''
      if (nextId && nextId !== activeCategoryId) {
        setActiveCategoryId(nextId)
      }
    }

    const handleScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(updateActiveCategory)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [activeCategoryId, categorySections, menuStickyOffsetPx])

  useEffect(() => {
    if (categorySections.length < 2) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 640px)').matches) return
    if (!activeCategoryId) return

    const container = mobileNavigatorInnerRef.current
    if (!container) return

    if (lastNavigatorScrollIdRef.current === activeCategoryId) return

    const pill = container.querySelector(
      `[data-category-id="${activeCategoryId}"]`
    ) as HTMLElement | null
    if (!pill) return

    lastNavigatorScrollIdRef.current = activeCategoryId
    pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategoryId, categorySections.length])

  const selectedItems = useMemo(
    () =>
      items.flatMap((item) => {
        if (!isPortionEnabled(item)) {
          const quantity = quantities[buildQuantityKey(item.id)] ?? 0
          return quantity > 0
            ? [
                {
                  key: buildQuantityKey(item.id),
                  itemId: item.id,
                  portion: null as Portion | null,
                  quantity,
                  name: item.name,
                  unitPriceCents: item.price_cents
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
          quantity: number
          name: string
          unitPriceCents: number
        }> = []

        if (halfQuantity > 0) {
          result.push({
            key: buildQuantityKey(item.id, 'half'),
            itemId: item.id,
            portion: 'half',
            quantity: halfQuantity,
            name: `${item.name} (Half)`,
            unitPriceCents: item.half_price_cents ?? 0
          })
        }

        if (fullQuantity > 0) {
          result.push({
            key: buildQuantityKey(item.id, 'full'),
            itemId: item.id,
            portion: 'full',
            quantity: fullQuantity,
            name: `${item.name} (Full)`,
            unitPriceCents: item.full_price_cents ?? 0
          })
        }

        return result
      }),
    [items, quantities]
  )

  const totalCents = selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0)

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
      const key = buildQuantityKey(itemId)
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

  function adjustPortionQuantity(itemId: string, portion: Portion, delta: number) {
    setQuantities((current) => {
      const key = buildQuantityKey(itemId, portion)
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

  function jumpToCategory(categoryId: string, anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    setActiveCategoryId(categoryId)
    setIsNavigatorOpen(false)
  }

  return (
    <form id={orderFormId} action={formAction} className="sectionStack">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          selectedItems.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            portion: item.portion ?? undefined
          }))
        )}
      />
      <input type="hidden" name="note" value={note} />

      <div
        className="orderLayout"
        style={
          menuStickyOffsetPx || floatingOrderBarHeightPx
            ? ({
                '--menu-sticky-offset': `${menuStickyOffsetPx}px`,
                '--order-floating-offset': `${floatingOrderBarHeightPx}px`
              } as any)
            : undefined
        }
      >
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

          <div className="menuSearchBarWrap" ref={searchBarWrapRef}>
            <SearchBar
              label="Menu search"
              placeholder="Search coffee, tea, snacks..."
              value={searchQuery}
              onChange={setSearchQuery}
            >
              {categorySections.length > 1 ? (
                <nav className="menuFloatingNavigator sm:hidden" aria-label="Menu sections">
                  <div className="menuFloatingNavigatorInner" ref={mobileNavigatorInnerRef}>
                    {categorySections.map((category) => (
                      <Button
                        key={category.id}
                        className="menuFloatingNavigatorPill"
                        size="sm"
                        variant={activeCategoryId === category.id ? 'default' : 'secondary'}
                        type="button"
                        data-category-id={category.id}
                        onClick={() => jumpToCategory(category.id, category.anchorId)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </nav>
              ) : null}
            </SearchBar>
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
                  <div className="menuCategoryHeader">
                    <p className="eyebrow">{category.name}</p>
                    <h2>{category.name}</h2>
                  </div>
                  {(itemsByCategory.get(category.id) ?? []).length === 0 ? (
                    <p>No available items in this category yet.</p>
                  ) : (
                    <div className="stack">
                      {(itemsByCategory.get(category.id) ?? []).map((item) => {
                        const portionEnabled = isPortionEnabled(item)
                        const quantity = quantities[buildQuantityKey(item.id)] ?? 0
                        const halfQuantity = quantities[buildQuantityKey(item.id, 'half')] ?? 0
                        const fullQuantity = quantities[buildQuantityKey(item.id, 'full')] ?? 0
                        const dietKind = getDietKind(item.description)
                        const displayDescription = getDisplayDescription(item.description)

                        if (portionEnabled) {
                          return [
                            <div className="menuItem" key={`${item.id}-half`}>
                                <div className="menuItemHeader">
                                  <div className="menuItemTitleBlock">
                                    <div className="menuItemTitleRow">
                                      {dietKind ? (
                                        <span
                                          className={`dietIndicator ${dietKind === 'veg' ? 'veg' : 'nonVeg'}`}
                                          aria-label={dietKind === 'veg' ? 'Veg' : 'Non veg'}
                                          title={dietKind === 'veg' ? 'Veg' : 'Non veg'}
                                        />
                                      ) : null}
                                      <h3>{item.name} (Half)</h3>
                                    </div>
                                    {displayDescription ? (
                                      <div className="menuItemMeta">
                                        <p>{displayDescription}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="menuItemFooter">
                                  <strong className="menuItemPrice">
                                    {toPrice(item.half_price_cents ?? 0)}
                                  </strong>
                                  <QuantityStepper
                                    className="menuItemQuantityStepper"
                                    value={halfQuantity}
                                    disabled={previewMode}
                                    decrementLabel={`Remove half ${item.name}`}
                                    incrementLabel={`Add half ${item.name}`}
                                    onDecrement={() => adjustPortionQuantity(item.id, 'half', -1)}
                                    onIncrement={() => adjustPortionQuantity(item.id, 'half', 1)}
                                  />
                                </div>
                              </div>,

                            <div className="menuItem" key={`${item.id}-full`}>
                                <div className="menuItemHeader">
                                  <div className="menuItemTitleBlock">
                                    <div className="menuItemTitleRow">
                                      {dietKind ? (
                                        <span
                                          className={`dietIndicator ${dietKind === 'veg' ? 'veg' : 'nonVeg'}`}
                                          aria-label={dietKind === 'veg' ? 'Veg' : 'Non veg'}
                                          title={dietKind === 'veg' ? 'Veg' : 'Non veg'}
                                        />
                                      ) : null}
                                      <h3>{item.name} (Full)</h3>
                                    </div>
                                    {displayDescription ? (
                                      <div className="menuItemMeta">
                                        <p>{displayDescription}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="menuItemFooter">
                                  <strong className="menuItemPrice">
                                    {toPrice(item.full_price_cents ?? 0)}
                                  </strong>
                                  <QuantityStepper
                                    className="menuItemQuantityStepper"
                                    value={fullQuantity}
                                    disabled={previewMode}
                                    decrementLabel={`Remove full ${item.name}`}
                                    incrementLabel={`Add full ${item.name}`}
                                    onDecrement={() => adjustPortionQuantity(item.id, 'full', -1)}
                                    onIncrement={() => adjustPortionQuantity(item.id, 'full', 1)}
                                  />
                                </div>
                              </div>
                          ]
                        }

                        return (
                          <div className="menuItem" key={item.id}>
                            <div className="menuItemHeader">
                              <div className="menuItemTitleBlock">
                                <div className="menuItemTitleRow">
                                  {dietKind ? (
                                    <span
                                      className={`dietIndicator ${dietKind === 'veg' ? 'veg' : 'nonVeg'}`}
                                      aria-label={dietKind === 'veg' ? 'Veg' : 'Non veg'}
                                      title={dietKind === 'veg' ? 'Veg' : 'Non veg'}
                                    />
                                  ) : null}
                                  <h3>{item.name}</h3>
                                </div>
                                {displayDescription ? (
                                  <div className="menuItemMeta">
                                    <p>{displayDescription}</p>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="menuItemFooter">
                              <strong className="menuItemPrice">
                                {toPrice(item.price_cents)}
                              </strong>
                              <QuantityStepper
                                className="menuItemQuantityStepper"
                                value={quantity}
                                disabled={previewMode}
                                decrementLabel={`Remove one ${item.name}`}
                                incrementLabel={`Add one ${item.name}`}
                                onDecrement={() => adjustQuantity(item.id, -1)}
                                onIncrement={() => adjustQuantity(item.id, 1)}
                              />
                            </div>
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

        <div
          ref={floatingOrderBarRef}
          className="fixed inset-x-3 bottom-[max(12px,calc(env(safe-area-inset-bottom)+12px))] z-30 mx-auto flex w-[min(720px,calc(100vw-24px))] flex-col gap-3 rounded-[22px] border border-border bg-[var(--panel-strong)] p-3 shadow-[0_16px_32px_rgb(var(--shadow-rgb)/0.12)] backdrop-blur-xl sm:inset-x-5 sm:w-[min(720px,calc(100vw-40px))]"
        >
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
                className="sm:w-auto menuSectionsButton"
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
                <SummaryRow key={item.key}>
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <strong>{toPrice(item.quantity * item.unitPriceCents)}</strong>
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
