# Step 5: Basic Matching Logic (Rule-Based) — Implementation Plan

> **Date:** 2026-09-04
> **Depends on:** Steps 1–4 (complete)
> **Phase:** 1, Step 5 of 7
> **No new npm packages required.**

---

## Open Questions — Resolved

| # | Question | Decision |
|---|----------|----------|
| 1 | Route wiring — separate `jobMatching.routes.ts` or modify existing route files? | **Modify existing.** Import `JobMatchingController` into `jobOpportunity.routes.ts` and `learningResource.routes.ts` to handle `/recommended`. Avoids route prefix conflicts. No separate routes file or new mount in `routes/index.ts`. |
| 2 | What to show when user has no skills? | **Render with a prompt.** The "Recommended for You" section always renders. When user has no skills, show a message like "Add skills to your profile to see personalized recommendations" with a link to the profile page. |
| 3 | Where do resource recommendations appear? | **Jobs page only**, alongside job recommendations. The Resources page keeps its existing browse/filter behavior unchanged. |

---

## Overview

Step 5 implements **rule-based** (no AI, no Redis) job and resource matching. The backend `jobMatching` module scores jobs by skill overlap with the authenticated user, and recommends learning resources based on skill gaps from top-matched jobs. The frontend adds match badges, skill tags, and a "Recommended for You" section on the Jobs page.

---

## Matching Algorithm

```
normalize(skill) = skill.trim().toLowerCase()

getRecommendedJobs(userId):
  user = User.findById(userId)
  userSkills = new Set(user.skills.map(normalize))
  jobs = JobOpportunity.find({})

  results = jobs.map(job => {
    matched = job.requiredSkills.filter(s => userSkills.has(normalize(s)))
    score = job.requiredSkills.length > 0
      ? Math.round((matched.length / job.requiredSkills.length) * 100)
      : 0
    return { job, score, matchedSkills: matched }
  })

  results.sort((a, b) => {
    // Primary: score descending
    if (b.score !== a.score) return b.score - a.score
    // Secondary: track match first (tiebreaker only)
    const aTrack = a.job.track === user.preferredTrack ? 1 : 0
    const bTrack = b.job.track === user.preferredTrack ? 1 : 0
    return bTrack - aTrack
  })

  return results

getRecommendedResources(userId):
  matches = getRecommendedJobs(userId)
  userSkills = ... (same as above)

  // Collect skill gaps from top 10 jobs
  gaps = new Set()
  for job in matches.slice(0, 10).map(m => m.job):
    for skill in job.requiredSkills:
      if not userSkills.has(normalize(skill)):
        gaps.add(normalize(skill))

  resources = LearningResource.find({})
  results = resources
    .map(r => ({
      resource: r,
      matchedGaps: r.relatedSkills.filter(s => gaps.has(normalize(s)))
    }))
    .filter(r => r.matchedGaps.length > 0)
    .sort((a, b) => b.matchedGaps.length - a.matchedGaps.length)

  return results
```

**Score formula:** `score = Math.round((matchedSkills.length / requiredSkills.length) * 100)`
- Jobs with 0 required skills → score = 0 (not useful recommendations).
- All comparisons are **case-insensitive** via `toLowerCase()`.
- Track preference is a **tiebreaker**, not a filter — all jobs appear, but matching-track jobs sort higher when scores are equal.

---

## Part A: Backend — `jobMatching` Module

### A1. `jobMatching.interface.ts`

**File:** `careerforge-backend/src/app/modules/jobMatching/jobMatching.interface.ts`

```typescript
import { IJobOpportunity } from "../jobOpportunity/jobOpportunity.interface.js";
import { ILearningResource } from "../learningResource/learningResource.interface.js";

export interface IMatchResult {
  job: IJobOpportunity;
  score: number;           // 0–100, percentage of requiredSkills matched
  matchedSkills: string[]; // which of the job's requiredSkills the user has
}

export interface IResourceRecommendation {
  resource: ILearningResource;
  matchedGaps: string[];   // which of the user's skill gaps this resource addresses
}
```

### A2. `jobMatching.service.ts`

**File:** `careerforge-backend/src/app/modules/jobMatching/jobMatching.service.ts`

Two exported functions:

#### `getRecommendedJobs(userId: string): Promise<IMatchResult[]>`

