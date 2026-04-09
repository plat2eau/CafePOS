import AdminGlobalNotifier from '@/components/AdminGlobalNotifier'

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminGlobalNotifier />
      {children}
    </>
  )
}
