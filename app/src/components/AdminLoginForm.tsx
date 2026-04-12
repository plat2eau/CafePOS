'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonSpinner } from '@/components/ui/button'
import { FlashMessage } from '@/components/ui/flash-message'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type AdminLoginFormProps = {
  initialError?: string
}

function getErrorMessage(error?: string) {
  if (error === 'unauthorized') {
    return 'Please sign in with a staff account to open the admin area.'
  }

  return ''
}

export default function AdminLoginForm({ initialError }: AdminLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(getErrorMessage(initialError))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isBusy = isSubmitting || isPending

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.session) {
      setMessage(error?.message ?? 'Could not sign in right now.')
      setIsSubmitting(false)
      return
    }

    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      })
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      await supabase.auth.signOut()
      setMessage(payload?.message ?? 'This account is not allowed into the admin area.')
      setIsSubmitting(false)
      return
    }

    startTransition(() => {
      router.replace('/admin/sessions')
      router.refresh()
    })
  }

  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="staff@cafepos.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <div className="formActions">
        <Button
          type="submit"
          size="form"
          disabled={isBusy}
          aria-busy={isBusy}
          data-loading={isBusy ? 'true' : undefined}
        >
          {isBusy ? (
            <>
              <ButtonSpinner />
              Signing in...
            </>
          ) : (
            'Sign in to admin'
          )}
        </Button>
        <p className="formSupportText">
          Use a Supabase Auth user that also has a matching row in `staff_profiles`.
        </p>
      </div>

      {message ? <FlashMessage tone="error">{message}</FlashMessage> : null}
    </form>
  )
}
