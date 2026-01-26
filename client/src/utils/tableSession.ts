export type TableSession = { name: string; phone: string; tableId: number; expiresAt: string }

const keyFor = (tableId: number) => `table_sess_${tableId}`

export function getSession(tableId: number): TableSession | null {
  try {
    const raw = localStorage.getItem(keyFor(tableId))
    if (!raw) return null
    const s = JSON.parse(raw) as TableSession
    return s || null
  } catch {
    return null
  }
}

export function setSession(sess: TableSession) {
  localStorage.setItem(keyFor(sess.tableId), JSON.stringify(sess))
}

export function clearSession(tableId: number) {
  localStorage.removeItem(keyFor(tableId))
}

export function isExpired(sess: TableSession) {
  return new Date(sess.expiresAt).getTime() <= Date.now()
}
