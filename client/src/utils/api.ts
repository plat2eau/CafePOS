
import { getSession, isExpired } from './tableSession'

const API_BASE = 'http://localhost:3001'

export async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit & { tableId?: string } = {}
) {
  let url = input
  if (typeof url === 'string' && url.startsWith('/')) {
    url = API_BASE + url
  }
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  if (init.tableId) {
    const sess = getSession(init.tableId)
    if (sess && !isExpired(sess)) {
      headers.set('X-Table-Session', sess.token)
    }
  }
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    type ErrorBody = { error?: { code?: string; message?: string } }
    let body: ErrorBody | undefined
    try {
      body = (await res.json()) as ErrorBody
    } catch {
      body = undefined
    }
    const code = body?.error?.code
    const err = new Error(body?.error?.message || `HTTP ${res.status}`) as Error & { code?: string; status?: number }
    err.code = code
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}
