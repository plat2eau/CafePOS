import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/config'
import type { Database } from '@/lib/database.types'

function getServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  return serviceRoleKey
}

export function createServerSupabaseClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    getServiceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}
