import { FastifyPluginAsync, preHandlerHookHandler } from 'fastify'
import fp from 'fastify-plugin'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'dev-admin-secret-change-me')

declare module 'fastify' {
  interface FastifyInstance {
    adminAuthenticate: preHandlerHookHandler
  }
  interface FastifyRequest {
    admin?: { role: 'admin' | 'staff'; exp: number }
  }
}

const adminAuthPlugin: FastifyPluginAsync = async (fastify) => {
  const authHook: preHandlerHookHandler = async (req, reply) => {
    const token = req.headers['x-admin-session'] as string | undefined
    if (!token) return reply.unauthorized('Missing X-Admin-Session header')

    try {
      const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
      req.admin = payload as { role: 'admin' | 'staff'; exp: number }
    } catch {
      return reply.unauthorized('Invalid token')
    }
  }

  fastify.decorateRequest('admin', undefined)
  fastify.decorate('adminAuthenticate', authHook)
}

export default fp(adminAuthPlugin, { name: 'adminAuth' })
