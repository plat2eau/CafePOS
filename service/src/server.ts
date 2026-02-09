import fastify from 'fastify'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import corsPlugin from './plugins/cors'
import sensible from '@fastify/sensible'
import authPlugin from './plugins/auth'
import websocket from '@fastify/websocket'
import storePlugin from './plugins/store'
import guestRoutes from './routes/guest'
import menuRoutes from './routes/menu'
import ordersRoutes from './routes/orders'
import { registerAdminWs } from './lib/adminWs'
import adminAuthPlugin from './plugins/adminAuth'
import adminRoutes from './routes/admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

async function main() {
  const server = fastify({
    logger: true
  })

  server.addHook('onSend', async (req, reply, payload) => {
    const origin = req.headers.origin as string | undefined
    if (origin) {
      reply.header('Access-Control-Allow-Origin', origin)
      reply.header('Vary', 'Origin')
      reply.header('Access-Control-Allow-Credentials', 'true')
    }
    return payload
  })

  // Plugins
  await server.register(corsPlugin)
  await server.register(sensible)
  await server.register(storePlugin)
  await server.register(authPlugin)
  await server.register(adminAuthPlugin)
  await server.register(websocket)
  await registerAdminWs(server)

  // Routes
  await server.register(guestRoutes, { prefix: '/api/v1' })
  await server.register(menuRoutes, { prefix: '/api/v1' })
  await server.register(ordersRoutes, { prefix: '/api/v1' })
  await server.register(adminRoutes, { prefix: '/api/v1' })

  // Start
  const address = await server.listen({ port: process.env.PORT ? Number(process.env.PORT) : 3001, host: '0.0.0.0' })
  console.log(`Server listening at ${address}`)
}

main()
