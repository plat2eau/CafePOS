'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getTableSessionStorageKey } from '@/lib/table-session'

type GuestSessionAutoResumeProps = {
  tableId: string
  activeSessionId: string | null
  canAccessOrdering: boolean
}

export default function GuestSessionAutoResume({
  tableId,
  activeSessionId,
  canAccessOrdering
}: GuestSessionAutoResumeProps) {
  const router = useRouter()
  const restoreAttemptedRef = useRef(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const storageKey = getTableSessionStorageKey(tableId)

    if (!activeSessionId) {
      window.localStorage.removeItem(storageKey)
      restoreAttemptedRef.current = false
      return
    }

    if (canAccessOrdering) {
      window.localStorage.setItem(storageKey, activeSessionId)
      restoreAttemptedRef.current = false
      return
    }

    if (restoreAttemptedRef.current) {
      return
    }

    const storedSessionId = window.localStorage.getItem(storageKey)

    if (storedSessionId !== activeSessionId) {
      return
    }

    restoreAttemptedRef.current = true
    let cancelled = false

    async function restoreGuestSession() {
      try {
        const response = await fetch(`/api/table/${tableId}/session/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: storedSessionId
          })
        })

        if (!response.ok) {
          window.localStorage.removeItem(storageKey)
          return
        }

        if (!cancelled) {
          startTransition(() => {
            router.refresh()
          })
        }
      } catch {
        window.localStorage.removeItem(storageKey)
      }
    }

    void restoreGuestSession()

    return () => {
      cancelled = true
    }
  }, [activeSessionId, canAccessOrdering, router, startTransition, tableId])

  return null
}
