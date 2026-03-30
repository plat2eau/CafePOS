import AdminGlobalNotifier from '@/components/AdminGlobalNotifier'

export default function AdminSessionsLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminGlobalNotifier />
      {children}
    </>
  )
}
