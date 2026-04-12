import { SectionCard } from '@/components/ui/section-card'
import { SummaryRow } from '@/components/ui/summary-row'
import { publicEnv } from '@/lib/config'
import { getSchemaReadinessReport } from '@/lib/schema-readiness'

function maskProjectUrl(url: string) {
  try {
    const host = new URL(url).host
    return host
  } catch {
    return 'Invalid project URL'
  }
}

export default async function SupabaseStatus() {
  const projectUrl = publicEnv.supabaseUrl
  const report = await getSchemaReadinessReport()

  return (
    <SectionCard tone={report.ok ? 'support' : 'warning'}>
      <p className="eyebrow">Environment</p>
      <h2>Supabase Readiness</h2>
      <p>
        The app is configured to talk to <strong>{maskProjectUrl(projectUrl)}</strong>.
      </p>
      <p>
        Schema status:{' '}
        <strong>{report.ok ? 'ready for current app features' : 'migration update required'}</strong>
      </p>
      <div className="stack">
        {report.checks.map((check) => (
          <SummaryRow key={check.id}>
            <span>{check.label}</span>
            <span className={check.ok ? 'readinessBadge ready' : 'readinessBadge blocked'}>
              {check.ok ? 'Ready' : 'Needs fix'}
            </span>
          </SummaryRow>
        ))}
      </div>
      {!report.ok ? (
        <p className="finePrint">
          Apply the latest Supabase migrations to the connected project before running live trials.
        </p>
      ) : null}
    </SectionCard>
  )
}
