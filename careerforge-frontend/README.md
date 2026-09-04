# CareerForge — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui client for the CareerForge platform — an AI-powered youth employment & career roadmap app aligned with **SDG 8**.

## Prerequisites

- Node.js 20+
- The backend API running on `http://localhost:5000` (see `careerforge-backend/README.md` or the root `README.md`)
- MongoDB running locally (seed data first with `npm run seed` in the backend)
- Redis is **not** required for Phase 1

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # edit as needed
npm run dev                        # http://localhost:3000
```

The Next.js dev server proxies all `/api/*` requests to the Express backend via `next.config.ts` rewrites, so cookies stay same-origin and no CORS handling is needed in the browser.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL used by the rewrite proxy (default `http://localhost:5000/api`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key — used at checkout (bonus feature) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend error reporting (Phase 2) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (eslint-config-next) |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                # login & register pages (no auth required)
│   ├── (protected)/           # dashboard, jobs, resources, profile (auth-gated)
│   ├── layout.tsx             # root layout (<Toaster /> mounted here)
│   └── globals.css            # Tailwind + design-system CSS variables
├── components/
│   ├── ui/                    # shadcn/ui primitives (button, card, input, etc.)
│   ├── shared/                # cross-feature components (Navbar, SkillTag)
│   └── modules/<feature>/     # feature components (auth, jobs, dashboard, profile)
├── lib/
│   ├── serverFetch.ts         # THE fetch wrapper — cookies, 401 refresh, redirect
│   ├── utils.ts               # cn() helper
│   └── validations/           # zod schemas for forms
├── types/                     # TS types mirroring the backend models
└── middleware.ts              # redirects unauthenticated users from protected routes
```

## Key Conventions

- **All API calls** go through `src/lib/serverFetch.ts` — never call `fetch()` directly in components.
- **No client-side auth store** — the session lives entirely in httpOnly cookies set by the backend.
- **Server components by default**; add `'use client'` only for forms/widgets/charts.
- **Forms** use React Hook Form + zod via `@hookform/resolvers/zod`.
- **Feedback** via Sonner toasts (`<Toaster />` is in the root layout).
- **Colors** come from CSS variables in `globals.css` only (`bg-primary`, `text-destructive`, etc.) — never raw hex in components.
- **Charts** via Recharts.

## Learn More

- Full build spec: `../CAREER_FORGE.md`
- Backend API (`careerforge-backend/`)
- Project plan & step docs: `../docs/`