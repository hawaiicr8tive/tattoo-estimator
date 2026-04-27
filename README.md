This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, copy `.env.example` to `.env.local` and fill in the required values (see [Environment variables](#environment-variables) below).

Then install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Routes

| Route | Who can see it | What it is |
|---|---|---|
| `/` | Public | Tattoo price estimator (lead form) |
| `/results` | Public (one-shot) | Estimate result page following a submission |
| `/embed` | Public | Iframe-embeddable estimator (for Wix etc.) |
| `/admin` | Admin password | Leads, pricing, styles, sizes, placements, artists, branding |

`/admin` is gated by an HTTP-only HMAC cookie set by `POST /api/admin/auth` and lasts 24 hours.

## Environment variables

Copy `.env.example` → `.env.local` and fill the values. All variables are read server-side except the two `NEXT_PUBLIC_*` Supabase keys.

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everything except `/` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything except `/` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server routes | Bypasses RLS — server-side only |
| `ADMIN_PASSWORD` | `/admin` | Picked by you; used to derive the session cookie HMAC |
| `RESEND_API_KEY` | Lead submission + verification | Resend API key |
| `STUDIO_EMAIL` | Lead notifications | Fallback if no studio email is set in `/admin → Leads` |

Supabase migrations live in `supabase/migrations/` — apply them in order before the first run.

## CI

GitHub Actions runs `npm run lint` and `npm run build` (with placeholder env values) on every push and PR. See `.github/workflows/ci.yml`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
