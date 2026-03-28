import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/config'
import type { Database } from '@/lib/database.types'

export function createServerSupabaseClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}
