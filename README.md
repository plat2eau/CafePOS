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
```

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

## Next Steps

1. Build guest table landing and session flow.
2. Read menu data from Supabase.
3. Add order placement and order history.
4. Add admin auth and session management.
