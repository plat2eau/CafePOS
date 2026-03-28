'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { publicEnv } from '@/lib/config'

function maskProjectUrl(url: string) {
  try {
    const host = new URL(url).host
    return host
  } catch {
    return 'Invalid project URL'
  }
}

export default function SupabaseStatus() {
  createBrowserSupabaseClient()
  const projectUrl = publicEnv.supabaseUrl

  return (
    <article className="card supportCard">
      <p className="eyebrow">Environment</p>
      <h2>Supabase Connection</h2>
      <p>
        The app is configured to talk to <strong>{maskProjectUrl(projectUrl)}</strong>.
      </p>
      <p>
        This confirms your publishable key and project URL are available to the browser app. The
        next step is using this client for real menu and session queries.
      </p>
    </article>
  )
}
