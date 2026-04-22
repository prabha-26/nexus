# Nexus

Nexus is a Vite React frontend that talks directly to Supabase for auth and database access.
There is no custom Node or serverless backend in this project.

## Supabase Setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. In the Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
4. In Supabase Auth, enable the providers you want to use:
   Email
   Google
5. Add redirect URLs for local/dev and production:
   `http://localhost:3000`
   Your Vercel production URL

## Local Development

```bash
npm install
npm run dev
```

## Vercel Deployment

1. Import the repo into Vercel.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project environment variables.
3. Deploy with the default Vite settings, or run:

```bash
vercel --prod
```

Vercel should use:
- Build command: `npm run build`
- Output directory: `dist`
