import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmptyStateCard } from '@/components/AppCards'
import AdminLoginForm from '@/components/AdminLoginForm'
import { SectionCard } from '@/components/ui/section-card'
import { getAdminAuthContext } from '@/lib/admin-auth'

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const auth = await getAdminAuthContext()

  if (auth) {
    redirect('/admin/sessions')
  }

  const { error } = await searchParams

  return (
    <main>
      <section className="hero heroShell">
        <div className="heroHeader compact">
          <Link className="backLink" href="/">
            ← Back to home
          </Link>
          <p className="eyebrow">Admin Auth</p>
          <h1>Staff login</h1>
          <p className="lead">
            Sign in with a Supabase Auth account that is also registered in `staff_profiles` so the
            admin routes stay restricted to cafe staff.
          </p>
        </div>

        <SectionCard
          className="mx-auto max-w-[760px] bg-[radial-gradient(circle_at_top_right,rgb(var(--accent-rgb)/0.08),transparent_34%),var(--card-bg-strong)]"
        >
          <p className="eyebrow">Secure access</p>
          <h2>Open the staff console</h2>
          <p>Use your staff credentials to enter the live sessions and order management area.</p>
          <AdminLoginForm initialError={error} />
        </SectionCard>

        <div className="compactGrid">
          <EmptyStateCard
            eyebrow="Required"
            title="Supabase Auth user"
            description="The email and password must belong to a valid user in your Supabase project."
            density="default"
          />
          <EmptyStateCard
            eyebrow="Required"
            title="Staff profile row"
            description="That user also needs a matching `staff_profiles.user_id` entry with `staff` or `admin`."
            density="default"
          />
        </div>
      </section>
    </main>
  )
}
