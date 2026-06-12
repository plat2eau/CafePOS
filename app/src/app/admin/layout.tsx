import AdminGlobalNotifier from '@/components/AdminGlobalNotifier'
import AdminTopNavigator from '@/components/AdminTopNavigator'

export default function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminGlobalNotifier />
      <AdminTopNavigator />
      {children}
    </>
  )
}
