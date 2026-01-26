import { FastifyPluginAsync, preHandlerHookHandler } from 'fastify'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

declare module 'fastify' {
  interface FastifyRequest {
    user?: { tableId: number; name: string; phone: string; exp: number }
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const authHook: preHandlerHookHandler = async (req, reply) => {
    const token = req.headers['x-table-session'] as string | undefined
    if (!token) {
      return reply.unauthorized('Missing X-Table-Session header')
    }
    try {
      const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
      req.user = payload as { tableId: number; name: string; phone: string; exp: number }
      // Validate tableId matches route if applicable
      const tableIdParam = (req.params as { tableId?: string })?.tableId
      if (tableIdParam && req.user.tableId !== Number(tableIdParam)) {
        return reply.forbidden('Session table mismatch')
      }
    } catch (err) {
      return reply.unauthorized('Invalid token')
    }
  }

  fastify.decorateRequest('user', undefined)
  fastify.addHook('preHandler', authHook) // Apply globally; override with { preHandler: [] } if needed
}

export default authPlugin