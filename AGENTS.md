# CareerForge — Agent Instructions

## What This Is

AI-powered youth employment & career roadmap platform (SDG 8). Monorepo: `careerforge-backend/` (Express + TypeScript + MongoDB) and `careerforge-frontend/` (Next.js 16 App Router + Tailwind v4 + shadcn/ui).

## Current Status

| Phase | Step | What | Status |
|-------|------|------|--------|
| 1 | 1 | Project scaffolding & infrastructure | Done |
| 1 | 2 | Auth & User Management | Done |
| 1 | 3 | Profile & Skills | Not started |
| 1 | 4 | Seed Jobs & Resources + Pages | Not started |
| 1 | 5 | Basic Matching Logic | Not started |
| 1 | 6 | Dashboard & Navigation | Not started |
| 1 | 7 | Polish & Documentation | Not started |
| 2 | 8 | Redis + AI Infrastructure | Not started |
| 2 | 9–13 | AI features (skill extraction, roadmap, CareerBot, CV assistant, uploads) | Not started |
| Bonus | 14–17 | Payments, admin, analytics, i18n | Not started |

**Phase 1 must complete before Phase 2 starts.** Steps go top-to-bottom within each phase.

## Running the Project

```bash
# Backend (port 5000)
cd careerforge-backend
npm install
cp .env.example .env      # edit as needed
npm run dev                # tsx watch

# Frontend (port 3000)
cd careerforge-frontend
npm install
cp .env.local.example .env.local  # edit as needed
npm run dev                # next dev
```

No MongoDB required for Step 1 scaffolding verification (health check at `GET /`). MongoDB is required from Step 2 onward.

## Key Commands

| Command | Where | What it does |
|---------|-------|-------------|
| `npm run dev` | `careerforge-backend/` | Start backend with hot reload (tsx watch) |
| `npm run dev` | `careerforge-frontend/` | Start Next.js dev server |
| `npm run build` | `careerforge-backend/` | Compile TypeScript to `dist/` |
| `npm run lint` | `careerforge-backend/` | ESLint with typescript-eslint |
| `npm run lint` | `careerforge-frontend/` | ESLint with eslint-config-next |
| `npm run seed` | `careerforge-backend/` | Run seed script (Step 4 — currently empty, will fail) |

No test framework is installed. No CI/CD exists.

## Architecture Rules

### Backend MVC Pattern

Every feature is a self-contained folder under `careerforge-backend/src/app/modules/<name>/`:
- `<name>.controller.ts` — parse request, call service, call sendResponse
- `<name>.service.ts` — all business logic (never inline in controller)
- `<name>.routes.ts` — Express Router, imported by `src/routes/index.ts`
- `<name>.model.ts` — Mongoose schema (only if module owns a collection)
- `<name>.interface.ts` — TypeScript types
- `<name>.validation.ts` — Zod schemas, applied via `validateRequest` middleware
- `<name>.constant.ts` — module-specific constants

Cross-module code goes in `src/app/config/`, `src/app/errorHelpers/`, `src/app/helpers/`, `src/app/interfaces/`, `src/app/middlewares/`, or `src/app/utils/`.

### Backend → Frontend Proxy

Next.js proxies `/api/*` → `http://localhost:5000/api/*` via `next.config.ts` rewrites. Cookies stay same-origin. Never call the Express backend directly from frontend — the proxy handles it.

### Auth Model

- JWT access token (15 min) + refresh token (7 days) in **httpOnly cookies**
- Cookie name: `accessToken` (hardcoded in both `careerforge-backend/src/app/config/jwt.ts` and `careerforge-frontend/src/middleware.ts`)
- **No global auth store.** Session is the cookie itself.
- `serverFetch.ts` auto-refreshes on 401, redirects to `/login` if refresh fails
- Protected routes: `/dashboard`, `/jobs`, `/resources`, `/profile`, `/roadmap` (enforced in `careerforge-frontend/src/middleware.ts`)

### Frontend Conventions

- **All API calls** go through `src/lib/serverFetch.ts` — no direct `fetch()` in components
- **Forms** use React Hook Form + Zod via `@hookform/resolvers/zod`
- **Server components by default** — only add `'use client'` for forms, interactive widgets, charts
- **Styling** via Tailwind CSS + shadcn/ui components in `src/components/ui/`
- **Colors** from CSS variables in `globals.css` only — never raw hex in components
- **Notifications** via Sonner (`toast.success()`, `toast.error()`) — `<Toaster />` is in root layout
- **Charts** via Recharts (Step 6 onward)

### Error Response Format

All backend errors follow this shape:
```json
{
  "success": false,
  "message": "Human-readable message",
  "errorSources": [{ "path": "field.name", "message": "Specific error" }],
  "stack": "..."
}
```
`stack` is only included when `NODE_ENV=development`.

## Important Gotchas

1. **ESM everywhere.** Backend uses `"type": "module"` + `"module": "nodenext"`. All internal imports must use `.js` extensions: `import { env } from "./config/env.js"`.

2. **Zod version mismatch.** Backend uses `zod@4`, frontend uses `zod@3`. Schemas are not shareable between packages.

3. **Module folders are mostly empty under `src/app/modules/`.** `auth/` and `user/` are implemented (Step 2). The rest (jobOpportunity, learningResource, jobMatching, roadmap, careerBot, aiApi, payment, upload) are still empty.

4. **`src/routes/index.ts` wires module routers.** Only the auth router is mounted so far (`/api/auth`). When adding a module, you must import and mount its routes here.

5. **Seed script is broken.** `npm run seed` references `tsx ./seed/runSeed.ts` but the `seed/` directory is empty (Step 4).

6. **Frontend homepage is boilerplate.** `src/app/page.tsx` is still the default Next.js "edit page.tsx" placeholder.

7. **`express-session` is in dependencies but unused.** The project uses httpOnly cookies, not session middleware. This can be ignored or removed.

8. **`serverFetch` unwraps `{ data }` envelopes.** Backend sends `{ success, message, data }`, but `serverFetch` returns just `data` to the caller.

9. **`serverFetch` only works in browser context.** It calls `redirect()` from `next/navigation` which requires a browser. In future server components, use the fetch wrapper with care or call the API differently.

10. **No `.opencode/specs/` directory yet.** The `create-spec` command references it but it hasn't been created.

## Design System Colors

| Token | Hex | Use |
|-------|-----|-----|
| `--primary` | `#0D9488` (Deep Teal) | Buttons, links, navbar |
| `--secondary` | `#6366F1` (Soft Indigo) | AI features only |
| `--success` | `#10B981` (Emerald) | Match ≥70% |
| `--warning` | `#F59E0B` (Amber) | Match 40–69% |
| `--destructive` | `#EF4444` (Soft Red) | Match <40%, errors |

All mapped as HSL CSS variables in `careerforge-frontend/src/app/globals.css`. Components use Tailwind tokens (`bg-primary`, `text-destructive`), never raw hex.

## Reference Documents

- `CAREER_FORGE.md` — full build spec, stack, data models, API endpoints, agent rules
- `docs/project_plan_v1.md` — detailed step-by-step plan with file lists and acceptance criteria
- `.opencode/implementation-notes/01-project-scaffolding-infrastructure.md` — what was built in Step 1
