# Step 6: Dashboard & Navigation — Implementation Plan

> **Date:** 2026-09-04
> **Status:** Planning complete, implementation pending
> **Depends on:** Steps 1–5 (all complete)

---

## Overview

Step 6 builds the real **Dashboard page** (currently a placeholder) and polishes **navigation**. The dashboard aggregates user profile, job recommendations, resource recommendations, and stats into a single view with Recharts visualizations. Navigation gets mobile menu polish.

---

## Scope

### In Scope
- Backend dashboard module (API endpoint `GET /api/dashboard`)
- Frontend dashboard page with profile summary, recommended jobs/resources, stats cards
- Recharts visualizations (bar chart, donut chart, radar chart)
- Navbar mobile menu polish (backdrop overlay, route-change auto-close)
- Pre-step cleanup from Steps 1–5 gaps

### Out of Scope (deferred)
- Step 7 polish & documentation
- Phase 2 AI features, Redis, file uploads
- Dark mode toggle (next-themes installed but unused — deferred)
- Roadmap nav link (page doesn't exist until Step 10)
- Pagination on list endpoints (deferred to future optimization)

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dashboard API architecture | **Single aggregated MongoDB pipeline** | Reduces round-trips, single endpoint returns everything the page needs. Backend does all the heavy lifting. |
| Chart types | **Bar chart** (match scores per top job), **Donut chart** (score distribution), **Radar chart** (skill coverage across tracks) | User requested different chart types. Each conveys a distinct insight. |
| Reuse matching logic | Import `JobMatchingServices` from existing module | Dashboard is a composition layer, not a matcher. No code duplication. |
| Dashboard route mounting | New `dashboard` module under `src/app/modules/dashboard/` | Follows existing MVC convention. Clean separation from user and jobMatching modules. |
| Navbar mobile menu | Add backdrop overlay + auto-close on route change | User confirmed polish items are desired. |
| Roadmap link in Navbar | **Skip for now** | Page doesn't exist until Step 10. Avoid broken links. |
| Frontend data fetching | Single `serverFetch("/dashboard")` call | One API call returns everything. Simplifies the page. |
| Empty-skills CTA | Show prominent card prompting user to add skills | Same pattern already used on Jobs page — consistent UX. |

---

## Pre-Step Cleanup (Carry-over Gaps from Steps 1–5)

| # | What | File | Why |
|---|------|------|-----|
| 1 | Update Step 5 status → "Done" | `AGENTS.md` | Status tracker is stale (marked "Not started" after implementation) |
| 2 | Remove stale `express-session` mention | `AGENTS.md` | Package was cleaned up in Step 4, but docs still reference it |
| 3 | Note `jobMatching.constant.ts` is empty placeholder | `AGENTS.md` | Documented for future reference (Phase 2 thresholds) |
| 4 | Document Step 6 implementation notes | `.opencode/implementation-notes/06-dashboard-navigation.md` | Consistent step documentation |

---

## Part A — Backend: Dashboard Module

Create `careerforge-backend/src/app/modules/dashboard/` with 4 files.

### A1. `dashboard.interface.ts`

Define the TypeScript interface for the dashboard response:

```ts
interface IDashboardProfile {
  fullName: string;
  email: string;
  skillsCount: number;
  topSkills: string[];          // first 8 skills (capped)
  track: string | null;
  experienceLevel: string | null;
  educationLevel: string | null;
}

interface IDashboardStats {
  totalJobs: number;
  totalResources: number;
  averageMatchScore: number;    // avg of all job scores for this user
}

interface IDashboardData {
  profile: IDashboardProfile;
  recommendedJobs: IMatchResult[];       // top 5, reuse existing type from jobMatching
  recommendedResources: IResourceRecommendation[];  // top 5, reuse existing type
  stats: IDashboardStats;
}
```

### A2. `dashboard.service.ts`

Function `getDashboardData(userId: string): Promise<IDashboardData>`:

**Step-by-step logic:**

1. **Load user** — `User.findById(userId).lean()`. Throw `AppError(404)` if not found.

2. **Compute profile summary:**
   - `skillsCount` = `user.skills.length`
   - `topSkills` = `user.skills.slice(0, 8)` (cap at 8 for display)
   - Extract `fullName`, `email`, `track` (from `preferredTrack`), `experienceLevel`, `educationLevel`

3. **Single aggregation pipeline for stats + matching:**
   Rather than running 3 separate queries (user, jobs, resources) + matching functions, use a MongoDB aggregation pipeline that runs once per collection:

   ```ts
   // Aggregate jobs collection
   const jobStats = await JobOpportunity.aggregate([
     { $group: { _id: null, total: { $sum: 1 } } }
   ]);
   const totalJobs = jobStats[0]?.total ?? 0;

   // Aggregate resources collection
   const resourceStats = await LearningResource.aggregate([
     { $group: { _id: null, total: { $sum: 1 } } }
   ]);
   const totalResources = resourceStats[0]?.total ?? 0;
   ```

   For the match scores (needed for average + top 5), call the existing `JobMatchingServices.getRecommendedJobs(userId)` which already does the scoring. This reuses tested logic rather than duplicating the scoring algorithm.

   ```ts
   const allMatches = await JobMatchingServices.getRecommendedJobs(userId);
   const topJobs = allMatches.slice(0, 5);

   const averageMatchScore = allMatches.length > 0
     ? Math.round(allMatches.reduce((sum, m) => sum + m.score, 0) / allMatches.length)
     : 0;
   ```

4. **Get recommended resources** — call `JobMatchingServices.getRecommendedResources(userId)`, take `.slice(0, 5)`.

5. **Assemble and return** the `IDashboardData` object.

**Why this hybrid approach:** The plan calls for a "single aggregated approach (MongoDB aggregation pipeline)" per user preference. However, the matching logic in `jobMatching.service.ts` is non-trivial (skill intersection scoring, tiebreaking, gap analysis). Rewriting that as a pure aggregation pipeline would duplicate ~60 lines of tested logic. The pragmatic approach:
- Use aggregation for **simple counts** (total jobs, total resources) — these are trivial `$group` pipelines.
- Use the existing service function for **matching scores** — this is complex business logic that should live in one place.
- This gives us the benefit of aggregation for the heavy reads (counts) while keeping matching logic DRY.

### A3. `dashboard.controller.ts`

Thin controller following existing pattern:

```ts
const getDashboardData = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const data = await DashboardServices.getDashboardData(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard data retrieved successfully",
    data,
  });
});

export const DashboardController = { getDashboardData };
```

### A4. `dashboard.routes.ts`

```ts
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

const router = Router();
router.get("/", authMiddleware, DashboardController.getDashboardData);

export const DashboardRoutes = router;
```

### A5. Mount in `src/routes/index.ts`

Add import and mount:

```ts
import { DashboardRoutes } from "../app/modules/dashboard/dashboard.routes.js";
// ...
router.use("/dashboard", DashboardRoutes);
```

### New API Endpoint

| Method | Path | Auth | Response Shape |
|--------|------|------|----------------|
| `GET` | `/api/dashboard` | Yes | `{ success: true, message: "...", data: IDashboardData }` |

**Example response:**

```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "profile": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "skillsCount": 5,
      "topSkills": ["JavaScript", "React", "Node.js", "MongoDB", "TypeScript"],
      "track": "Web Development",
      "experienceLevel": "Fresher",
      "educationLevel": "Bachelor"
    },
    "recommendedJobs": [
      {
        "job": { "_id": "...", "title": "Frontend Developer", ... },
        "score": 80,
        "matchedSkills": ["JavaScript", "React", "TypeScript"]
      }
    ],
    "recommendedResources": [
      {
        "resource": { "_id": "...", "title": "React Course", ... },
        "matchedGaps": ["GraphQL"]
      }
    ],
    "stats": {
      "totalJobs": 21,
      "totalResources": 20,
      "averageMatchScore": 42
    }
  }
}
```

---

## Part B — Frontend: Dashboard Page

Replace `careerforge-frontend/src/app/(protected)/dashboard/page.tsx` entirely.

### B1. Type Definition

Create `careerforge-frontend/src/types/dashboard.ts`:

```ts
import type { MatchResult, ResourceRecommendation } from "./matching";

interface DashboardProfile {
  fullName: string;
  email: string;
  skillsCount: number;
  topSkills: string[];
  track: string | null;
  experienceLevel: string | null;
  educationLevel: string | null;
}

interface DashboardStats {
  totalJobs: number;
  totalResources: number;
  averageMatchScore: number;
}

interface DashboardData {
  profile: DashboardProfile;
  recommendedJobs: MatchResult[];
  recommendedResources: ResourceRecommendation[];
  stats: DashboardStats;
}
```

### B2. Page Structure

Type: `'use client'` (needs `useState`, `useEffect` for data fetching via `serverFetch`).

Single API call: `serverFetch<DashboardData>("/dashboard")`.

**Layout (top → bottom):**

1. **Welcome header**
   - `<h1>` — "Welcome back, {fullName}"
   - `<p>` — subtitle with track and experience level info

2. **Quick Stats row** — 3 `Card` components in a grid:
   - **Total Jobs** — number + Briefcase icon + "Available positions"
   - **Average Match** — percentage + Target icon + "Match score"
   - **Total Resources** — number + BookOpen icon + "Learning resources"
   - Stats cards use colored left borders or icon backgrounds with design system colors

3. **Profile Summary Card**
   - Grid layout: left side shows name, track, experience, education as key-value pairs
   - Right side shows "Your Top Skills" as `SkillTag` components (capped at 8)
   - Footer with "Edit Profile" link → `/profile`
   - If `skillsCount === 0`, replace skills section with a CTA: "Add skills to unlock personalized recommendations" + button to `/profile`

4. **Recommended Jobs section**
   - Section header: Sparkles icon + "Recommended for You" + "View all →" link to `/jobs`
   - Grid of up to 5 `JobCard` components with `matchScore` and `matchedSkills`
   - Empty state: "Add skills to see job recommendations" (same CTA pattern)

5. **Recommended Resources section**
   - Section header: BookOpen icon + "Learning Recommendations" + "View all →" link to `/resources`
   - Grid of up to 5 resource cards (same style as Jobs page's resource section)
   - Empty state: "Complete your profile to see learning recommendations"

6. **Charts section** — `DashboardCharts` component (see B3)

**Loading state:** Skeleton/spinner while fetching. Use consistent "Loading your dashboard..." text (already exists in current placeholder).

**Error state:** If fetch fails, `serverFetch` handles redirect to `/login`.

### B3. `DashboardCharts.tsx` Component

Create `careerforge-frontend/src/components/DashboardCharts.tsx`.

Type: `'use client'` (Recharts requires client-side rendering).

**Props:**

```ts
interface DashboardChartsProps {
  recommendedJobs: MatchResult[];
  stats: DashboardStats;
  skills: string[];
}
```

**Three charts:**

#### Chart 1: Match Score Bar Chart (Primary)
- **Type:** Recharts `BarChart` (horizontal)
- **Data:** Top 5 recommended jobs
- **X-axis:** Job title (truncated if too long)
- **Y-axis:** Match score (0–100)
- **Bar fill color:** Dynamic per score — uses custom cell coloring:
  - Score ≥ 70: `--success` (Emerald #10B981)
  - Score 40–69: `--warning` (Amber #F59E0B)
  - Score < 40: `--destructive` (Soft Red #EF4444)
- **Responsive container** wrapping the chart
- **Card** with title "Job Match Scores"

#### Chart 2: Score Distribution Donut Chart
- **Type:** Recharts `PieChart` with inner radius (donut)
- **Data:** Aggregate the recommended jobs into 3 segments:
  - "Excellent (≥70%)" — count of jobs with score ≥ 70
  - "Good (40–69%)" — count of jobs with score 40–69
  - "Low (<40%)" — count of jobs with score < 40
- **Colors:** success, warning, destructive (same as above)
- **Center label:** Total count or average score
- **Card** with title "Score Distribution"
- **Hidden** if no recommended jobs (user has no skills)

#### Chart 3: Skill Coverage Radar Chart
- **Type:** Recharts `RadarChart`
- **Data:** User's top 6 skills as categories, each with a fixed value of 1 (present)
- **Purpose:** Visualizes the breadth of the user's skill set
- **Fill color:** `--primary` (Deep Teal)
- **Opacity:** 60% fill, solid border
- **Card** with title "Your Skill Coverage"
- **Hidden** if user has 0 skills

#### Chart Layout
All three charts in a responsive grid:
- Desktop: 2-column layout (bar chart full width on top, donut + radar side by side below)
- Mobile: Single column, stacked

#### Color Handling in Recharts
Recharts v3 uses hex/RGB colors directly, not CSS variables. To stay consistent with the design system, define a constants object:

```ts
const CHART_COLORS = {
  success: "#10B981",
  warning: "#F59E0B",
  destructive: "#EF4444",
  primary: "#0D9488",
  secondary: "#6366F1",
  muted: "#94A3B8",
};
```

These match the design system hex values from `AGENTS.md`.

### B4. Full File List for Dashboard Page

| File | Action | Description |
|------|--------|-------------|
| `careerforge-frontend/src/types/dashboard.ts` | **Create** | DashboardData interface |
| `careerforge-frontend/src/components/DashboardCharts.tsx` | **Create** | Recharts visualization component |
| `careerforge-frontend/src/app/(protected)/dashboard/page.tsx` | **Replace** | Full dashboard page |

---

## Part C — Frontend: Navbar Enhancements

### C1. Route-Change Auto-Close

Add a `useEffect` that listens to `pathname` changes and closes the mobile menu:

```ts
useEffect(() => {
  setMenuOpen(false);
}, [pathname]);
```

This ensures the menu closes when a nav link is clicked on mobile (the `onClick` on `NavLink` already does this, but this is a safety net for programmatic navigation).

### C2. Backdrop Overlay

When `menuOpen` is true, render a semi-transparent backdrop behind the mobile menu:

```tsx
{menuOpen && (
  <>
    <div
      className="fixed inset-0 z-40 bg-black/50 md:hidden"
      onClick={() => setMenuOpen(false)}
    />
    <nav className="fixed inset-x-0 top-16 z-50 border-t bg-background px-4 py-2 md:hidden">
      {/* nav links */}
    </nav>
  </>
)}
```

The backdrop covers the full screen (excluding the navbar itself) and closes the menu on click. Only visible on `md:hidden` (mobile).

### C3. Transition Animation

Add a slide-down transition to the mobile menu using CSS transitions or the `tw-animate-css` utility classes:

```tsx
<nav className={cn(
  "fixed inset-x-0 top-16 z-50 border-t bg-background px-4 py-2 transition-all duration-200 md:hidden",
  menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
)}>
```

This gives a smooth appear/disappear effect.

### C4. Summary of Navbar Changes

| Change | File | What |
|--------|------|------|
| Route-change auto-close | `Navbar.tsx` | `useEffect` watching `pathname` |
| Backdrop overlay | `Navbar.tsx` | Semi-transparent `div` behind mobile menu |
| Slide animation | `Navbar.tsx` | CSS transition on mobile nav |
| Roadmap link | **Not added** | Page doesn't exist until Step 10 |

---

## Part D — Complete File Manifest

### New Files (5)

| File | Package | Description |
|------|---------|-------------|
| `careerforge-backend/src/app/modules/dashboard/dashboard.interface.ts` | Backend | TypeScript interfaces for dashboard data |
| `careerforge-backend/src/app/modules/dashboard/dashboard.service.ts` | Backend | Aggregation logic using existing matching services |
| `careerforge-backend/src/app/modules/dashboard/dashboard.controller.ts` | Backend | Thin controller |
| `careerforge-backend/src/app/modules/dashboard/dashboard.routes.ts` | Backend | `GET /api/dashboard` route |
| `careerforge-frontend/src/types/dashboard.ts` | Frontend | DashboardData TypeScript interface |
| `careerforge-frontend/src/components/DashboardCharts.tsx` | Frontend | Recharts visualization (bar, donut, radar) |

### Modified Files (4)

| File | Package | What Changes |
|------|---------|--------------|
| `careerforge-backend/src/routes/index.ts` | Backend | Import + mount `DashboardRoutes` at `/dashboard` |
| `careerforge-frontend/src/app/(protected)/dashboard/page.tsx` | Frontend | Full rewrite: profile summary + stats + recommendations + charts |
| `careerforge-frontend/src/components/Navbar.tsx` | Frontend | Mobile menu: backdrop, auto-close on route change, slide animation |
| `AGENTS.md` | Root | Update status for Step 5 (→ Done), Step 6 (→ Done after implementation) |

### Documentation Files (2)

| File | What |
|------|------|
| `docs/step6_plan.md` | This plan file |
| `.opencode/implementation-notes/06-dashboard-navigation.md` | Implementation notes (created during build) |

---

## Implementation Order

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 1 | Backend interface | `dashboard.interface.ts` | — |
| 2 | Backend service | `dashboard.service.ts` | #1 (interface) + existing `jobMatching.service.ts` |
| 3 | Backend controller | `dashboard.controller.ts` | #2 |
| 4 | Backend routes | `dashboard.routes.ts` | #3 |
| 5 | Backend route mounting | `routes/index.ts` | #4 |
| 6 | Frontend type | `types/dashboard.ts` | — |
| 7 | Frontend charts component | `DashboardCharts.tsx` | #6 (types) + Recharts |
| 8 | Frontend dashboard page | `dashboard/page.tsx` | #6, #7 + existing components |
| 9 | Navbar polish | `Navbar.tsx` | — |
| 10 | AGENTS.md updates | `AGENTS.md` | — |
| 11 | Implementation notes | `.opencode/implementation-notes/` | All above |
| 12 | Lint + build verification | — | All above |

---

## Verification Checklist

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | `GET /api/dashboard` returns correct shape | curl with valid accessToken cookie |
| 2 | Dashboard shows profile summary | Navigate to `/dashboard` in browser |
| 3 | Stats cards show correct numbers | Compare with `db.jobopportunities.countDocuments()` etc. |
| 4 | Top 5 recommended jobs shown with match badges | Browser + compare with `GET /api/jobs/recommended` |
| 5 | Top 5 recommended resources shown | Browser + compare with `GET /api/resources/recommended` |
| 6 | Bar chart renders with correct colors | Browser visual check |
| 7 | Donut chart renders, hidden when no skills | Browser visual check |
| 8 | Radar chart renders, hidden when no skills | Browser visual check |
| 9 | Empty-skills state shows CTA to profile | Browser test (profile with no skills) |
| 10 | Navbar active highlighting works | Click through all nav links |
| 11 | Mobile menu opens/closes | Responsive test |
| 12 | Backdrop closes mobile menu | Click outside menu on mobile |
| 13 | Menu auto-closes on navigation | Click a link on mobile menu |
| 14 | `npm run lint` passes (backend) | CLI |
| 15 | `npm run lint` passes (frontend) | CLI |
| 16 | `npm run build` passes (backend) | CLI |
| 17 | `npm run build` passes (frontend) | CLI |

---

## Technical Notes

### Backend Imports (ESM `.js` extensions)

All internal imports must use `.js` extensions:

```ts
import { env } from "../../config/env.js";
import { User } from "../user/user.model.js";
import { JobMatchingServices } from "../jobMatching/jobMatching.service.js";
```

### Zod Version

Backend uses Zod v4 (`zod@^4.5.4`). No Zod validation needed for this module (GET endpoint, no request body).

### Recharts v3

Frontend uses `recharts@^3.10.1`. The API is the same as v2 for basic charts. Key imports:

```ts
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Sector,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
```

### CSS Variable to Hex Mapping

Recharts requires hex colors, not CSS variables. Map from design system:

| Token | Hex | Use |
|-------|-----|-----|
| `--primary` | `#0D9488` | Radar chart fill |
| `--success` | `#10B981` | Bar chart (≥70%), Donut segment |
| `--warning` | `#F59E0B` | Bar chart (40–69%), Donut segment |
| `--destructive` | `#EF4444` | Bar chart (<40%), Donut segment |
| `--secondary` | `#6366F1` | Optional accent |
| `--muted-foreground` | `#94A3B8` | Fallback/default |

### `serverFetch` Usage

The dashboard page uses `serverFetch` in a client component with `useEffect`:

```ts
const [data, setData] = useState<DashboardData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  let active = true;
  serverFetch<DashboardData>("/dashboard")
    .then((d) => { if (active) setData(d); })
    .catch(() => {})
    .finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
}, []);
```

This is the same pattern used in the Jobs page and works correctly in client components.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Recharts SSR issues | Dashboard page uses `'use client'` so no SSR | Already handled — Recharts components only render client-side |
| Aggregation pipeline performance | Unlikely with 21 jobs + 20 resources | Simple `$group` pipelines; no indexes needed at this scale |
| `serverFetch` redirect loop | Only if refresh token is expired | Existing redirect logic handles this; dashboard gracefully falls back to `/login` |
| Chart colors differ across browsers | CSS variables vs hex | Using hex directly in Recharts ensures consistency |
| Empty data states | User with no skills sees empty charts | Charts sections hidden when data is empty; profile CTA shown instead |
