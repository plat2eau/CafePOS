import { notFound } from 'next/navigation'
import AdminTabsClient from '@/components/AdminTabsClient'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getAdminTabDetailData } from '@/lib/admin-data'

type AdminTabDetailPageProps = {
  params: Promise<{
    tabId: string
  }>
}

export default async function AdminTabDetailPage({ params }: AdminTabDetailPageProps) {
  const { tabId } = await params
  const [, initialDetail] = await Promise.all([
    requireAdminAuth(),
    getAdminTabDetailData(tabId)
  ])

  if (!initialDetail) {
    notFound()
  }

  return (
    <main>
      <section className="hero heroShell adminSessionsShell">
        <AdminTabsClient initialDetail={initialDetail} />
      </section>
    </main>
  )
}
