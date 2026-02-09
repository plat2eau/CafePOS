export type TableSession = {
  sessionId: string
  tableId: string
  name: string
  phone: string
  createdAt: string
  lastActiveAt: string
}

export type OrderItem = { itemId: string; name: string; qty: number; priceCents: number }

export type Order = {
  id: string
  tableId: string
  sessionId?: string
  createdAt: string
  totalCents: number
  items: OrderItem[]
  note?: string
}

export type Store = {
  allowedTableIds: string[]
  sessionsByTableId: Map<string, TableSession>
  orders: Order[]
  itemMap: Map<string, { id: string; name: string; priceCents: number }>
}

export function createStore(params: {
  allowedTableIds: string[]
  itemMap: Store['itemMap']
}): Store {
  return {
    allowedTableIds: params.allowedTableIds,
    sessionsByTableId: new Map(),
    orders: [],
    itemMap: params.itemMap
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    store: Store
  }
}
