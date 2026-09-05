# Step 9: Match % + Reasons + Skill Gap Analysis

> **Phase:** 2 (Onsite, AI Layer)
> **Depends on:** Step 8 (Redis + AI Infrastructure) — Done
> **Status:** Not started

---

## Goal

Replace the basic skill-overlap scoring with a **weighted match percentage** that considers skill overlap, experience level alignment, and track alignment. Add a per-job match endpoint that returns human-readable reasons, a list of missing skills, and linked learning resources for each skill gap. Update the frontend job detail page to visualize all of this.

---

## Scoring Formula

```
totalScore = (skillOverlap × 0.60) + (experienceAlignment × 0.25) + (trackAlignment × 0.15)
```

| Dimension | Weight | How it's scored |
|-----------|--------|-----------------|
| Skill overlap | 60% | `(matchedSkills.length / requiredSkills.length) × 100` |
| Experience alignment | 25% | Exact match → 100, adjacent level (Fresher↔Junior) → 60, distant (Fresher↔Mid) → 0 |
| Track alignment | 15% | Exact match → 100, related track → 40, unrelated → 0 |

Related-track pairs (defined in `jobMatching.constant.ts`):

| Track | Related tracks |
|-------|---------------|
| Web Development | App Development, Software Engineering |
| App Development | Web Development, Software Engineering |
| Software Engineering | Web Development, App Development |
| Data Science | Machine Learning |
| Machine Learning | Data Science |
| UI UX Design | Web Development, Marketing |
| Marketing | UI UX Design |
| Game Development | Software Engineering |

---

## Backend Changes

### 1. `jobMatching/jobMatching.interface.ts` — Add New Types

Keep existing `IMatchResult` and `IResourceRecommendation` unchanged (used by `/recommended` endpoint). Add:

```typescript
export interface IMatchBreakdown {
  skillOverlap: number;        // 0–100, sub-score
  experienceAlignment: number;  // 0–100, sub-score
  trackAlignment: number;       // 0–100, sub-score
}

export interface ILearningLink {
  skill: string;
  resources: {
    _id: Types.ObjectId;
    title: string;
    platform: string;
    url: string;
    cost: "Free" | "Paid";
  }[];
}

export interface IJobMatchResult {
  job: IJobOpportunity;
  matchPercentage: number;      // 0–100, weighted total
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: IMatchBreakdown;
  reasons: string[];            // human-readable explanations
  learningLinks: ILearningLink[];
}
```

### 2. `jobMatching/jobMatching.constant.ts` — Scoring Config

```typescript
export const MATCH_WEIGHTS = {
  skillOverlap: 0.60,
  experienceAlignment: 0.25,
  trackAlignment: 0.15,
} as const;

export const RELATED_TRACKS: Record<string, string[]> = {
  "Web Development": ["App Development", "Software Engineering"],
  "App Development": ["Web Development", "Software Engineering"],
  "Software Engineering": ["Web Development", "App Development"],
  "Data Science": ["Machine Learning"],
  "Machine Learning": ["Data Science"],
  "UI UX Design": ["Web Development", "Marketing"],
  "Marketing": ["UI UX Design"],
  "Game Development": ["Software Engineering"],
};

export const ADJACENT_LEVELS: Record<string, string[]> = {
  Fresher: ["Junior"],
  Junior: ["Fresher", "Mid"],
  Mid: ["Junior"],
};
```

### 3. `jobMatching/jobMatching.service.ts` — Core Logic Changes

#### 3a. Modify existing `getRecommendedJobs(userId)`

Upgrade the scoring formula from pure skill overlap to the new weighted formula. The return type stays `IMatchResult[]` for backward compatibility — the `score` field now contains the weighted total instead of raw skill overlap.

**Pseudocode:**

```
getRecommendedJobs(userId):
  1. Fetch user
  2. Build userSkills Set from user.skills (lowercased)
  3. Fetch all jobs
  4. For each job:
     a. matchedSkills = job.requiredSkills.filter(s → userSkills has s)
     b. skillOverlapScore = (matchedSkills.length / requiredSkills.length) * 100
     c. experienceScore = computeExperienceAlignment(user.experienceLevel, job.experienceLevel)
     d. trackScore = computeTrackAlignment(user.preferredTrack, job.track)
     e. score = round(skillOverlap * 0.60 + experienceScore * 0.25 + trackScore * 0.15)
     f. Push { job, score, matchedSkills }
  5. Sort by score desc, then track-match tiebreaker
```

