'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonSpinner } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-client'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient()

    await supabase.auth.signOut().catch(() => undefined)
    await apiFetch<{ ok: boolean }>(
      '/api/admin/session',
      {
        method: 'DELETE'
      },
      'Could not clear the admin session.'
    )

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
