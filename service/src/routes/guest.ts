import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

const guestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/tables/:tableId/guest/verify', {
    preHandler: [] // No auth
  }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().regex(/^\d{10}$/)
    })
    const body = schema.parse(req.body)
    const { tableId: tableIdStr } = req.params as { tableId: string }
    const tableId = tableIdStr

    if (fastify.store.allowedTableIds.length > 0 && !fastify.store.allowedTableIds.includes(tableId)) {
      throw fastify.httpErrors.badRequest('Invalid tableId')
    }

    const existing = fastify.store.sessionsByTableId.get(tableId)
    const nowIso = new Date().toISOString()
    const sessionId = existing?.sessionId || crypto.randomUUID()

    fastify.store.sessionsByTableId.set(tableId, {
      sessionId,
      tableId,
      name: body.name,
      phone: body.phone,
      createdAt: existing?.createdAt || nowIso,
      lastActiveAt: nowIso
    })

    fastify.adminWs.broadcast({
      type: existing ? 'session.created' : 'session.created',
      session: fastify.store.sessionsByTableId.get(tableId)
    })

    const exp = Math.floor(Date.now() / 1000) + 2 * 60 * 60 // 2h
    const payload = { ...body, tableId, exp, sessionId }
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(SECRET)
    return { token, expiresAt: new Date(exp * 1000).toISOString() }
  })
}

export default guestRoutes