#### 3b. Add new `getJobMatch(userId, jobId)`

Returns a full `IJobMatchResult` for a single job.

**Pseudocode:**

```
getJobMatch(userId, jobId):
  1. Fetch user by ID (404 if not found)
  2. Fetch job by ID (404 if not found)
  3. Compute matchedSkills[] = intersection of user.skills and job.requiredSkills
  4. Compute missingSkills[] = requiredSkills minus matchedSkills
  5. Compute skillOverlapScore = (matched / required) * 100
  6. Compute experienceScore via helper
  7. Compute trackScore via helper
  8. matchPercentage = round(weighted sum)
  9. Build reasons[]:
     - If skillOverlapScore >= 70: "Strong skill match: X of Y required skills"
     - If skillOverlapScore >= 40: "Partial skill match: X of Y required skills"
     - If skillOverlapScore < 40: "Limited skill match: X of Y required skills"
     - If experienceScore == 100: "Experience level is a perfect fit"
     - If experienceScore == 60: "Experience level is close but not exact"
     - If experienceScore == 0: "Experience level mismatch"
     - If trackScore == 100: "Matches your preferred track"
     - If trackScore == 40: "Related to your preferred track"
  10. For each missing skill, query LearningResource.find({ relatedSkills: skill })
  11. Build learningLinks[] (only skills that have ≥1 resource)
  12. Return { job, matchPercentage, matchedSkills, missingSkills, breakdown, reasons, learningLinks }
```

#### 3c. Private helper functions

```typescript
computeExperienceAlignment(userLevel: string | undefined, jobLevel: string): number
  - If userLevel is undefined → return 0 (treat as mismatch)
  - If userLevel === jobLevel → return 100
  - If ADJACENT_LEVELS[jobLevel] includes userLevel → return 60
  - Otherwise → return 0

computeTrackAlignment(userTrack: string | undefined, jobTrack: string): number
  - If userTrack is undefined → return 0
  - If userTrack === jobTrack → return 100
  - If RELATED_TRACKS[userTrack] includes jobTrack → return 40
  - Otherwise → return 0
```

### 4. `jobMatching/jobMatching.controller.ts` — New Controller Method

```typescript
const getJobMatch = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { id: jobId } = req.params;
    const result = await JobMatchingServices.getJobMatch(userId, jobId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Job match analysis fetched successfully",
      data: result,
    });
  }
);
```

Add to exports: `{ getRecommendedJobs, getRecommendedResources, getJobMatch }`

### 5. `jobOpportunity/jobOpportunity.routes.ts` — Route Wiring

```typescript
import { aiRateLimiter } from "../../middlewares/rateLimiter.middleware.js";

// CRITICAL: /:id/match MUST come BEFORE /:id
// Express matches routes top-to-bottom; without this, "match" would be treated as an :id
router.get("/:id/match", authMiddleware, aiRateLimiter, JobMatchingController.getJobMatch);
router.get("/:id", JobOpportunityController.getJobById);
```

> **Note (implementation deviation):** `validateRequest(jobIdParamSchema)` is NOT used here. The existing `validateRequest` middleware only validates `req.body` — validating an empty GET body against `jobIdParamSchema` (`{ id: z.string() }`) would fail every request. Instead, invalid ObjectIds are handled by the existing Mongoose `CastError` → 400 path in `globalErrorHandler.ts`, matching the existing `/jobs/:id` route.

### 6. Apply `aiRateLimiter` to new endpoint

The `aiRateLimiter` middleware exists at `src/app/middlewares/rateLimiter.middleware.ts` but is not mounted on any route yet. Apply it to the `/jobs/:id/match` endpoint as a first step toward protecting AI-adjacent endpoints:

```typescript
router.get("/:id/match", authMiddleware, aiRateLimiter, validateRequest(jobIdParamSchema), JobMatchingController.getJobMatch);
```

