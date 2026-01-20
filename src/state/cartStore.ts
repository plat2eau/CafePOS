import { create } from 'zustand'

export type CartItem = {
  itemId: string
  name: string
  priceCents: number
  qty: number
}

export type CartState = {
  items: Record<string, CartItem>
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  increment: (itemId: string) => void
  decrement: (itemId: string) => void
  setQty: (itemId: string, qty: number) => void
  remove: (itemId: string) => void
  clear: () => void
  getList: () => CartItem[]
  subtotalCents: () => number
}

export const useCart = create<CartState>((set, get) => ({
  items: {},
  addItem: (item, qty = 1) =>
    set((state) => {
      const existing = state.items[item.itemId]
      const nextQty = (existing?.qty ?? 0) + qty
      return {
        items: {
          ...state.items,
          [item.itemId]: { ...item, qty: nextQty },
        },
      }
    }),
  increment: (itemId) =>
    set((state) => {
      const it = state.items[itemId]
      if (!it) return state
      return { items: { ...state.items, [itemId]: { ...it, qty: it.qty + 1 } } }
    }),
  decrement: (itemId) =>
    set((state) => {
      const it = state.items[itemId]
      if (!it) return state
      const next = it.qty - 1
      if (next <= 0) {
        const copy = { ...state.items }
        delete copy[itemId]
        return { items: copy }
      }
      return { items: { ...state.items, [itemId]: { ...it, qty: next } } }
    }),
  setQty: (itemId, qty) =>
    set((state) => {
      const it = state.items[itemId]
      if (!it) return state
      if (qty <= 0) {
        const copy = { ...state.items }
        delete copy[itemId]
        return { items: copy }
      }
      return { items: { ...state.items, [itemId]: { ...it, qty } } }
    }),
  remove: (itemId) =>
    set((state) => {
      const copy = { ...state.items }
      delete copy[itemId]
      return { items: copy }
    }),
  clear: () => set({ items: {} }),
  getList: () => Object.values(get().items),
  subtotalCents: () => get().getList().reduce((sum, it) => sum + it.priceCents * it.qty, 0),
}))
