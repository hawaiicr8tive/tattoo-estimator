# Style Prediction Model

Internal / company-use trend cycle dashboard. Three tools behind one admin login:

| Route | What it is |
|---|---|
| `/` | **Dashboard** — popularity curves, momentum, saturation watch, lineage map, fusion lab, image generation |
| `/data` | **Trends editor** — hand-edit strands, curve points, triggers, cycle notes per industry; CSV-import the motif library |
| `/research` | **AI Research** — Claude suggests new strands grounded in the dataset; suggest-then-merge with confidence scores |

Industries currently active: Tattoo, Fashion, Walk-in / Flash, Hawaii Souvenir. Music + Interior are scaffolds you can fill in.

## Getting started

```bash
cp .env.example .env.local
# fill in values (see Environment variables below)
npm install
npm run dev
```

Open `http://localhost:3000`, sign in with your `ADMIN_PASSWORD`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Same Supabase project as the price estimator can be reused — different `admin_config` keys, no collision. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side only — bypasses RLS |
| `ADMIN_PASSWORD` | yes | Gates the entire app. Pick a strong random string. |
| `ANTHROPIC_API_KEY` | for AI Research + Fusion deep research | Anthropic API key |
| `GEMINI_API_KEY` | for Fusion Lab image generation | Google Gemini API key (Nano Banana 2) |

## Supabase setup

Run `supabase/migrations/002_admin_config.sql` against your Supabase project. Everything the dashboard saves lives in one `admin_config` table under namespaced keys:

- `trends:tattoo`, `trends:fashion`, `trends:walkin`, `trends:hawaii-souvenir` — per-industry strand datasets
- `trends:research-history` — Claude AI Research history
- `trends:fusion-history` — fusion deep-research analyses + generated image URLs
- `motif-library` — overlay on top of the seeded motif library

Generated flash images live in a `fusion-images` Supabase Storage bucket (auto-created on first generate).

## Relationship to the Tattoo Price Estimator

This project was forked from the `tattoo-estimator` codebase to live as a separate deploy. They share Supabase but have independent admin passwords, Vercel deploys, URLs, and feature sets.
