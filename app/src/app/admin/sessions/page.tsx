import Link from 'next/link'
import AdminSessionHeartbeat from '@/components/AdminSessionHeartbeat'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminConsole from '@/components/AdminConsole'
import { Button } from '@/components/ui/button'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  getAdminMenuCategories,
  getAdminMenuItems,
  getAdminOverviewData,
  getAdminTableOptions
} from '@/lib/admin-data'
import AdminPWAInstall from '@/components/AdminPWAInstall'

export default async function AdminSessionsPage() {
  const [auth, initialData, menuCategories, menuItems, tables] = await Promise.all([
    requireAdminAuth(),
    getAdminOverviewData(),
    getAdminMenuCategories(),
    getAdminMenuItems(),
    getAdminTableOptions()
  ])

  return (
    <main>
      <section className="hero heroShell adminSessionsShell">
        <AdminSessionHeartbeat />
        <AdminPWAInstall />
        <div className="adminSessionsTopAction">
          <AdminLogoutButton />
        </div>
        <div className="heroHeader compact">
          <Link className="backLink" href="/admin/login">
            ← Back to login
          </Link>
          <p className="eyebrow">Admin Ops</p>
          <h1>Active sessions</h1>
          <p className="lead">
            Track active tables, follow incoming orders, and manage each occupied table directly from this live operations screen.
          </p>
          <div className="toolbar md:flex-row">
            <Button asChild variant="secondary" size="form" className="md:w-auto">
              <Link href="/admin/dashboard">View analytics dashboard</Link>
            </Button>
          </div>
          <div className="metaPillRow">
            <span className="metaPill">
              Signed in as {auth.profile.display_name ?? auth.email ?? 'Staff'}
            </span>
          </div>
        </div>

        <AdminConsole
          initialData={initialData}
          menuCategories={menuCategories}
          menuItems={menuItems}
          tables={tables}
        />
      </section>
    </main>
  )
}
