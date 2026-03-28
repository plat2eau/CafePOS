'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlaceOrderActionState } from '@/app/table/[tableId]/actions'
import FormActionButton from '@/components/FormActionButton'

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
  guestName
}: GuestOrderingExperienceProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(action, initialState)
  const [note, setNote] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [showSuccessCard, setShowSuccessCard] = useState(false)
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false)

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>(
      categories.map((category) => [category.id, []])
    )

    for (const item of items) {
      const list = map.get(item.category_id)
      if (list) {
        list.push(item)
      } else {
        map.set(item.category_id, [item])
      }
    }

    return map
  }, [categories, items])

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

          <article className="card menuIntroCard">
            <p className="eyebrow">Menu</p>
            <h2>What would you like today, {guestName}?</h2>
            <p>Choose your favourites below and adjust quantities as you go.</p>
          </article>

          <div className="grid">
            {categories.map((category) => (
              <article className="card" key={category.id}>
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
                              onClick={() => adjustQuantity(item.id, -1)}
                              aria-label={`Remove one ${item.name}`}
                            >
                              -
                            </button>
                            <span className="quantityValue">{quantity}</span>
                            <button
                              className="quantityButton"
                              type="button"
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
            ))}
          </div>
        </div>

        <div className={`mobileBottomBar${isOrderSheetOpen ? ' expanded' : ''}`}>
          <div className="mobileBottomBarSummary">
            <strong>{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</strong>
            <span>{toPrice(totalCents)}</span>
          </div>

          {isOrderSheetOpen ? (
            <div className="orderDrawerPanel">
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
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              <div className="formFooter">
                <FormActionButton
                  label="Place order"
                  loadingLabel="Placing order..."
                  disabled={selectedItems.length === 0}
                />
                <p className="finePrint">Your order will go straight to the cafe team.</p>
              </div>

              {state.status === 'error' ? (
                <p className="statusMessage error">{state.message}</p>
              ) : null}
            </div>
          ) : (
            <button
              className="button"
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => setIsOrderSheetOpen(true)}
            >
              Place order
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
