import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson } from '../utils/api'
import { clearSession, getSession, isExpired } from '../utils/tableSession'

export function useSessionHeartbeat(tableId: string | null, intervalMs = 5000) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!tableId) return

    const tick = async () => {
      const sess = getSession(tableId)
      if (!sess || isExpired(sess)) {
        clearSession(tableId)
        navigate(`/table/${tableId}`, { replace: true })
        return
      }

      try {
        await fetchJson(`/api/v1/tables/${tableId}/orders`, { tableId })
      } catch (err) {
        const e = err as { status?: number }
        if (e.status === 401 || e.status === 403) {
          clearSession(tableId)
          navigate(`/table/${tableId}`, { replace: true })
        }
      }
    }

    void tick()
    const id = window.setInterval(() => {
      void tick()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, navigate, tableId])
}
