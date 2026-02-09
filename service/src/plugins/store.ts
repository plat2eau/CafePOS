import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { parseTableIds } from '../lib/config'
import { createStore } from '../lib/store'

const storePlugin: FastifyPluginAsync = async (fastify) => {
  const allowedTableIds = parseTableIds(process.env.TABLE_IDS)
  const menuData = (await import('../../data/menu.json', { assert: { type: 'json' } })).default as {
    items: Array<{ id: string; name: string; priceCents: number }>
  }

  const itemMap = new Map<string, { id: string; name: string; priceCents: number }>(
    menuData.items.map(i => [i.id, i])
  )
  const store = createStore({ allowedTableIds, itemMap })
  fastify.decorate('store', store)
}

export default fp(storePlugin, { name: 'store' })
