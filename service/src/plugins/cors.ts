import cors from '@fastify/cors'
import { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      cb(null, true)
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Table-Session', 'X-Admin-Session'],
    exposedHeaders: ['*']
  })
}

export default corsPlugin