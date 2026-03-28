import Link from 'next/link'
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
          <Link className="button" href="/table/1">
            Open guest flow
          </Link>
          <Link className="button buttonSecondary" href="/admin/login">
            Open admin flow
          </Link>
        </div>

        <div className="grid">
          <SupabaseStatus />
          {links.map((link) => (
            <Link key={link.href} className="card cardLink" href={link.href}>
              <p className="eyebrow">Route</p>
              <h2>{link.title}</h2>
              <p>{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
