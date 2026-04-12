export function getTableSessionCookieName(tableId: string) {
  return `cafepos-table-session-${tableId}`
}

export function getTableOrderIdentityCookieName(tableId: string) {
  return `cafepos-table-order-identity-${tableId}`
}

export function getTableSessionStorageKey(tableId: string) {
  return `cafepos-table-session-storage-${tableId}`
}

export function getTableSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  }
}

export type TableOrderIdentity = {
  name: string
  phone: string
}

export function serializeTableOrderIdentityCookie(identity: TableOrderIdentity) {
  return JSON.stringify(identity)
}

export function parseTableOrderIdentityCookie(value: string | undefined): TableOrderIdentity | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<TableOrderIdentity>
    const name = String(parsed.name ?? '').trim()
    const phone = String(parsed.phone ?? '').trim()

    if (!name || !/^\d{10}$/.test(phone)) {
      return null
    }

    return {
      name,
      phone
    }
  } catch {
    return null
  }
}
