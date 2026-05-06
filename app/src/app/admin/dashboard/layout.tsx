import AdminGlobalNotifier from '@/components/AdminGlobalNotifier'

export default function AdminDashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminGlobalNotifier />
      {children}
    </>
  )
}
