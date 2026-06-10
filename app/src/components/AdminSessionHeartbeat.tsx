'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

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
      const result = await apiFetch<{ authenticated: boolean }>(
        '/api/admin/session',
        {
          method: 'GET',
          cache: 'no-store'
        },
        'Could not verify the admin session.'
      )

      if (cancelled) {
        return
      }

      if (!result.ok && result.status === 401) {
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
