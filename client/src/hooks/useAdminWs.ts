import { useEffect, useRef, useState } from 'react'
import { getAdminSession } from '../utils/adminSession'

type AdminWsEvent =
  | { type: 'hello' }
  | { type: 'session.created' }
  | { type: 'session.shifted' }
  | { type: 'session.cleared' }
  | { type: 'order.created' }
  | { type: 'order.updated' }
  | { type: 'order.deleted' }

export function useAdminWs(onEvent: (evt: AdminWsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const token = getAdminSession()?.token
    if (!token) return

    const wsUrl = `ws://127.0.0.1:3001/api/v1/admin/ws?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)

    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
    }
    ws.onclose = () => {
      setIsConnected(false)
    }
    ws.onerror = () => {
      setIsConnected(false)
    }
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data as string) as AdminWsEvent
        onEvent(data)
      } catch {
        return
      }
    }

    return () => {
      ws.close()
    }
  }, [onEvent])

  return { isConnected }
}

export function createThrottledAdminWsHandler(handler: (evt: AdminWsEvent) => void, windowMs = 5000) {
  let last = 0
  let timeout: number | null = null
  let pending: AdminWsEvent | null = null

  return (evt: AdminWsEvent) => {
    pending = evt
    const now = Date.now()
    const remaining = windowMs - (now - last)
    if (remaining <= 0) {
      last = now
      if (timeout) {
        window.clearTimeout(timeout)
        timeout = null
      }
      handler(evt)
      pending = null
      return
    }

    if (timeout) return
    timeout = window.setTimeout(() => {
      timeout = null
      last = Date.now()
      if (pending) handler(pending)
      pending = null
    }, remaining)
  }
}
