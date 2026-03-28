'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type AdminSessionHeartbeatProps = {
  intervalMs?: number
}

export default function AdminSessionHeartbeat({
  intervalMs = 5 * 60 * 1000
}: AdminSessionHeartbeatProps) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      const response = await fetch('/api/admin/session', {
        method: 'GET',
        cache: 'no-store'
      }).catch(() => null)

      if (cancelled || !response) {
        return
      }

      if (response.status === 401) {
        router.replace('/admin/login?error=unauthorized')
        router.refresh()
      }
    }

    void checkSession()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkSession()
      }
    }

    const interval = window.setInterval(() => {
      void checkSession()
    }, intervalMs)

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs, router])

  return null
}
