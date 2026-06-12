import AdminPurchasesClient from '@/components/AdminPurchasesClient'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminPurchasesData } from '@/lib/admin-data'

export default async function AdminPurchasesPage() {
  const [auth, initialData] = await Promise.all([
    requireAdminAuth(),
    getAdminPurchasesData()
  ])

  return (
    <main>
      <section className="hero heroShell adminSessionsShell">
        <div className="heroHeader compact">
          <p className="eyebrow">Admin Purchases</p>
          <h1>Purchases</h1>
          <p className="lead">
            Record vendor bills, reusable purchase items, and expense history.
          </p>
          <div className="metaPillRow">
            <span className="metaPill">
              Signed in as {auth.profile.display_name ?? auth.email ?? 'Staff'}
            </span>
          </div>
        </div>

        <AdminPurchasesClient initialData={initialData} />
      </section>
    </main>
  )
}
