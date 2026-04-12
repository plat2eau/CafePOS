import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import ThemeToggle from '@/components/ThemeToggle'
import { defaultColorScheme, getColorSchemeBootScript } from '@/lib/color-schemes'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree'
})

export const metadata: Metadata = {
  title: 'CafePOS',
  description: 'Fresh Next.js + Supabase rebuild for CafePOS'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-color-scheme={defaultColorScheme}
      className={`${figtree.variable} ${figtree.className}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: getColorSchemeBootScript() }} />
        <ThemeToggle />
        {children}
      </body>
    </html>
  )
}
