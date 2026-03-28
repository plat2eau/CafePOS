'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient()

    await supabase.auth.signOut()
    await fetch('/api/admin/session', {
      method: 'DELETE'
    })

    startTransition(() => {
      router.replace('/admin/login')
      router.refresh()
    })
  }

  return (
    <button
      className={`button buttonSecondary${isPending ? ' buttonLoading' : ''}`}
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <>
          <span className="buttonSpinner" aria-hidden="true" />
          Signing out...
        </>
      ) : (
        'Sign out'
      )}
    </button>
  )
}
