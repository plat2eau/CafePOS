
export async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit & { tableId?: number } = {}
) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  const res = await fetch(input, { ...init, headers })
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
