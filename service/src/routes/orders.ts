import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
// In-memory store lives on fastify.store

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orders', { preHandler: fastify.authenticate }, async (req, reply) => {
    const schema = z.object({
      items: z.array(z.object({ itemId: z.string(), qty: z.number().int().min(1) })),
      note: z.string().optional()
    })
    const body = schema.parse(req.body)
    const user = req.user!
    let totalCents = 0
    const orderItems = body.items.map(({ itemId, qty }) => {
      const item = fastify.store.itemMap.get(itemId)
      if (!item) throw fastify.httpErrors.badRequest(`Invalid itemId: ${itemId}`)
      const priceCents = item.priceCents
      totalCents += priceCents * qty
      return { itemId, name: item.name, qty, priceCents }
    })
    const order = {
      id: Date.now().toString(),
      tableId: user.tableId,
      sessionId: user.sessionId,
      createdAt: new Date().toISOString(),
      totalCents,
      items: orderItems,
      note: body.note
    }
    fastify.store.orders.push(order)
    fastify.adminWs.broadcast({ type: 'order.created', order })
    return order
  })

  fastify.get('/tables/:tableId/orders', { preHandler: fastify.authenticate }, async (req) => {
    const tableId = (req.params as { tableId: string }).tableId
    const sessionId = req.user?.sessionId
    return fastify.store.orders
      .filter(o => o.tableId === tableId && o.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })
}

export default ordersRoutes