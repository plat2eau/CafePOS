# CafePOS

Fresh restart of CafePOS using:

- Next.js for the app shell and routes
- Supabase for database, auth, and local development

## Project Layout

- `app`: Next.js application
- `supabase`: local Supabase config, migrations, and seed data

## Run

Install dependencies:

```bash
npm install -w app
```

Create `app/.env.local` from `app/.env.example` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Do not expose it in browser code or client-side env vars.

Run the app:

```bash
npm run dev
```

If you are using Supabase locally, also start it with:

```bash
npx supabase start
```

Then reset the local database:

```bash
npx supabase db reset
```

## Schema Preflight

Open the home page after booting the app and check the `Supabase Readiness` card.

- `ready for current app features`: the connected Supabase project has the schema this app expects
- `migration update required`: at least one table/column is missing from the connected project

If you are pointing at a hosted Supabase project, apply the latest SQL there too before trials.

## Next Steps

1. Build guest table landing and session flow.
2. Read menu data from Supabase.
3. Add order placement and order history.
4. Add admin auth and session management.
