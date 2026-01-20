import data from '../mock/menu.json'
import { useEffect, useState } from 'react'
import type { MenuData } from '../types/menu'

export function useMenu(): { data: MenuData | null, isLoading: boolean, error: null } {
  const [state, setState] = useState<{ data: MenuData | null; isLoading: boolean }>({ data: null, isLoading: true })

  useEffect(() => {
    const t = setTimeout(() => {
      setState({ data: data as MenuData, isLoading: false })
    }, 500)
    return () => clearTimeout(t)
  }, [])

  return { data: state.data, isLoading: state.isLoading, error: null }
}
