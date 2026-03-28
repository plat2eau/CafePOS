import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CafePOS',
  description: 'Fresh Next.js + Supabase rebuild for CafePOS'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