1. Fetch user by ID via `User.findById(userId)`. Throw `AppError(404, "User not found")` if missing.
2. Build a `Set` of lowercased user skills: `new Set(user.skills.map(s => s.toLowerCase()))`.
3. Fetch all jobs: `JobOpportunity.find({})`.
4. For each job:
   - Filter `job.requiredSkills` against the user skill set (case-insensitive) → `matchedSkills`.
   - Compute `score = requiredSkills.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 0`.
   - Push `{ job, score, matchedSkills }` to results array.
5. Sort results: primary by `score` descending, secondary by whether `job.track === user.preferredTrack` (1 for match, 0 for no match) descending.
6. Return full results array (no pagination — ~21 jobs in seed data).

#### `getRecommendedResources(userId: string): Promise<IResourceRecommendation[]>`

1. Call `getRecommendedJobs(userId)` to get scored matches.
2. Build skill gap set: iterate over `matches.slice(0, 10)`, collect every `requiredSkill` the user does NOT have (lowercased).
3. Fetch all resources: `LearningResource.find({})`.
4. For each resource, compute `matchedGaps = resource.relatedSkills.filter(s => gapSet.has(s.toLowerCase()))`.
5. Filter out resources with zero matched gaps.
6. Sort by `matchedGaps.length` descending.
7. Return results.

**Imports needed:**
- `User` from `../user/user.model.js`
- `JobOpportunity` from `../jobOpportunity/jobOpportunity.model.js`
- `LearningResource` from `../learningResource/learningResource.model.js`
- `AppError` from `../../errorHelpers/AppError.js`

### A3. `jobMatching.controller.ts`

**File:** `careerforge-backend/src/app/modules/jobMatching/jobMatching.controller.ts`

Two thin `catchAsync` handlers:

```typescript
const getRecommendedJobs = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await JobMatchingServices.getRecommendedJobs(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Recommended jobs fetched successfully",
    data: result,
  });
});

const getRecommendedResources = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await JobMatchingServices.getRecommendedResources(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Recommended resources fetched successfully",
    data: result,
  });
});
```

**Imports needed:**
- `catchAsync` from `../../helpers/catchAsync.js`
- `sendResponse` from `../../helpers/sendResponse.js`
- `AuthenticatedRequest` from `../auth/auth.interface.js`

### A4. `jobMatching.constant.ts`

**File:** `careerforge-backend/src/app/modules/jobMatching/jobMatching.constant.ts`

Empty file for now. Reserved for future use (score thresholds, weights, etc.).

---

## Part A (continued): Route Modifications

### A5. Modify `jobOpportunity.routes.ts`

**File:** `careerforge-backend/src/app/modules/jobOpportunity/jobOpportunity.routes.ts`

**Current (line 8):**
```typescript
router.get("/recommended", authMiddleware, JobOpportunityController.listJobs);
```

**Change to:**
```typescript
import { JobMatchingController } from "../jobMatching/jobMatching.controller.js";
// ...
router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedJobs);
```

The `/recommended` route keeps `authMiddleware` and now points to the matching controller. The rest of the routes file stays unchanged.

### A6. Modify `learningResource.routes.ts`

**File:** `careerforge-backend/src/app/modules/learningResource/learningResource.routes.ts`

**Current (line 8):**
```typescript
router.get("/recommended", authMiddleware, LearningResourceController.listResources);
```

**Change to:**
```typescript
import { JobMatchingController } from "../jobMatching/jobMatching.controller.js";
// ...
router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedResources);
```

### A7. `routes/index.ts` — No changes needed

The existing mounts (`/jobs` → `JobOpportunityRoutes`, `/resources` → `LearningResourceRoutes`) already cover the `/recommended` sub-routes. No new router to mount.

---

## Part B: Frontend — New Components + Updated Pages

### B1. `src/types/matching.ts`

**File:** `careerforge-frontend/src/types/matching.ts`

```typescript
import type { Job } from "./job";
import type { LearningResource } from "./resource";

export interface MatchResult {
  job: Job;
  score: number;
  matchedSkills: string[];
}

export interface ResourceRecommendation {
  resource: LearningResource;
  matchedGaps: string[];
}
```

### B2. `src/components/SkillTag.tsx`

