'use client'

import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/config'
import type { Database } from '@/lib/database.types'

export function createBrowserSupabaseClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey
  )
}
