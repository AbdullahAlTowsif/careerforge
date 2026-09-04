# Step 7: Polish & Documentation — Implementation Plan

> **Date:** 2026-09-04
> **Depends on:** Steps 1–6 (complete)
> **Phase:** 1, Step 7 of 7
> **No new npm packages required.**

---

## Step 7 Scope (from `project_plan_v1.md`)

- Update root `CAREER_FORGE.md` with actual setup commands and env notes
- Create `backend/.env.example` with all required variables documented
- Create `frontend/.env.local.example` with frontend variables
- Test full end-to-end flow: Register → Login → Build Profile → Browse Jobs → View Recommendations → Dashboard
- Fix any bugs found during testing
- Ensure consistent error handling across all endpoints

**Acceptance Criteria:**
- [ ] Full user flow works end-to-end
- [ ] Error messages are user-friendly
- [ ] Documentation is accurate and complete

---

## Already Verified Complete (no action needed)

- `careerforge-backend/.env.example` exists and documents all variables (Server, Database, Auth, Environment, Redis/Phase 2, AI/Phase 2, Stripe/Bonus, SSLCommerz/Bonus, Cloudinary/Phase 2, Sentry/Phase 2).
- `careerforge-frontend/.env.local.example` exists and documents `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`.
- Backend `globalErrorHandler` is consistent — covers `AppError`, mongoose `ValidationError`, `CastError`, duplicate-key (`E11000`), and JSON `SyntaxError`, with `stack` included only in development.

These Step 7 items are already satisfied and only need to be confirmed in the E2E pass.

---

## Project Review Findings

### Current state
- **Backend** (`careerforge-backend/`): Full modular MVC — `auth`, `user`, `jobOpportunity`, `learningResource`, `jobMatching`, `dashboard` modules are implemented (controller/service/routes; models + zod validation where owned). Routers mounted in `src/routes/index.ts` (`/auth`, `/profile`, `/jobs`, `/resources`, `/dashboard`). `npm run seed` is idempotent.
- **Frontend** (`careerforge-frontend/`): 7 pages (login, register, dashboard, jobs, `jobs/[id]`, resources, profile), 7 feature components + 13 shadcn `ui/` primitives, Navbar with active highlighting + mobile menu, `middleware.ts` route protection, `serverFetch` with automatic 401 → refresh → retry.

