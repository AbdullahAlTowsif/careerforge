# Step 07 — Polish & Documentation

> **Date:** 2026-09-04
> **Status:** Complete

## What Was Built

### Documentation

| File | Action |
|------|--------|
| `docs/step7_plan.md` | Created — full Step 7 plan (docs, polish fixes, E2E, components refactor) |
| `README.md` (repo root) | Created — human-facing overview, quickstart, commands, API table |
| `careerforge-frontend/README.md` | Replaced create-next-app boilerplate with CareerForge docs |
| `CAREER_FORGE.md` | Updated — setup commands now use real `careerforge-backend/` / `careerforge-frontend/` paths, env comments, folder diagram, `globals.css` reference, `serverFetch` path |
| `AGENTS.md` | Step 7 marked Done; feature-based component structure added to Frontend Conventions; reference docs updated |

### Polish Fixes

| File | Change |
|------|--------|
| `src/components/DashboardCharts.tsx` (→ `modules/dashboard/`) | Raw hex colors + inline `style={{ color }}` replaced with a `cssColor()` helper that resolves design-system CSS variables (`--success`, `--warning`, `--destructive`, `--primary`, `--border`, `--muted-foreground`) at runtime, with hex fallbacks for SSR. Removed unused `muted` token. |
| `src/app/(protected)/dashboard/page.tsx` | `.catch(() => {})` → `toast.error()` on dashboard load failure |
| `src/app/(protected)/jobs/page.tsx` | `toast.error()` on jobs-load and learning-recommendation load failures |
| `src/app/(protected)/resources/page.tsx` | `toast.error()` on resources-load failure |
| `src/lib/serverFetch.ts` | Login redirect now preserves the current path as `?from=` (matches `middleware.ts` behavior) |
| `careerforge-backend/package.json` | Moved `@types/node`, `@types/morgan` to `devDependencies`; removed stub `test` script |
| `careerforge-backend/package-lock.json` | Synced |

### E2E Verification (acceptance)

Backend run from compiled `dist/` against Atlas MongoDB (local Mongo on 27017). Full API flow verified:

| Check | Result |
|-------|--------|
| `GET /` health | `CareerForge API is running` |
| Register | 201 |
| Login | 200 (cookies set) |
| `GET /auth/me` | Returns user |
| `PUT /profile` (skills + track) | 200 |
| `GET /jobs` | 21 seeded jobs |
| `GET /jobs/recommended` | 21, top match 100% (`React.js Intern`, matched: React, JavaScript, HTML, CSS) |
| `GET /resources/recommended` | 4 recommendations |
| `GET /dashboard` | totals + avg match + 5 rec jobs + 4 rec resources |
| Wrong password | 401 "Invalid email or password" |
| Duplicate email | 409 "An account with email … already exists" |
| Bad job id | 404 "Job not found" |

### Components Refactor — Feature-Based Structure

`src/components/` restructured from flat into `ui/` + `shared/` + `modules/<feature>/`:

```
components/
├── ui/                                 # shadcn/ui primitives (unchanged)
├── shared/
│   ├── Navbar.tsx                      # ← components/Navbar.tsx
│   └── SkillTag.tsx                    # ← components/SkillTag.tsx
└── modules/
    ├── auth/LogoutButton.tsx           # ← components/LogoutButton.tsx
    ├── jobs/JobCard.tsx                # ← components/JobCard.tsx
    ├── jobs/MatchBadge.tsx             # ← components/MatchBadge.tsx
    ├── dashboard/DashboardCharts.tsx   # ← components/DashboardCharts.tsx
    ├── profile/TagInput.tsx            # ← components/TagInput.tsx
    ├── resources/.gitkeep              # Phase 2
    ├── resume/.gitkeep                 # Phase 2
    └── ai/.gitkeep                     # Phase 2
```

All moves done with `git mv` (rename history preserved). Imports updated in 7 files:

| File | Updated import |
|------|----------------|
| `app/(protected)/layout.tsx` | `@/components/shared/Navbar` |
| `app/(protected)/dashboard/page.tsx` | `@/components/shared/SkillTag`, `@/components/modules/jobs/JobCard`, `@/components/modules/dashboard/DashboardCharts` |
| `app/(protected)/jobs/page.tsx` | `@/components/modules/jobs/JobCard`, `@/components/shared/SkillTag` |
| `app/(protected)/profile/page.tsx` | `@/components/modules/profile/TagInput` |
| `components/shared/Navbar.tsx` | `@/components/modules/auth/LogoutButton` |
| `components/modules/jobs/JobCard.tsx` | `@/components/modules/jobs/MatchBadge`, `@/components/shared/SkillTag` |

`jobs/[id]/page.tsx` needed no change (uses only `ui/`). `components/ui/` untouched. The `@/*` → `./src/*` alias required no config change.

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Full user flow works end-to-end | Pass (E2E suite) |
| 2 | Error messages are user-friendly | Pass (401/409/404 + toasts) |
| 3 | Documentation is accurate and complete | Pass (root + frontend README, CAREER_FORGE.md, step7_plan.md, note 07) |
| 4 | Frontend components in feature-based structure | Pass |
| 5 | No stale `components/` imports | Pass (`rg` clean) |
| 6 | `npm run lint` passes (backend) | Pass (0 errors, 2 pre-existing warnings) |
| 7 | `npm run lint` passes (frontend) | Pass (0 errors) |
| 8 | `npm run build` passes (backend) | Pass |
| 9 | `npm run build` passes (frontend) | Pass |

## Technical Notes

- **CSS variables in Recharts** — Recharts renders to `<canvas>`, so it cannot read `var(--token)` strings. The `cssColor()` helper reads the computed CSS variable value from `document.documentElement` at runtime (client component) and falls back to the design-system hex values during SSR. Keeps one source of truth in `globals.css`.
- **`?from=` redirect** — `serverFetch` now redirects to `/login?from=<currentPath>` on refresh failure, so users land back on the page they intended after re-login (logic duplicated from `middleware.ts`, which the note documents).
- **`npm run build` (frontend)** — prints a Next.js 16 deprecation notice ("middleware → proxy") but compiles successfully. Migrating `middleware.ts` to the proxy convention is out of scope for Step 7 (action consistent with ignoring pre-existing deprecations).

## Files Changed

| File | Action |
|------|--------|
| `docs/step7_plan.md` | Created |
| `README.md` (root) | Created |
| `careerforge-frontend/README.md` | Replaced |
| `CAREER_FORGE.md` | Modified (paths, commands, env comments) |
| `AGENTS.md` | Modified (status, conventions, reference docs) |
| `careerforge-backend/package.json` | Modified (devDependencies reorg, removed test script) |
| `careerforge-backend/package-lock.json` | Modified |
| `src/lib/serverFetch.ts` | Modified (`?from=` redirect) |
| `src/app/(protected)/dashboard/page.tsx` | Modified (imports + toast) |
| `src/app/(protected)/jobs/page.tsx` | Modified (imports + toasts) |
| `src/app/(protected)/resources/page.tsx` | Modified (toast) |
| `src/components/{Navbar,SkillTag}.tsx` | Moved → `shared/` |
| `src/components/{LogoutButton,JobCard,MatchBadge,DashboardCharts,TagInput}.tsx` | Moved → `modules/<feature>/` |
| `src/components/modules/{resources,resume,ai}/.gitkeep` | Created (Phase 2 folders) |
| All moved components | Modified (internal import paths) |