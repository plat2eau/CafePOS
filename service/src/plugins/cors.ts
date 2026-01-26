import cors from '@fastify/cors'
import { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      cb(null, true)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Table-Session'],
    exposedHeaders: ['*']
  })
}

export default corsPlugin