**File:** `careerforge-frontend/src/components/SkillTag.tsx`

A small presentational component that renders a skill name as a styled badge.

**Props:**
- `skill: string` — the skill name to display
- `matched?: boolean` — if true, render with a subtle success/green tint to indicate the user has this skill (used in recommended job cards)

**Implementation:**
- Uses the existing shadcn `Badge` component (`variant="outline"` by default).
- When `matched` is true, apply `bg-success/10 text-success border-success/30` classes for a subtle green tint.
- When `matched` is false or undefined, use default `Badge` styling.

### B3. `src/components/MatchBadge.tsx`

**File:** `careerforge-frontend/src/components/MatchBadge.tsx`

Displays the match score percentage with color coding per the design system.

**Props:**
- `score: number` — 0–100 percentage

**Color mapping (from `globals.css` design tokens):**
| Score Range | Background Class | Text Class | Label |
|-------------|-----------------|------------|-------|
| >= 70% | `bg-success` | `text-success-foreground` | High match |
| 40–69% | `bg-warning` | `text-warning-foreground` | Medium match |
| < 40% | `bg-destructive` | `text-destructive-foreground` | Low match |

**Rendering:** A small rounded badge showing the percentage, e.g. `"72%"`. Uses the shadcn `Badge` component as base with conditional className for the color.

### B4. Modify `src/components/JobCard.tsx`

**File:** `careerforge-frontend/src/components/JobCard.tsx`

**Changes:**
1. Add optional props: `matchScore?: number`, `matchedSkills?: string[]`.
2. When `matchScore` is provided, render `MatchBadge` next to the job title in the `CardHeader`.
3. When `matchedSkills` is provided, visually highlight those skills in the skill badges section (use `SkillTag` with `matched={true}` for matched skills, `matched={false}` for others).
4. When neither prop is provided (regular browse mode), render exactly as today — no visual changes.

**New imports:** `MatchBadge` from `./MatchBadge`, `SkillTag` from `./SkillTag`.

### B5. Modify `src/app/(protected)/jobs/page.tsx`

**File:** `careerforge-frontend/src/app/(protected)/jobs/page.tsx`

**Changes:**

1. **New state + fetch for recommended jobs:**
   ```typescript
   const [recommended, setRecommended] = useState<MatchResult[]>([]);
   const [recLoading, setRecLoading] = useState(true);
   ```

2. **New `useEffect`** to fetch `GET /api/jobs/recommended` via `serverFetch<MatchResult[]>("/jobs/recommended")`. Handle errors gracefully (set empty array on failure).

3. **"Recommended for You" section** rendered above the existing filters:
   - If `recommended.length > 0` and user has skills → render section header "Recommended for You" + grid of `JobCard` with `matchScore` and `matchedSkills` props.
   - If `recommended.length === 0` and `recLoading === false` → render a prompt: "Add skills to your profile to see personalized recommendations" with a link button to `/profile`.
   - If `recLoading` → show a subtle loading state.

4. **Separate the "All Jobs" section** below with its own heading ("All Jobs" or "Browse All Jobs") to visually distinguish it from recommendations.

5. **New imports:** `MatchResult` from `@/types/matching`, `Link` from `next/link`, `Button` from `@/components/ui/button`.

### B6. Job Detail Page — No changes in Step 5

The `jobs/[id]/page.tsx` detail page does not change in Step 5. Match percentage on individual job detail is a Phase 2 (Step 9) feature.

### B7. Resources Page — No changes in Step 5

The `resources/page.tsx` keeps its existing browse/filter behavior. Resource recommendations appear on the Jobs page only.

---

## File Creation/Modification Summary

