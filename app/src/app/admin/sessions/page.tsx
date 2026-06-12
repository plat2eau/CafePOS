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
  const [, initialData, menuCategories, menuItems, tables] = await Promise.all([
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