---

## Frontend Changes

### 7. Install shadcn Tooltip Component

```bash
npx shadcn@latest add tooltip
```

This adds `src/components/ui/tooltip.tsx` using `@radix-ui/react-tooltip`. Required for the MatchBadge tooltip.

### 8. `types/job.ts` — Add Frontend Types

Add alongside existing types:

```typescript
export interface MatchBreakdown {
  skillOverlap: number;
  experienceAlignment: number;
  trackAlignment: number;
}

export interface LearningLink {
  skill: string;
  resources: {
    _id: string;
    title: string;
    platform: string;
    url: string;
    cost: "Free" | "Paid";
  }[];
}

export interface JobMatchResult {
  job: Job;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: MatchBreakdown;
  reasons: string[];
  learningLinks: LearningLink[];
}
```

### 9. `components/modules/jobs/MatchBadge.tsx` — Enhance with Tooltip

**Current:** Simple `<Badge>{score}%</Badge>` with color classes.

**New:** Wrap in shadcn `Tooltip` — on hover, show a small popover with the score breakdown.

Props change:
```typescript
interface MatchBadgeProps {
  score: number;
  breakdown?: MatchBreakdown;  // NEW optional prop
}
```

Tooltip content (when `breakdown` is provided):
```
Skill Overlap:      71%
Experience Match:   100%
Track Match:        100%
```

Color logic stays the same (>=70% success, 40-69% warning, <40% destructive).

When `breakdown` is not provided (backward compat), renders the same as current.

### 10. `components/modules/jobs/SkillGapSection.tsx` — New Component

**Purpose:** Display missing skills and linked learning resources on the job detail page.

**Props:**
```typescript
interface SkillGapSectionProps {
  missingSkills: string[];
  learningLinks: LearningLink[];
  matchedSkills: string[];
}
```

**Layout:**
```
Skills to Develop (3)
┌─────────────────────────────────────────────┐
│ ● TypeScript                                │
│   → freeCodeCamp: TypeScript Course [Free]  │
│   → Udemy: TS Masterclass [Paid]            │
│                                             │
│ ● Docker                                    │
│   → No resources found yet                  │
│                                             │
│ ● AWS                                       │
│   → A Cloud Guru: AWS Basics [Free]         │
└─────────────────────────────────────────────┘
```

- Each missing skill shown with `SkillTag` (missing variant — light red/orange background)
- For each skill, linked resources shown as small cards with platform, title, cost badge
- If no resources exist for a skill: gray "No resources found yet" text
- Header shows count of missing skills

### 11. `app/(protected)/jobs/[id]/page.tsx` — Job Detail Page Enhancement

**Current flow:** Fetches job by ID, renders static detail view.

**New flow:**

1. **Fetch both in parallel:**
   ```typescript
   const [job, matchResult] = await Promise.all([
     serverFetch<Job>(`/jobs/${id}`),
     serverFetch<JobMatchResult>(`/jobs/${id}/match`),
   ]);
   ```

2. **Add match analysis card** after the back button, before the main job card:
   - `MatchBadge` with `breakdown` prop (shows tooltip on hover)
   - Match percentage as a large number
   - Bulleted list of `reasons[]`

3. **Enhance "Required Skills" section:**
   - Matched skills: green highlight (existing `SkillTag` matched state)
   - Missing skills: red/orange highlight (new `SkillTag` variant)

4. **Add `SkillGapSection`** below skills, showing missing skills + linked resources

5. **External links** section already implemented — no changes needed.

6. **Error handling:** If `/match` endpoint fails (e.g., network error), still render the job detail without match info. The match section is non-critical progressive enhancement.

### 12. `components/modules/jobs/JobCard.tsx` — Minor Enhancement

Add optional `missingSkills` prop. When provided, required skills the user lacks render with the `SkillTag` "missing" variant (amber X mark), alongside the existing matched-skill green checkmarks. Today's callers (`/recommended`) don't pass it, so no visible change — the prop is ready for future list-view usage.

### 13. `components/shared/SkillTag.tsx` — Add "missing" Variant

