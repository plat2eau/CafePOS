'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type GuestOrderHistoryPollerProps = {
  active?: boolean
  intervalMs?: number
}

export default function GuestOrderHistoryPoller({
  active = true,
  intervalMs = 5000
}: GuestOrderHistoryPollerProps) {
  const router = useRouter()

  useEffect(() => {
    if (!active) {
      return
    }

    let cancelled = false

    function refreshOrders() {
      if (cancelled || document.visibilityState !== 'visible') {
        return
      }

      router.refresh()
    }

    const interval = window.setInterval(refreshOrders, intervalMs)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshOrders()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active, intervalMs, router])

  return null
}
