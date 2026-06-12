import AdminPurchasesClient from '@/components/AdminPurchasesClient'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminPurchasesData } from '@/lib/admin-data'

export default async function AdminPurchasesPage() {
  const [, initialData] = await Promise.all([
    requireAdminAuth(),
    getAdminPurchasesData()
  ])

  return (
    <main>
      <section className="hero heroShell adminSessionsShell">
        <AdminPurchasesClient initialData={initialData} />
      </section>
    </main>
  )
}
