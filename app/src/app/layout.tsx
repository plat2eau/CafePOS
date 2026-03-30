import type { Metadata } from 'next'
import ThemeToggle from '@/components/ThemeToggle'
import { defaultColorScheme, getColorSchemeBootScript } from '@/lib/color-schemes'
import './globals.css'

export const metadata: Metadata = {
  title: 'CafePOS',
  description: 'Fresh Next.js + Supabase rebuild for CafePOS'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-color-scheme={defaultColorScheme} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: getColorSchemeBootScript() }} />
        <ThemeToggle />
        {children}
      </body>
    </html>
  )
}
