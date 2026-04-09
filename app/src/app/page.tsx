import { redirect } from 'next/navigation'
import { getAdminAuthContext } from '@/lib/admin-auth'

export default async function HomePage() {
  const auth = await getAdminAuthContext()

  redirect(auth ? '/admin' : '/admin/login')
}
