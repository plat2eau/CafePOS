import type { FastifyInstance } from 'fastify'

export type AdminWsEvent =
  | { type: 'session.created'; session: unknown }
  | { type: 'session.shifted'; fromTableId: number; toTableId: number; session: unknown }
  | { type: 'session.cleared'; tableId: number; reason: string; note?: string }
  | { type: 'order.created'; order: unknown }
  | { type: 'order.updated'; order: unknown }
  | { type: 'order.deleted'; orderId: string }

type SocketLike = { send: (data: string) => void; readyState: number }

export function adminWsHub() {
  const clients = new Set<SocketLike>()

  function addClient(ws: SocketLike) {
    clients.add(ws)
    ws.send(JSON.stringify({ type: 'hello' }))
  }

  function removeClient(ws: SocketLike) {
    clients.delete(ws)
  }

  function broadcast(evt: AdminWsEvent) {
    const msg = JSON.stringify(evt)
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(msg)
    }
  }

  return { addClient, removeClient, broadcast }
}

declare module 'fastify' {
  interface FastifyInstance {
    adminWs: ReturnType<typeof adminWsHub>
  }
}

export async function registerAdminWs(fastify: FastifyInstance) {
  const hub = adminWsHub()
  fastify.decorate('adminWs', hub)
}
