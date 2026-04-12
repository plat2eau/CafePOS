'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonSpinner } from '@/components/ui/button'
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
    <Button
      variant="secondary"
      size="form"
      className="md:w-auto"
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      aria-busy={isPending}
      data-loading={isPending ? 'true' : undefined}
    >
      {isPending ? (
        <>
          <ButtonSpinner />
          Signing out...
        </>
      ) : (
        'Sign out'
      )}
    </Button>
  )
}
