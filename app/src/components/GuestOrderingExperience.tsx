'use client'

import { useActionState, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlaceOrderActionState } from '@/app/table/[tableId]/actions'
import FormActionButton from '@/components/FormActionButton'
import SearchBar from '@/components/SearchBar'

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

  function toggleOrderSheet() {
    setIsOrderSheetOpen((current) => !current)
  }

  const searchSummary = normalizedSearchQuery
    ? `${filteredItems.length} matching item${filteredItems.length === 1 ? '' : 's'}`
    : `${items.length} item${items.length === 1 ? '' : 's'} on the menu`

  return (
    <form action={formAction} className="sectionStack">
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

      <div className="orderLayout">
        <div className="sectionStack">
          {showSuccessCard ? (
            <article className="card successHeroCard">
              <p className="eyebrow">Order placed</p>
              <h2>Your order is in</h2>
              <p>Thanks, {guestName}. The cafe team has received your order and will start preparing it.</p>
              <div className="buttonRow">
                <button className="button" type="button" onClick={() => setShowSuccessCard(false)}>
                  Add more items
                </button>
              </div>
            </article>
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
              <article className="card supportCard">
                <p className="eyebrow">No matches</p>
                <h2>No menu items found</h2>
                <p>Try a different search term to find something from the menu.</p>
              </article>
            ) : (
              categorySections.map((category) => (
                <article
                  className="card menuCategoryCard"
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

                            <div className="quantityControls">
                              <button
                                className="quantityButton"
                                type="button"
                                disabled={previewMode}
                                onClick={() => adjustQuantity(item.id, -1)}
                                aria-label={`Remove one ${item.name}`}
                              >
                                -
                              </button>
                              <span className="quantityValue">{quantity}</span>
                              <button
                                className="quantityButton"
                                type="button"
                                disabled={previewMode}
                                onClick={() => adjustQuantity(item.id, 1)}
                                aria-label={`Add one ${item.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        <div className={`mobileBottomBar${isOrderSheetOpen ? ' expanded' : ''}`}>
          <button
            className="mobileBottomBarSummary"
            type="button"
            aria-expanded={isOrderSheetOpen}
            aria-controls="order-drawer-panel"
            onClick={toggleOrderSheet}
          >
            <span className="mobileBottomBarSummaryText">
              <strong>{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</strong>
              <span>{toPrice(totalCents)}</span>
            </span>
            <span className={`mobileBottomBarChevron${isOrderSheetOpen ? ' expanded' : ''}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>

          {isOrderSheetOpen ? (
            <div className="orderDrawerPanel" id="order-drawer-panel">
              <div className="orderDrawerHeader">
                <div>
                  <p className="eyebrow">Your cart</p>
                  <h2>Review your order</h2>
                </div>
                <button
                  className="drawerCloseButton"
                  type="button"
                  onClick={() => setIsOrderSheetOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="stack">
                {selectedItems.length === 0 ? (
                  <p>No items selected yet.</p>
                ) : (
                  selectedItems.map((item) => (
                    <div className="summaryRow" key={item.itemId}>
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <strong>{toPrice(item.quantity * item.priceCents)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div className="summaryRow total">
                <span>Total</span>
                <strong>{toPrice(totalCents)}</strong>
              </div>

              <div className="formField">
                <label htmlFor="order-note">Note for the cafe</label>
                <textarea
                  id="order-note"
                  name="note"
                  rows={4}
                  placeholder="Extra hot, less sugar, no onions..."
                  disabled={previewMode}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              <div className="formFooter">
                <FormActionButton
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
                <p className="statusMessage error">{state.message}</p>
              ) : null}
            </div>
          ) : (
            <button
              className="button"
              type="button"
              disabled={previewMode || selectedItems.length === 0}
              onClick={() => setIsOrderSheetOpen(true)}
            >
              {previewMode ? 'Preview mode' : 'Place order'}
            </button>
          )}
        </div>

        {categorySections.length > 1 && !isOrderSheetOpen ? (
          <div className={`menuNavigator${isNavigatorOpen ? ' open' : ''}`}>
            {isNavigatorOpen ? (
              <div className="menuNavigatorPanel" aria-label="Menu sections">
                <p className="menuNavigatorLabel">Jump to section</p>
                <div className="menuNavigatorList">
                  {categorySections.map((category) => (
                    <button
                      key={category.id}
                      className={`menuNavigatorItem${
                        activeCategoryId === category.id ? ' active' : ''
                      }`}
                      type="button"
                      onClick={() => jumpToCategory(category.id, category.anchorId)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              className="menuNavigatorToggle"
              type="button"
              aria-expanded={isNavigatorOpen}
              aria-label={
                isNavigatorOpen
                  ? 'Close menu section navigator'
                  : 'Open menu section navigator'
              }
              onClick={() => setIsNavigatorOpen((current) => !current)}
            >
              <svg
                className="menuNavigatorToggleIcon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h10" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </form>
  )
}