| # | File (relative to project root) | Action | Description |
|---|--------------------------------|--------|-------------|
| 1 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.interface.ts` | **Create** | `IMatchResult`, `IResourceRecommendation` types |
| 2 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.service.ts` | **Create** | `getRecommendedJobs()`, `getRecommendedResources()` |
| 3 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.controller.ts` | **Create** | Two thin `catchAsync` handlers |
| 4 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.constant.ts` | **Create** | Empty (reserved for future) |
| 5 | `careerforge-backend/src/app/modules/jobOpportunity/jobOpportunity.routes.ts` | **Modify** | Import `JobMatchingController`, replace stub handler on `/recommended` |
| 6 | `careerforge-backend/src/app/modules/learningResource/learningResource.routes.ts` | **Modify** | Import `JobMatchingController`, replace stub handler on `/recommended` |
| 7 | `careerforge-frontend/src/types/matching.ts` | **Create** | `MatchResult`, `ResourceRecommendation` types |
| 8 | `careerforge-frontend/src/components/SkillTag.tsx` | **Create** | Colored skill badge with optional matched state |
| 9 | `careerforge-frontend/src/components/MatchBadge.tsx` | **Create** | Match score badge with emerald/amber/red color coding |
| 10 | `careerforge-frontend/src/components/JobCard.tsx` | **Modify** | Accept optional match props, render MatchBadge + highlight matched skills |
| 11 | `careerforge-frontend/src/app/(protected)/jobs/page.tsx` | **Modify** | Add "Recommended for You" section + resource recommendations |

**Totals: 4 new backend files, 2 modified backend files, 3 new frontend files, 2 modified frontend files = 11 files touched.**

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| User has no skills | All jobs get score 0. "Recommended for You" section renders with prompt to add skills + link to `/profile`. |
| User has no `preferredTrack` | Track tiebreaker is skipped — all jobs treated equally for secondary sort. |
| Job has empty `requiredSkills` | Score = 0. Not useful as a recommendation but still appears in results. |
| No resources match any skill gaps | Return empty array. Section not rendered (or rendered with "No learning recommendations yet" message). |
| User not found (deleted account) | `AppError(404)` thrown by service, handled by `globalErrorHandler`. |
| Case sensitivity | All comparisons are case-insensitive via `toLowerCase()`. |

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Recommendations change when user skills change | Update skills via PUT `/api/profile`, re-fetch `/api/jobs/recommended`, scores should differ |
| 2 | "Why recommended" (matched skills) is shown on job cards | `MatchBadge` shows percentage + matched skills highlighted in `JobCard` |
| 3 | MatchBadge uses correct color for each score range | score >= 70% → Emerald, 40–69% → Amber, < 40% → Soft Red |
| 4 | Resource recommendations appear on Jobs page | Below job recommendations, resources linked to skill gaps shown |
| 5 | No-skills prompt works | When user has no skills, section shows prompt to add skills with link to profile |

---

## What Step 5 Does NOT Include

- Match % on individual job detail page → Phase 2 Step 9
- Missing skills with linked resources on job detail page → Phase 2 Step 9
- Weighted scoring (experience level, track alignment as factors, not just tiebreaker) → Phase 2 Step 9
- `/api/jobs/:id/match` endpoint → Phase 2 Step 9
- Redis caching of match results → Phase 2
- Dashboard integration → Step 6
- `useAuth` hook (not needed — recommended fetch uses `serverFetch` directly in `useEffect`)

---

## Dependencies on Other Modules

| Module | How used in Step 5 |
|--------|-------------------|
| `user` | `User.findById(userId)` to get `skills`, `preferredTrack` |
| `jobOpportunity` | `JobOpportunity.find({})` to get all jobs for scoring |
| `learningResource` | `LearningResource.find({})` to get all resources for gap matching |
| `auth` | `authMiddleware` provides `req.user!.userId`; `AuthenticatedRequest` type |

No circular dependencies. `jobMatching` imports from `user`, `jobOpportunity`, and `learningResource` models — none of those import from `jobMatching`.

---

## Execution Order

1. Create `jobMatching.constant.ts` (empty placeholder)
2. Create `jobMatching.interface.ts` (types)
3. Create `jobMatching.service.ts` (core logic)
4. Create `jobMatching.controller.ts` (thin handlers)
5. Modify `jobOpportunity.routes.ts` (swap stub)
6. Modify `learningResource.routes.ts` (swap stub)
7. Run `npm run lint` in backend to verify
8. Create `frontend/src/types/matching.ts`
9. Create `frontend/src/components/SkillTag.tsx`
10. Create `frontend/src/components/MatchBadge.tsx`
11. Modify `frontend/src/components/JobCard.tsx`
12. Modify `frontend/src/app/(protected)/jobs/page.tsx`
13. Run `npm run lint` in frontend to verify
14. Manual testing: register → add skills → browse jobs → verify recommendations appear
