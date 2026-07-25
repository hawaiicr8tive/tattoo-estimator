# Style Prediction Model

Internal / company-use trend cycle dashboard. Three tools behind a per-user login:

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

Open `http://localhost:3000`. Leave the email field blank and enter your
`ADMIN_PASSWORD` to sign in as the built-in owner, then add teammates under
**Controls → Users**.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Same Supabase project as the price estimator can be reused — different `admin_config` keys, no collision. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side only — bypasses RLS |
| `ADMIN_PASSWORD` | yes | The built-in owner account, and the default cookie-signing secret. Pick a strong random string. |
| `SESSION_SECRET` | no | Signs session cookies. Defaults to `ADMIN_PASSWORD`; set it separately if you want to rotate the owner password without signing everyone out. |
| `ANTHROPIC_API_KEY` | for AI Research + Fusion deep research | Anthropic API key |
| `GEMINI_API_KEY` | for Fusion Lab image generation | Google Gemini API key (Nano Banana 2) |

## Users and permissions

Everyone signs in with their own email and password. Accounts live in
`admin_config['users']`; passwords are stored as salted scrypt hashes.

`ADMIN_PASSWORD` remains a built-in **owner** account that is not stored in the
database and cannot be deleted or disabled — so you can always get back in and
repair the user list, even if every stored account is locked out.

Each user has a role, which sets a baseline, plus optional per-user overrides:

| Role | Baseline |
|---|---|
| **Admin** | Everything, including user management |
| **Member** | All pages, single-image generation, library curation — no bulk batches |
| **Guest** | Read-only: Dashboard, Trends, Library |

Individual permissions can be granted or revoked per user from **Controls →
Users** — click a permission to cycle it between inheriting the role, an
explicit grant, and an explicit revoke. A revoke always beats a grant.

Tabs a user can't access are hidden from the nav, and every page and API route
re-checks server-side, so hiding a tab is presentation rather than enforcement.
Disabling a user, changing their role, or changing their password takes effect
on their next request.

Run `npm test` to exercise the permission and session logic.

## Supabase setup

Run `supabase/migrations/002_admin_config.sql` against your Supabase project. Everything the dashboard saves lives in one `admin_config` table under namespaced keys:

- `trends:tattoo`, `trends:fashion`, `trends:walkin`, `trends:hawaii-souvenir` — per-industry strand datasets
- `trends:research-history` — Claude AI Research history
- `trends:fusion-history` — fusion deep-research analyses + generated image URLs
- `motif-library` — overlay on top of the seeded motif library
- `users` — user accounts, roles, and per-user permission overrides

Generated flash images live in a `fusion-images` Supabase Storage bucket (auto-created on first generate).

## Relationship to the Tattoo Price Estimator

This project was forked from the `tattoo-estimator` codebase to live as a separate deploy. They share Supabase but have independent admin passwords, Vercel deploys, URLs, and feature sets.
