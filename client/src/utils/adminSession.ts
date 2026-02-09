export type AdminSession = { token: string; role: 'admin' | 'staff' }

const KEY = 'admin_session'

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminSession
  } catch {
    return null
  }
}

export function setAdminSession(sess: AdminSession) {
  localStorage.setItem(KEY, JSON.stringify(sess))
}

export function clearAdminSession() {
  localStorage.removeItem(KEY)
}
