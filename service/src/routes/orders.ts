import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import menuData from '../../data/menu.json'

// In-memory store (replace with DB later)
const orders: Array<{ id: string; tableId: number; createdAt: string; totalCents: number; items: Array<{ itemId: string; name: string; qty: number; priceCents: number }>; note?: string }> = []

// Menu lookup
const itemMap = new Map(menuData.items.map(i => [i.id, i]))

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orders', async (req, reply) => {
    const schema = z.object({
      items: z.array(z.object({ itemId: z.string(), qty: z.number().int().min(1) })),
      note: z.string().optional()
    })
    const body = schema.parse(req.body)
    const user = req.user!
    let totalCents = 0
    const orderItems = body.items.map(({ itemId, qty }) => {
      const item = itemMap.get(itemId)
      if (!item) throw fastify.httpErrors.badRequest(`Invalid itemId: ${itemId}`)
      const priceCents = item.priceCents
      totalCents += priceCents * qty
      return { itemId, name: item.name, qty, priceCents }
    })
    const order = {
      id: Date.now().toString(),
      tableId: user.tableId,
      createdAt: new Date().toISOString(),
      totalCents,
      items: orderItems,
      note: body.note
    }
    orders.push(order)
    return order
  })

  fastify.get('/tables/:tableId/orders', async (req) => {
    const tableId = Number((req.params as { tableId: string }).tableId)
    return orders.filter(o => o.tableId === tableId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })
}

export default ordersRoutes