import { useEffect, useState } from 'react'
import type { MenuData } from '../types/menu'
import { fetchJson } from '../utils/api'

export function useMenu(): { data: MenuData | null, isLoading: boolean, error: Error | null } {
  const [state, setState] = useState<{ data: MenuData | null; isLoading: boolean; error: Error | null }>({ data: null, isLoading: true, error: null })

  useEffect(() => {
    let mounted = true
    fetchJson('/api/v1/menu')
      .then(data => {
        if (mounted) setState({ data: data as MenuData, isLoading: false, error: null })
      })
      .catch(error => {
        if (mounted) setState({ data: null, isLoading: false, error })
      })
    return () => { mounted = false }
  }, [])

  return state
}
