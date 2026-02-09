import { getAdminSession } from './adminSession'

const API_BASE = 'http://127.0.0.1:3001'

export async function adminFetchJson(input: RequestInfo | URL, init: RequestInit = {}) {
  let url = input
  if (typeof url === 'string' && url.startsWith('/')) {
    url = API_BASE + url
  }
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')

  const sess = getAdminSession()
  if (sess?.token) {
    headers.set('X-Admin-Session', sess.token)
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
    const err = new Error(body?.error?.message || `HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}
