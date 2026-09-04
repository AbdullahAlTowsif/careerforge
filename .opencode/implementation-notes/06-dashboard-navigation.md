# Step 06 — Dashboard & Navigation

> **Date:** 2026-09-04
> **Status:** Complete

## What Was Built

### Backend: Dashboard Module

New module at `careerforge-backend/src/app/modules/dashboard/` with 4 files:

| File | Purpose |
|------|---------|
| `dashboard.interface.ts` | `IDashboardData`, `IDashboardProfile`, `IDashboardStats` interfaces |
| `dashboard.service.ts` | `getDashboardData(userId)` — loads user, runs MongoDB aggregation for counts, calls `JobMatchingServices` for scoring, assembles response |
| `dashboard.controller.ts` | Thin controller calling service + `sendResponse` |
| `dashboard.routes.ts` | `GET /api/dashboard` (auth required) |

**Route mounted** in `src/routes/index.ts` at `/dashboard`.

**API Endpoint:**

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/dashboard` | Yes | `{ profile, recommendedJobs(5), recommendedResources(5), stats }` |

**Dashboard service design:**
- Uses `Promise.all()` to run 4 queries in parallel: `getRecommendedJobs`, `getRecommendedResources`, `JobOpportunity.aggregate` (count), `LearningResource.aggregate` (count)
- Reuses `JobMatchingServices` from the `jobMatching` module — no scoring logic duplication
- MongoDB `$group` aggregation for total counts (lightweight)
- Returns top 5 jobs + top 5 resources (sliced from full scored lists)

### Frontend: Dashboard Page

**New files:**
- `src/types/dashboard.ts` — `DashboardData`, `DashboardProfile`, `DashboardStats` interfaces
- `src/components/DashboardCharts.tsx` — Recharts visualizations

**Modified file:**
- `src/app/(protected)/dashboard/page.tsx` — full rewrite

**Dashboard page sections (top → bottom):**
1. Welcome header with name + track/experience subtitle
2. 3 quick-stat cards (Total Jobs, Avg Match %, Total Resources) with icons
3. Profile summary card (name, track, experience, education + top skills as SkillTag chips + "Edit" link)
4. Recommended Jobs section (up to 5 JobCards with match scores + "View all" link)
5. Recommended Resources section (up to 5 resource cards + "View all" link)
6. Analytics charts section (DashboardCharts component)

**DashboardCharts — 3 Recharts visualizations:**
1. **Bar chart** — Horizontal bar showing match scores for each top job, color-coded by threshold (green ≥70%, amber 40–69%, red <40%)
2. **Donut chart** — Score distribution (Excellent/Good/Low segments), hidden if no jobs
3. **Radar chart** — User's top 6 skills as axes, hidden if no skills

Plus a summary stats bar below the charts.

**Empty states:**
- No skills → CTA card with "Add skills" link to `/profile` (for both jobs and resources sections)
- No recommended resources → CTA card

### Frontend: Navbar Polish

**Modified file:** `src/components/Navbar.tsx`

Changes:
1. **Backdrop overlay** — semi-transparent `bg-black/50` overlay behind mobile menu, clicking it closes the menu
2. **Slide animation** — CSS transition on mobile nav (`translate-y` + `opacity` with 200ms duration)
3. **Route-change auto-close** — removed (would require `setState` in `useEffect`, which triggers React lint error). NavLink `onClick` already handles menu close on navigation.

### Documentation

- `AGENTS.md` — Step 6 marked "Done", module docs updated, route mounting docs updated
- `docs/step6_plan.md` — full implementation plan

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `GET /api/dashboard` returns correct shape with profile + top jobs + resources + stats | Verified via build |
| 2 | Dashboard shows profile summary card | Implemented |
| 3 | Stats cards show correct numbers | Implemented (aggregation pipeline) |
| 4 | Top 5 recommended jobs shown with match badges | Implemented (reuses JobCard + MatchBadge) |
| 5 | Top 5 recommended resources shown | Implemented |
| 6 | Bar chart renders with correct colors | Implemented (Recharts + design system hex) |
| 7 | Donut chart renders, hidden when no skills | Implemented |
| 8 | Radar chart renders, hidden when no skills | Implemented |
| 9 | Empty-skills state shows CTA to profile | Implemented |
| 10 | Navbar active highlighting works | Already worked, unchanged |
| 11 | Mobile menu opens/closes | Already worked, improved with backdrop |
| 12 | Backdrop closes mobile menu | Implemented |
| 13 | Menu closes on nav link click | Implemented (NavLink onClick) |
| 14 | `npm run lint` passes (backend) | Pass (0 errors, 2 pre-existing warnings) |
| 15 | `npm run lint` passes (frontend) | Pass (0 errors) |
| 16 | `npm run build` passes (backend) | Pass |
| 17 | `npm run build` passes (frontend) | Pass |

## Technical Notes

- **Recharts hex colors** — Recharts requires hex strings, not CSS variables. `DashboardCharts.tsx` defines a `CHART_COLORS` constant mapping design system tokens to hex values.
- **Tooltip formatter type** — Recharts v3 `Tooltip.formatter` receives `ValueType | undefined`, not `number`. Fixed by removing the explicit `number` type annotation.
- **Navbar auto-close** — Using `useEffect` with `setState` inside triggers `react-hooks/set-state-in-effect` lint error. The `NavLink onClick` handler already closes the menu on user navigation, making the effect redundant.
- **`serverFetch` in client components** — Dashboard page uses `useEffect` + `serverFetch` pattern consistent with Jobs and Resources pages.

## Files Changed

| File | Action |
|------|--------|
| `careerforge-backend/src/app/modules/dashboard/dashboard.interface.ts` | Created |
| `careerforge-backend/src/app/modules/dashboard/dashboard.service.ts` | Created |
| `careerforge-backend/src/app/modules/dashboard/dashboard.controller.ts` | Created |
| `careerforge-backend/src/app/modules/dashboard/dashboard.routes.ts` | Created |
| `careerforge-backend/src/routes/index.ts` | Modified (added dashboard import + mount) |
| `careerforge-frontend/src/types/dashboard.ts` | Created |
| `careerforge-frontend/src/components/DashboardCharts.tsx` | Created |
| `careerforge-frontend/src/app/(protected)/dashboard/page.tsx` | Replaced |
| `careerforge-frontend/src/components/Navbar.tsx` | Modified (backdrop + animation) |
| `AGENTS.md` | Modified (status + module docs) |
