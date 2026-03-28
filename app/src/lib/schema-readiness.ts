import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SchemaReadinessCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
}

export type SchemaReadinessReport = {
  ok: boolean
  checks: SchemaReadinessCheck[]
}

async function runCheck(
  id: string,
  label: string,
  query: () => PromiseLike<{ error: { message?: string } | null }>
): Promise<SchemaReadinessCheck> {
  const { error } = await query()

  if (error) {
    return {
      id,
      label,
      ok: false,
      detail: error.message ?? 'Query failed.'
    }
  }

  return {
    id,
    label,
    ok: true,
    detail: 'Ready'
  }
}

export async function getSchemaReadinessReport(): Promise<SchemaReadinessReport> {
  const supabase = createServerSupabaseClient()

  const checks = await Promise.all([
    runCheck('tables', 'Tables + menu schema', () =>
      supabase.from('tables').select('id, label, is_active').limit(1)
    ),
    runCheck('guest_sessions', 'Guest session schema', () =>
      supabase
        .from('table_sessions')
        .select('id, table_id, guest_name, guest_phone, status')
        .limit(1)
    ),
    runCheck('orders_archive', 'Orders archive schema', () =>
      supabase
        .from('orders')
        .select('id, table_id, session_id, status, archived_at')
        .limit(1)
    ),
    runCheck('staff_profiles', 'Admin staff profile schema', () =>
      supabase
        .from('staff_profiles')
        .select('user_id, role, display_name')
        .limit(1)
    ),
    runCheck('service_requests', 'Service request schema', () =>
      supabase
        .from('service_requests')
        .select('id, session_id, table_id, request_type, status')
        .limit(1)
    )
  ])

  return {
    ok: checks.every((check) => check.ok),
    checks
  }
}
