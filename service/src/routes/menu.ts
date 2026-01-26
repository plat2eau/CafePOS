import { FastifyPluginAsync } from 'fastify'

import menuData from '../../data/menu.json'

const menuRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/menu', {
    preHandler: [] // No auth for menu
  }, async () => {
    return menuData
  })
}

export default menuRoutes