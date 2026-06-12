'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { ButtonSpinner } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-client'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export type AdminProfileMenuAuth = {
  displayName: string | null
  email: string | null
}

type AdminProfileMenuProps = {
  auth: AdminProfileMenuAuth | null
}

export default function AdminProfileMenu({ auth }: AdminProfileMenuProps) {
  const menuId = useId()
  const pathname = usePathname()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const userName = auth?.displayName?.trim() || auth?.email?.trim() || 'Staff'

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient()

    setIsOpen(false)
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

  if (!auth) {
    return null
  }

  return (
    <div className="adminProfileMenu" ref={containerRef}>
      <button
        className="adminProfileMenuTrigger"
        type="button"
        aria-label={`Open profile menu for ${userName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Image
          className="adminProfileMenuAvatar"
          src="/default-admin-avatar.svg"
          alt=""
          width={44}
          height={44}
          priority
        />
      </button>

      {isOpen ? (
        <div className="adminProfileMenuPanel" id={menuId} role="menu" aria-label="Admin profile menu">
          <p className="adminProfileMenuGreeting" role="none">
            Hello, {userName}
          </p>
          <button
            className="adminProfileMenuSignOut"
            type="button"
            role="menuitem"
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
          </button>
        </div>
      ) : null}
    </div>
  )
}