Extend `SkillTag` with an optional `missing` boolean prop. When true, renders an amber-tinted badge (`bg-warning/10 text-warning border-warning/40`) with an X icon, mirroring the existing matched checkmark styling. Used by the job detail page and JobCard.

---

## File Summary

| # | File (relative to project root) | Action | Lines changed (est.) |
|---|--------------------------------|--------|---------------------|
| 1 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.interface.ts` | Modify | +30 |
| 2 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.constant.ts` | Modify | +25 |
| 3 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.service.ts` | Modify | +80 (add getJobMatch + helpers, update scoring) |
| 4 | `careerforge-backend/src/app/modules/jobMatching/jobMatching.controller.ts` | Modify | +18 |
| 5 | `careerforge-backend/src/app/modules/jobOpportunity/jobOpportunity.routes.ts` | Modify | +4 |
| 6 | `careerforge-frontend/src/components/ui/tooltip.tsx` | Create | ~35 (shadcn generated) |
| 7 | `careerforge-frontend/src/types/job.ts` | Modify | +30 |
| 8 | `careerforge-frontend/src/components/modules/jobs/MatchBadge.tsx` | Modify | +35 |
| 9 | `careerforge-frontend/src/components/modules/jobs/SkillGapSection.tsx` | Create | ~90 |
| 10 | `careerforge-frontend/src/app/(protected)/jobs/[id]/page.tsx` | Modify | +60 |
| 11 | `careerforge-frontend/src/components/modules/jobs/JobCard.tsx` | Modify | +3 |
| 12 | `careerforge-frontend/src/components/shared/SkillTag.tsx` | Modify | +12 |

**Total estimated:** ~7 files modified, 2 files created, ~1 file installed via shadcn CLI, ~420 lines changed.

---

## Route Summary

| Method | Route | Auth | Rate Limited | Description |
|--------|-------|------|-------------|-------------|
| GET | `/api/jobs/:id/match` | Yes | Yes | Per-job match analysis with breakdown, reasons, missing skills, learning links |
| GET | `/api/jobs/recommended` | Yes | No | Bulk recommended jobs (scoring upgraded to weighted) |
| GET | `/api/jobs` | No | No | Unchanged |
| GET | `/api/jobs/:id` | No | No | Unchanged |

---

## Acceptance Criteria

- [ ] `GET /api/jobs/:id/match` returns consistent results for the same user + job inputs
- [ ] Match percentage uses the weighted formula (60/25/15 split)
- [ ] `reasons[]` contains human-readable explanations
- [ ] `missingSkills[]` lists every required skill the user does not have
- [ ] Every missing skill has a `learningLinks[]` array (may be empty)
- [ ] Job detail page shows `MatchBadge` with tooltip showing score breakdown
- [ ] Job detail page shows matched skills (green) vs. missing skills (red) distinction
- [ ] Job detail page shows `SkillGapSection` with learning resources for missing skills
- [ ] `/api/jobs/recommended` still works with the updated weighted scoring
- [ ] `aiRateLimiter` is applied to the `/jobs/:id/match` endpoint
- [ ] If match endpoint fails, job detail page still renders without match info (graceful degradation)
- [ ] No raw hex colors used — all styling via CSS variables / Tailwind tokens
- [ ] All API calls go through `serverFetch` — no direct `fetch()` in components

---

## Dependencies

| Dependency | Needed for | Already installed? |
|-----------|-----------|-------------------|
| `@radix-ui/react-tooltip` | MatchBadge tooltip | No — installed via `npx shadcn@latest add tooltip` |
| No new backend packages | — | — |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Route ordering (`/:id/match` vs `/:id`) | Express may treat "match" as an ObjectId | Explicitly document and place `/:id/match` before `/:id` |
| No learning resources for some missing skills | Empty `learningLinks` for that skill | Show "No resources found yet" — not an error |
| User has no `preferredTrack` or `experienceLevel` | Alignment scores default to 0 | Explicitly handle undefined in helpers, don't crash |
| Tooltip component adds bundle size | Minor | `@radix-ui/react-tooltip` is small and tree-shakeable |
| Existing `/recommended` behavior changes | Scoring formula changes may reorder results | Weighted scoring is strictly better; same inputs → same outputs, just better ranked |
