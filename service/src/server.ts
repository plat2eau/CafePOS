import fastify from 'fastify'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import corsPlugin from './plugins/cors'
import sensible from '@fastify/sensible'
import authPlugin from './plugins/auth'
import websocket from '@fastify/websocket'
import guestRoutes from './routes/guest'
import menuRoutes from './routes/menu'
import ordersRoutes from './routes/orders'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

async function main() {
  const server = fastify({
    logger: true
  })

  server.addHook('onRequest', (req, reply, done) => {
    reply.header('Access-Control-Allow-Origin', req.headers.origin || '*')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, X-Table-Session')
    if (req.method === 'OPTIONS') {
      reply.status(204).send()
      return
    }
    done()
  })

  // Plugins
  await server.register(corsPlugin)
  await server.register(sensible)
  await server.register(authPlugin)
  await server.register(websocket)

  // Routes
  await server.register(guestRoutes, { prefix: '/api/v1' })
  await server.register(menuRoutes, { prefix: '/api/v1' })
  await server.register(ordersRoutes, { prefix: '/api/v1' })

  // Start
  const address = await server.listen({ port: process.env.PORT ? Number(process.env.PORT) : 3001, host: '0.0.0.0' })
  console.log(`Server listening at ${address}`)
}

main()
