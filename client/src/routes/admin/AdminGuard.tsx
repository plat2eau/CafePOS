import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { adminFetchJson } from '../../utils/adminApi'
import { getAdminSession } from '../../utils/adminSession'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const sess = getAdminSession()
      if (!sess?.token) {
        setOk(false)
        return
      }
      try {
        await adminFetchJson('/api/v1/admin/me')
        if (!cancelled) setOk(true)
      } catch {
        if (!cancelled) setOk(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (ok === null) return null
  if (!ok) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
