# CafePOS

Fresh restart of CafePOS using:

- Next.js for the app shell and routes
- Supabase for database, auth, and local development

## Project Layout

- `app`: Next.js application
- `supabase`: local Supabase config, migrations, and seed data

## UI Structure

The app UI layer is standardized around:

- `app/src/components/ui/*` for primitives
- `app/src/components/*` for app-level shared compositions
- route files for screen assembly

See [app/UI_COMPOSITION.md](app/UI_COMPOSITION.md) for the current defaults and the legacy patterns that should not be reintroduced.

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

## Debugging

VS Code debug profiles are included in `.vscode/launch.json`.

- `1. Start Next debug server (:3001)`: starts the app on `http://localhost:3001`.
- `2. Attach to Next worker process`: attaches to the Node worker process that is actually executing App Router server code.

Working flow:

1. Start `1. Start Next debug server (:3001)`.
2. Trigger the route once if needed so the worker process exists.
3. Run `2. Attach to Next worker process` and pick the active Next child process.
4. Trigger the request again with breakpoints enabled.

For `app/src/app/api/**/route.ts` breakpoints, trigger the matching HTTP method while the worker process is attached. For example, `app/src/app/api/admin/orders/route.ts` line 32 only runs for an authenticated `POST /api/admin/orders` request.

The debug config includes Turbopack source-map overrides. Because this repository keeps the Next app in `app/`, Turbopack paths are mapped to `${workspaceFolder}/app/*`.

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
