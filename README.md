# ChapMee

ChapMee is a mobile-first PWA web app for text entertainment. The MVP foundation uses Next.js App Router, TypeScript, Tailwind CSS, ESLint, Prettier, Supabase-ready folders, and Vercel-friendly defaults.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy the example file and add your local Supabase project values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional but recommended for deployed builds and absolute links:

```bash
NEXT_PUBLIC_SITE_URL=
```

Do not commit `.env.local` or real Supabase keys.

## Vercel Deployment

Add the same environment variables in the Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Use the production site URL for `NEXT_PUBLIC_SITE_URL` so metadata, share links,
and canonical links resolve correctly.

Before testing the deployed app, apply the Supabase migrations to the target
project and confirm the schema is up to date. The app expects the database
tables, policies, and seed-ready structures from `supabase/migrations/`.

## Validation

Run lint checks:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Check formatting:

```bash
npm run format:check
```

## Seed demo data

ChapMee only seeds demo content after a real creator exists in Supabase.

1. Register or log in with a real user in the app.
2. Open `/me` and enable Creator Mode so `creator_profiles` exists.
3. Apply the latest migrations in `supabase/migrations/`.
4. Run `supabase/seed.sql` in Supabase Dashboard -> SQL Editor, or via the linked Supabase CLI workflow.
5. Run:

```sql
NOTIFY pgrst, 'reload schema';
```

6. Restart the local dev server with `npm run dev`.
7. Verify the seeded rows with the queries below.

```sql
select count(*) from genres;
select count(*) from tags;
select count(*) from stories;
select count(*) from episodes;
select count(*) from community_posts;
select count(*) from analytics_events;
```

The seed is safe for an existing project: it uses `insert ... on conflict`, does not create fake `auth.users`, does not drop or truncate tables, and stops with a clear error if no creator profile exists yet.

## Project Structure

```text
app/
components/
  layout/
  ui/
lib/
  supabase/
styles/
supabase/
  migrations/
types/
```
