import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminLoginForm from '@/components/AdminLoginForm'
import { getAdminAuthContext } from '@/lib/admin-auth'

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const auth = await getAdminAuthContext()

  if (auth) {
    redirect('/admin')
  }

  const { error } = await searchParams

  return (
    <main>
      <section className="hero heroShell">
        <div className="heroHeader compact">
          <Link className="backLink" href="/admin">
            ← Back to admin
          </Link>
          <p className="eyebrow">Admin Auth</p>
          <h1>Staff login</h1>
          <p className="lead">
            Sign in with a Supabase Auth account that is also registered in `staff_profiles` so the
            admin routes stay restricted to cafe staff.
          </p>
        </div>

        <article className="card sessionGateCard">
          <p className="eyebrow">Secure access</p>
          <h2>Open the staff console</h2>
          <p>Use your staff credentials to enter the live sessions and order management area.</p>
          <AdminLoginForm initialError={error} />
        </article>

        <div className="compactGrid">
          <article className="card">
            <p className="eyebrow">Required</p>
            <h2>Supabase Auth user</h2>
            <p>The email and password must belong to a valid user in your Supabase project.</p>
          </article>
          <article className="card">
            <p className="eyebrow">Required</p>
            <h2>Staff profile row</h2>
            <p>That user also needs a matching `staff_profiles.user_id` entry with `staff` or `admin`.</p>
          </article>
        </div>
      </section>
    </main>
  )
}
