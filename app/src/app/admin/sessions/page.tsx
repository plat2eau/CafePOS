import Link from 'next/link'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminConsole from '@/components/AdminConsole'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminOverviewData } from '@/lib/admin-data'

export default async function AdminSessionsPage() {
  const auth = await requireAdminAuth()
  const initialData = await getAdminOverviewData()

  return (
    <main>
      <section className="hero heroShell">
        <div className="heroHeader compact">
          <Link className="backLink" href="/admin/login">
            ← Back to login
          </Link>
          <p className="eyebrow">Admin Ops</p>
          <h1>Active sessions</h1>
          <p className="lead">
            Track active tables, follow incoming orders, and jump into a table to manage its flow.
          </p>
          <div className="metaPillRow">
            <span className="metaPill">
              Signed in as {auth.profile.display_name ?? auth.email ?? 'Staff'}
            </span>
          </div>
        </div>

        <div className="buttonRow">
          <AdminLogoutButton />
        </div>

        <AdminConsole initialData={initialData} />
      </section>
    </main>
  )
}
