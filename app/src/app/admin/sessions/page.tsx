import AdminSessionHeartbeat from '@/components/AdminSessionHeartbeat'
import AdminConsole from '@/components/AdminConsole'
import { requireAdminAuth } from '@/lib/admin-auth'
import {
  getAdminMenuCategories,
  getAdminMenuItems,
  getAdminOverviewData,
  getAdminTableOptions
} from '@/lib/admin-data'

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
      <link rel="manifest" href="/manifest.json" />
      <section className="hero heroShell adminSessionsShell">
        <AdminSessionHeartbeat />
        <div className="heroHeader compact">
          <p className="eyebrow">Admin Ops</p>
          <h1>Active sessions</h1>
          <p className="lead">
            Track active tables and out checks, follow incoming orders, and manage live service from this operations screen.
          </p>
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
