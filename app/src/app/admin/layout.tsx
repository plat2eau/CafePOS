import AdminGlobalNotifier from '@/components/AdminGlobalNotifier'
import AdminTopNavigator from '@/components/AdminTopNavigator'
import { getAdminAuthContext } from '@/lib/admin-auth'

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const auth = await getAdminAuthContext()

  return (
    <>
      <AdminGlobalNotifier />
      <AdminTopNavigator
        auth={
          auth
            ? {
                displayName: auth.profile.display_name,
                email: auth.email
              }
            : null
        }
      />
      {children}
    </>
  )
}
