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
    const exp = Math.floor(Date.now() / 1000) + 2 * 60 * 60 // 2h
    const payload = { ...body, tableId, exp }
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(SECRET)
    return { token, expiresAt: new Date(exp * 1000).toISOString() }
  })
}

export default guestRoutes