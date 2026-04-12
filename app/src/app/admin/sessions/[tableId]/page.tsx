import { redirect } from 'next/navigation'

type AdminSessionDetailPageProps = {
  params: Promise<{
    tableId: string
  }>
}

export default async function AdminSessionDetailPage({
  params: _params
}: AdminSessionDetailPageProps) {
  redirect('/admin/sessions')
}
