import cors from '@fastify/cors'
import { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Table-Session', 'X-Admin-Session'],
    credentials: true,
    exposedHeaders: ['*']
  })
}

export default corsPlugin