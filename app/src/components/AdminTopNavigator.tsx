'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminProfileMenu, { type AdminProfileMenuAuth } from '@/components/AdminProfileMenu'

const adminTabs = [
  {
    href: '/admin/sessions',
    label: 'Active sessions'
  },
  {
    href: '/admin/purchases',
    label: 'Purchases'
  },
  {
    href: '/admin/dashboard',
    label: 'Analytics'
  }
]

function isActiveTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

type AdminTopNavigatorProps = {
  auth: AdminProfileMenuAuth | null
}

export default function AdminTopNavigator({ auth }: AdminTopNavigatorProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    for (const tab of adminTabs) {
      router.prefetch(tab.href)
    }
  }, [router])

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return null
  }

  return (
    <header className="adminTopNavigator" aria-label="Admin navigation">
      <div className="adminTopNavigatorBrandRow">
        <Link className="adminTopNavigatorLogo" href="/admin/sessions" aria-label="CafePOS admin home">
          <span className="adminTopNavigatorLogoFrame">
            <Image
              className="adminTopNavigatorLogoAsset adminTopNavigatorLogoAssetLight"
              src="/cheekoo-dark.png"
              alt=""
              fill
              sizes="260px"
              priority
            />
            <Image
              className="adminTopNavigatorLogoAsset adminTopNavigatorLogoAssetDark"
              src="/cheekoo-light.png"
              alt=""
              fill
              sizes="260px"
              priority
            />
          </span>
        </Link>
        <AdminProfileMenu auth={auth} />
      </div>

      <nav className="adminTopNavigatorTabs" aria-label="Admin sections">
        {adminTabs.map((tab) => {
          const active = isActiveTab(pathname, tab.href)

          return (
            <Link
              key={tab.href}
              className="adminTopNavigatorTab"
              data-active={active ? 'true' : undefined}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
