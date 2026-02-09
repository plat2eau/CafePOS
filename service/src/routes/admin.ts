import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { SignJWT } from 'jose'

const ADMIN_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'dev-admin-secret-change-me')

function assertAdminRole(role: 'admin' | 'staff', requireAdmin: boolean) {
  if (requireAdmin && role !== 'admin') {
    const err = new Error('Admin only') as Error & { statusCode?: number }
    err.statusCode = 403
    throw err
  }
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/admin/login', { preHandler: [] }, async (req) => {
    const schema = z.object({ pin: z.string().min(1) })
    const body = schema.parse(req.body)

    const staffPin = process.env.STAFF_PIN
    const adminPin = process.env.ADMIN_PIN

    const role: 'admin' | 'staff' | null =
      adminPin && body.pin === adminPin ? 'admin' :
        staffPin && body.pin === staffPin ? 'staff' :
          null

    if (!role) throw fastify.httpErrors.unauthorized('Invalid PIN')

    const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60
    const token = await new SignJWT({ role, exp })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(ADMIN_SECRET)

    return { token, role }
  })

  fastify.get('/admin/me', { preHandler: fastify.adminAuthenticate }, async (req) => {
    return { role: req.admin!.role }
  })

  fastify.get('/admin/table-sessions', { preHandler: fastify.adminAuthenticate }, async () => {
    return Array.from(fastify.store.sessionsByTableId.values())
  })

  fastify.post('/admin/table-sessions', { preHandler: fastify.adminAuthenticate }, async (req) => {
    assertAdminRole(req.admin!.role, false)

    const schema = z.object({ tableId: z.string().min(1), name: z.string().min(1), phone: z.string().regex(/^\d{10}$/) })
    const body = schema.parse(req.body)

    if (!fastify.store.allowedTableIds.includes(body.tableId)) {
      throw fastify.httpErrors.badRequest('Invalid tableId')
    }
    if (fastify.store.sessionsByTableId.has(body.tableId)) {
      throw fastify.httpErrors.badRequest('Table occupied')
    }

    const now = new Date().toISOString()
    const sessionId = crypto.randomUUID()
    const session = { sessionId, tableId: body.tableId, name: body.name, phone: body.phone, createdAt: now, lastActiveAt: now }
    fastify.store.sessionsByTableId.set(body.tableId, session)

    const exp = Math.floor(Date.now() / 1000) + 2 * 60 * 60
    const guestToken = await new SignJWT({ tableId: body.tableId, name: body.name, phone: body.phone, exp, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me'))

    fastify.adminWs.broadcast({ type: 'session.created', session })
    return { token: guestToken, expiresAt: new Date(exp * 1000).toISOString(), ...session }
  })

  fastify.post('/admin/table-sessions/:fromTableId/shift', { preHandler: fastify.adminAuthenticate }, async (req) => {
    assertAdminRole(req.admin!.role, false)

    const params = req.params as { fromTableId: string }
    const schema = z.object({ toTableId: z.string().min(1) })
    const body = schema.parse(req.body)

    const fromTableId = params.fromTableId
    const toTableId = body.toTableId

    if (!fastify.store.allowedTableIds.includes(toTableId)) throw fastify.httpErrors.badRequest('Invalid toTableId')
    if (fastify.store.sessionsByTableId.has(toTableId)) throw fastify.httpErrors.badRequest('Target table occupied')

    const session = fastify.store.sessionsByTableId.get(fromTableId)
    if (!session) throw fastify.httpErrors.notFound('No active session to shift')

    fastify.store.sessionsByTableId.delete(fromTableId)
    session.tableId = toTableId
    session.lastActiveAt = new Date().toISOString()
    fastify.store.sessionsByTableId.set(toTableId, session)

    for (const o of fastify.store.orders) {
      if (o.sessionId && o.sessionId === session.sessionId) {
        o.tableId = toTableId
      }
    }

    fastify.adminWs.broadcast({ type: 'session.shifted', fromTableId: 0 as unknown as number, toTableId: 0 as unknown as number, session })
    return session
  })

  fastify.post('/admin/table-sessions/:tableId/clear', { preHandler: fastify.adminAuthenticate }, async (req) => {
    assertAdminRole(req.admin!.role, false)

    const params = req.params as { tableId: string }
    const schema = z.object({
      reason: z.enum(['PAYMENT_DONE', 'OTHER']),
      note: z.string().optional()
    }).refine(v => (v.reason === 'OTHER' ? Boolean(v.note?.trim()) : true), { message: 'note required for OTHER', path: ['note'] })

    const body = schema.parse(req.body)
    const session = fastify.store.sessionsByTableId.get(params.tableId)
    if (!session) throw fastify.httpErrors.notFound('No active session')

    fastify.store.sessionsByTableId.delete(params.tableId)
    fastify.store.orders = fastify.store.orders.filter(o => o.sessionId !== session.sessionId)

    fastify.adminWs.broadcast({ type: 'session.cleared', tableId: 0 as unknown as number, reason: body.reason, note: body.note })
    return { ok: true }
  })

  fastify.get('/admin/orders', { preHandler: fastify.adminAuthenticate }, async (req) => {
    const q = req.query as { sessionId?: string; tableId?: string }
    let list = fastify.store.orders
    if (q.sessionId) list = list.filter(o => o.sessionId === q.sessionId)
    if (q.tableId) list = list.filter(o => o.tableId === q.tableId)
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  fastify.patch('/admin/orders/:id', { preHandler: fastify.adminAuthenticate }, async (req) => {
    assertAdminRole(req.admin!.role, false)

    const params = req.params as { id: string }
    const schema = z.object({
      items: z.array(z.object({ itemId: z.string(), qty: z.number().int().min(1) })),
      note: z.string().optional()
    })
    const body = schema.parse(req.body)

    const order = fastify.store.orders.find(o => o.id === params.id)
    if (!order) throw fastify.httpErrors.notFound('Order not found')

    let totalCents = 0
    const items = body.items.map(({ itemId, qty }) => {
      const item = fastify.store.itemMap.get(itemId)
      if (!item) throw fastify.httpErrors.badRequest(`Invalid itemId: ${itemId}`)
      totalCents += item.priceCents * qty
      return { itemId, name: item.name, qty, priceCents: item.priceCents }
    })

    order.items = items
    order.totalCents = totalCents
    order.note = body.note

    fastify.adminWs.broadcast({ type: 'order.updated', order })
    return order
  })

  fastify.delete('/admin/orders/:id', { preHandler: fastify.adminAuthenticate }, async (req) => {
    assertAdminRole(req.admin!.role, false)

    const params = req.params as { id: string }
    const idx = fastify.store.orders.findIndex(o => o.id === params.id)
    if (idx === -1) throw fastify.httpErrors.notFound('Order not found')
    fastify.store.orders.splice(idx, 1)
    fastify.adminWs.broadcast({ type: 'order.deleted', orderId: params.id })
    return { ok: true }
  })

  fastify.get('/admin/ws', { websocket: true, preHandler: [] }, async (connection, req) => {
    const token = (req.query as { token?: string })?.token
    if (!token) {
      connection.socket.close()
      return
    }

    const isOk = await new Promise<boolean>((resolve) => {
      const fakeReq = { headers: { 'x-admin-session': token } }
      const fakeReply = { unauthorized: () => resolve(false) }
      const done = () => resolve(true)

      try {
        ;(fastify.adminAuthenticate as unknown as (a: unknown, b: unknown, c: () => void) => void)(
          fakeReq,
          fakeReply,
          done
        )
      } catch {
        resolve(false)
      }
    })

    if (!isOk) {
      connection.socket.close()
      return
    }

    fastify.adminWs.addClient(connection.socket)
    connection.socket.on('close', () => fastify.adminWs.removeClient(connection.socket))
  })
}

export default adminRoutes
