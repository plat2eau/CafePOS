import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import SupabaseStatus from '@/components/SupabaseStatus'

const links = [
  {
    href: '/table/1',
    title: 'Guest Flow',
    description: 'Verify a guest, fetch the menu, and place orders for a table.'
  },
  {
    href: '/table/1/orders',
    title: 'Guest Order History',
    description: 'Review prior orders for the current active table session.'
  },
  {
    href: '/admin/login',
    title: 'Admin Login',
    description: 'Staff login backed by Supabase Auth.'
  },
  {
    href: '/admin/sessions',
    title: 'Admin Sessions',
    description: 'List active table sessions and manage orders.'
  }
]

export default function HomePage() {
  return (
    <main>
      <section className="hero heroShell">
        <div className="heroHeader">
          <p className="eyebrow">Fresh Start</p>
          <h1>CafePOS</h1>
          <p className="lead">
            We are rebuilding this project as a responsive web app with one codebase, less custom
            backend work, and a more reliable data layer.
          </p>
          <div className="metaPillRow">
            <span className="metaPill">Responsive-first layout</span>
            <span className="metaPill">Next.js app router</span>
            <span className="metaPill">Hosted Supabase backend</span>
          </div>
        </div>

        <div className="buttonRow">
          <Button asChild size="form" className="md:w-auto">
            <Link href="/table/1">Open guest flow</Link>
          </Button>
          <Button asChild variant="secondary" size="form" className="md:w-auto">
            <Link href="/admin/login">Open admin flow</Link>
          </Button>
        </div>

        <div className="grid">
          <SupabaseStatus />
          {links.map((link) => (
            <Card
              asChild
              key={link.href}
              className="flex flex-col gap-3 rounded-[18px] border-border bg-card p-[clamp(18px,2.8vw,24px)] shadow-none transition-[transform,box-shadow,border-color] hover:-translate-y-[2px] hover:border-[rgb(var(--accent-rgb)/0.35)] hover:shadow-[0_16px_32px_rgb(var(--shadow-rgb)/0.08)] [&_p]:leading-6 [&_p]:text-[var(--muted)]"
            >
              <Link href={link.href}>
                <p className="eyebrow">Route</p>
                <h2>{link.title}</h2>
                <p>{link.description}</p>
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
