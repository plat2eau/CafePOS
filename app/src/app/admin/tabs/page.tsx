import AdminTabsClient from '@/components/AdminTabsClient'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminTabsData } from '@/lib/admin-data'

export default async function AdminTabsPage() {
  const [, initialData] = await Promise.all([
    requireAdminAuth(),
    getAdminTabsData()
  ])

  return (
    <main>
      <section className="hero heroShell adminSessionsShell">
        <AdminTabsClient initialData={initialData} />
      </section>
    </main>
  )
}