### Issues found during review
| # | Issue | Location |
|---|-------|----------|
| 1 | Raw hex colors + inline `style` bypass the design-system CSS tokens (violates AGENTS.md rule #9) | `src/components/DashboardCharts.tsx` |
| 2 | Silent `catch(() => {})` — non-401 fetch failures give no user feedback | `dashboard/page.tsx`, `jobs/page.tsx`, `resources/page.tsx` |
| 3 | `serverFetch` login redirect drops the `?from=` param (middleware preserves it) | `src/lib/serverFetch.ts` |
| 4 | Frontend `README.md` is still create-next-app boilerplate | `careerforge-frontend/README.md` |
| 5 | No human-facing root `README.md` (only the agent build spec) | repo root |
| 6 | `@types/node`, `@types/morgan` in `dependencies` (should be `devDependencies`); stub `test` script | `careerforge-backend/package.json` |
| 7 | `src/components/` is flat — no feature grouping | `careerforge-frontend/src/components/` |
| 8 | E2E flow not yet verified | — |

---

## Task 1 — Documentation

| File | Action |
|------|--------|
| `careerforge-frontend/README.md` | Rewrite the create-next-app boilerplate → CareerForge-specific: prerequisites (Node, MongoDB, Redis for Phase 2), env setup, `npm run dev`, `npm run seed`, folder map, key libraries. |
| `README.md` (repo root) | Create a concise human-facing overview: what CareerForge is (SDG 8), stack summary, monorepo layout, quickstart for both apps. |
| `CAREER_FORGE.md` | Fix any stale paths/commands discovered during the review; confirm the setup section reflects reality. |
| `.opencode/implementation-notes/07-polish-documentation.md` | Write the step-7 note (project convention — notes exist for steps 01–06). |

---

## Task 2 — Polish Fixes

1. **`DashboardCharts.tsx`** — replace raw hex colors and inline `style={{ color }}` with CSS-variable references (`var(--success)`, `var(--warning)`, `var(--destructive)`, `var(--primary)`, `var(--muted)`, `var(--border)`). Behavior stays identical.
2. **Silent catch blocks** in `dashboard/page.tsx`, `jobs/page.tsx`, `resources/page.tsx` → use `toast.error()` with a user-friendly message for non-401 failures (401 is already handled by `serverFetch`→`/login`).
3. **`serverFetch.ts`** — preserve the `?from=` query param when redirecting to `/login`.
4. **Backend `package.json`** — move `@types/node` and `@types/morgan` to `devDependencies`; remove the stub `test` script.
5. Fix any bugs found during the E2E pass (Task 3).

---

## Task 3 — End-to-End Verification (acceptance criteria)

Run backend (`npm run dev`) + frontend (`npm run dev`) + MongoDB, then verify:

1. **Register** → account created, cookies set
2. **Login** → cookie set, redirect to `/dashboard`
3. **Build profile** → add skills, career interests, experience notes, CV text; changes persist on refresh
4. **Browse Jobs** → list + filters (track, type, location, search) + job detail page
5. **Recommendations** → recommended jobs show score + matched skills; recommended resources show skill gaps
6. **Dashboard** → profile summary + quick stats + charts render with real data

Error-state checks:
- Wrong password → friendly error toast
- Duplicate email on register → friendly error toast
- Empty profile/skills → descriptive empty states with "Go to Profile" CTAs

---

## Task 4 — Components Refactor

Refactor `careerforge-frontend/src/components/` into a clean, scalable, feature-based structure:

```
components/
├── ui/                         # shadcn/ui primitives — unchanged
├── shared/                     # cross-feature presentational components
│   ├── Navbar.tsx              # ← from components/Navbar.tsx (app-shell)
│   └── SkillTag.tsx            # ← from components/SkillTag.tsx (jobs + dashboard + resources)
└── modules/                    # grouped by feature/domain
    ├── auth/                   # ← LogoutButton.tsx
    ├── jobs/                   # ← JobCard.tsx, MatchBadge.tsx
    ├── dashboard/              # ← DashboardCharts.tsx
    ├── profile/                # ← TagInput.tsx
    ├── resources/              # (empty now — Phase 2: ResourceCard, SkillGapSection)
    ├── resume/                 # (empty now — Phase 2: CV assistant widgets)
    └── ai/                     # (empty now — Phase 2: RoadmapTimeline, CareerBotWidget)
```

### File moves

| From | To |
|------|-----|
| `components/Navbar.tsx` | `components/shared/Navbar.tsx` |
| `components/SkillTag.tsx` | `components/shared/SkillTag.tsx` |
| `components/LogoutButton.tsx` | `components/modules/auth/LogoutButton.tsx` |
| `components/JobCard.tsx` | `components/modules/jobs/JobCard.tsx` |
| `components/MatchBadge.tsx` | `components/modules/jobs/MatchBadge.tsx` |
| `components/DashboardCharts.tsx` | `components/modules/dashboard/DashboardCharts.tsx` |
| `components/TagInput.tsx` | `components/modules/profile/TagInput.tsx` |

### Import updates (7 files)

| File | Updated imports |
|------|-----------------|
| `app/(protected)/layout.tsx` | `@/components/shared/Navbar` |
| `app/(protected)/dashboard/page.tsx` | `@/components/shared/SkillTag`, `@/components/modules/jobs/JobCard`, `@/components/modules/dashboard/DashboardCharts` |
| `app/(protected)/jobs/page.tsx` | `@/components/modules/jobs/JobCard`, `@/components/shared/SkillTag` |
| `app/(protected)/jobs/[id]/page.tsx` | verify (uses only `ui/`; no change expected) |
| `app/(protected)/profile/page.tsx` | `@/components/modules/profile/TagInput` |
| `components/shared/Navbar.tsx` | `@/components/modules/auth/LogoutButton` |
| `components/modules/jobs/JobCard.tsx` | `@/components/modules/jobs/MatchBadge`, `@/components/shared/SkillTag` |

Notes:
- `components/ui/` is untouched — its internal imports are unaffected.
- The `@/*` → `./src/*` alias (`tsconfig.json:22`) already supports the new paths; no config change needed.
- Component content is unchanged — this is a pure move + import-path refactor. No behavior or functionality changes.

---

## Task 5 — Verification

1. `npm run lint` + `npm run build` in **both** `careerforge-backend` and `careerforge-frontend`.
2. Smoke-test all pages after the refactor to confirm no broken imports or behavior changes.
3. Update `CAREER_FORGE.md` / `AGENTS.md` component-structure references if needed.

---

## Execution Order

1. **Tasks 1–2** — docs + polish fixes on current files
2. **Task 3** — E2E pass; any bug fixes flow into Task 2 or the refactor pass
3. **Task 4** — components refactor (merging any fixes made)
4. **Task 5** — final verify

---

## Acceptance Criteria (checklist)

- [ ] Backend `dist/` build passes; frontend `next build` passes
- [ ] Frontend lint passes (both apps)
- [ ] Full user flow works end-to-end (register → login → profile → jobs → recommendations → dashboard)
- [ ] Error messages are user-friendly (toasts, no silent failures)
- [ ] All components moved to feature folders; no stale imports
- [ ] Documentation is accurate and complete (root README, frontend README, CAREER_FORGE.md, step-7 note)
- [ ] Dashboard charts use design-system colors (no raw hex)