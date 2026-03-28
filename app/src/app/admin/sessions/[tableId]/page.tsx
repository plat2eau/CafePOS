import AdminTableDetailClient from '@/components/AdminTableDetailClient'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminTableDetailData } from '@/lib/admin-data'

type AdminSessionDetailPageProps = {
  params: Promise<{
    tableId: string
  }>
}

export default async function AdminSessionDetailPage({
  params
}: AdminSessionDetailPageProps) {
  const auth = await requireAdminAuth()
  const { tableId } = await params
  const initialData = await getAdminTableDetailData(tableId)

  return (
    <main>
      <section className="hero heroShell">
        <AdminTableDetailClient
          tableId={tableId}
          signedInLabel={auth.profile.display_name ?? auth.email ?? 'Staff'}
          initialData={initialData}
        />
      </section>
    </main>
  )
}
