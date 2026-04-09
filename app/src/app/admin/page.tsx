import Link from 'next/link'
import AdminSessionHeartbeat from '@/components/AdminSessionHeartbeat'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminConsole from '@/components/AdminConsole'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminOverviewData } from '@/lib/admin-data'

export default async function AdminPage() {
  const auth = await requireAdminAuth()
  const initialData = await getAdminOverviewData()
  const signedInLabel = auth.profile.display_name ?? auth.email ?? 'Staff'

  return (
    <main>
      <section className="hero heroShell adminShell">
        <AdminSessionHeartbeat />

        <header className="adminTopBar">
          <div className="heroHeader compact adminTopBarIntro">
            <p className="eyebrow">Admin Ops</p>
            <h1>Open tables</h1>
            <p className="lead">
              Open any active table from the grid. New orders and service requests will appear as
              popup alerts.
            </p>
          </div>

          <div className="adminAccountRow">
            <span className="metaPill">Signed in as {signedInLabel}</span>
            <AdminLogoutButton />
          </div>
        </header>

        <AdminConsole initialData={initialData} />
      </section>

      <nav className="adminMobileFooter" aria-label="Admin mobile">
        <Link className="adminMobileNavItem active" href="/admin" aria-current="page">
          <span className="adminMobileNavIcon" aria-hidden="true">
            ▣
          </span>
          <span>Dashboard</span>
        </Link>
        <Link className="adminMobileNavItem" href="#tables-grid">
          <span className="adminMobileNavIcon" aria-hidden="true">
            ◫
          </span>
          <span>Tables</span>
        </Link>
        <Link className="adminMobileNavItem" href="/admin/login">
          <span className="adminMobileNavIcon" aria-hidden="true">
            ⇢
          </span>
          <span>Account</span>
        </Link>
      </nav>
    </main>
  )
}
