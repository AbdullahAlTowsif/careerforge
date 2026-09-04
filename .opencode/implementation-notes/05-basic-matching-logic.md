# Step 05 — Basic Matching Logic

## Summary

Implements rule-based job and resource recommendations using skill overlap scoring. The backend `jobMatching` module scores every seeded job against the authenticated user's `skills[]` array, returning match percentages and matched skill lists. A companion endpoint identifies skill gaps from the user's top-matched jobs and recommends learning resources that cover those gaps. The frontend adds a "Recommended for You" section, a "Skill-Based Learning Picks" section, color-coded `MatchBadge` components, and skill-highlighting via `SkillTag` components on the Jobs page.

## Scope Documented

Uncommitted working tree changes (no branch). Determined via `git status --short` and `git diff` against commit `9dfbd70` (last committed state: "seed jobs & resources added"). AGENTS.md currently marks Step 5 as "Not started" — this document describes the code that exists in the working tree regardless of that status flag.

## Backend Changes

### New files — `careerforge-backend/src/app/modules/jobMatching/`

| File | Purpose |
|------|---------|
| `jobMatching.interface.ts` | Exports `IMatchResult` (job + score + matchedSkills[]) and `IResourceRecommendation` (resource + matchedGaps[]) |
| `jobMatching.service.ts` | Core matching logic: `getRecommendedJobs(userId)` and `getRecommendedResources(userId)` |
| `jobMatching.controller.ts` | Two thin `catchAsync` handlers that extract `req.user!.userId` and delegate to the service |
| `jobMatching.constant.ts` | Empty placeholder (reserved for future score thresholds / weights) |

**No `jobMatching.routes.ts` was created.** The matching endpoints are served by the existing `jobOpportunity` and `learningResource` routers (see modified files below). This avoids route prefix conflicts since `/api/jobs/recommended` and `/api/resources/recommended` are already mounted under those modules.

### Modified files

**`careerforge-backend/src/app/modules/jobOpportunity/jobOpportunity.routes.ts`**

Line 9 changed from:
```typescript
router.get("/recommended", authMiddleware, JobOpportunityController.listJobs);
```
to:
```typescript
router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedJobs);
```
Added import for `JobMatchingController` from `../jobMatching/jobMatching.controller.js`.

**`careerforge-backend/src/app/modules/learningResource/learningResource.routes.ts`**

Line 9 changed from:
```typescript
router.get("/recommended", authMiddleware, LearningResourceController.listResources);
```
to:
```typescript
router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedResources);
```
Added import for `JobMatchingController` from `../jobMatching/jobMatching.controller.js`.

### Matching algorithm (`jobMatching.service.ts`)

**`getRecommendedJobs(userId)`:**
1. Fetches user by ID; throws `AppError(404)` if not found.
2. Builds a `Set<string>` of lowercased user skills.
3. Fetches all `JobOpportunity` documents.
4. For each job: filters `job.requiredSkills` against the user skill set (case-insensitive), computes `score = Math.round((matchedSkills.length / requiredSkills.length) * 100)`. Jobs with 0 required skills get score 0.
5. Sorts: primary by score descending, secondary by whether `job.track === user.preferredTrack` (track-match tiebreaker).
6. Returns the full sorted array (no pagination).

**`getRecommendedResources(userId)`:**
1. Calls `getRecommendedJobs(userId)` internally.
2. Iterates the top 10 results, collecting every `requiredSkill` the user does NOT have into a `gapSet`.
3. If `gapSet` is empty, returns `[]`.
4. Fetches all `LearningResource` documents.
5. For each resource: computes `matchedGaps` by intersecting `resource.relatedSkills` with the gap set (case-insensitive).
6. Filters out resources with zero matched gaps.
7. Sorts by `matchedGaps.length` descending.

### Models touched (read-only, no schema changes)

- `User` model (`user.model.ts`) — reads `skills[]`, `preferredTrack`
- `JobOpportunity` model (`jobOpportunity.model.ts`) — reads all fields, especially `requiredSkills[]`, `track`
- `LearningResource` model (`learningResource.model.ts`) — reads all fields, especially `relatedSkills[]`

### Route wiring (`src/routes/index.ts`)

No changes. The existing mounts (`/jobs` → `JobOpportunityRoutes`, `/resources` → `LearningResourceRoutes`) already cover the `/recommended` sub-routes.

### No new environment variables

This step uses no new env vars. It runs entirely against MongoDB using the existing `MONGODB_URI`.

### No validation schemas added

The matching endpoints accept no request body or query parameters — the user ID comes from the JWT cookie via `authMiddleware`.

## Frontend Changes

### New files

**`careerforge-frontend/src/types/matching.ts`**

Frontend mirror of the backend `IMatchResult` and `IResourceRecommendation` interfaces:
```typescript
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

**`careerforge-frontend/src/components/SkillTag.tsx`**

Renders a skill name as a shadcn `Badge` (variant `outline`). When `matched={true}`, applies `bg-success/10 text-success border-success/30` classes for a green tint and renders a checkmark SVG icon before the skill name. When `matched` is falsy, renders as a plain outline badge. Uses the `cn()` utility from `@/lib/utils` for conditional class merging.

**`careerforge-frontend/src/components/MatchBadge.tsx`**

Displays a match score percentage as a colored badge. Color mapping via `getScoreClasses()`:
- `score >= 70` → `bg-success text-success-foreground` (Emerald, per design system)
- `score >= 40` → `bg-warning text-warning-foreground` (Amber)
- `score < 40` → `bg-destructive text-white` (Soft Red)

Renders as `<Badge>{score}%</Badge>`.

### Modified files

**`careerforge-frontend/src/components/JobCard.tsx`**

- Props changed from `{ job: Job }` to `{ job: Job; matchScore?: number; matchedSkills?: string[] }`.
- When `matchScore` is provided, renders `MatchBadge` next to the job title (before the type badge).
- When `matchedSkills` is provided, builds a `Set<string>` of lowercased matched skills and passes `matched={true}` to `SkillTag` for each matching skill, `matched={false}` otherwise.
- When neither optional prop is provided, renders identically to the Step 4 version — no visual regression.

**`careerforge-frontend/src/app/(protected)/jobs/page.tsx`**

Major additions:
1. **New state:** `recommended` (`MatchResult[]`), `recLoading`, `recError`, `recResources` (`ResourceRecommendation[]`), `resLoading`.
2. **Three parallel `useEffect` fetches on mount:**
   - `GET /api/jobs` → all jobs (existing)
   - `GET /api/jobs/recommended` → scored matches (new)
   - `GET /api/resources/recommended` → resource recommendations (new)
   Each uses the `active` flag pattern for cleanup. The recommended fetch catches errors and sets `recError = true`.
3. **"Recommended for You" section** (lines 136–154): Rendered when `hasRecJobs` is true. Shows a `Sparkles` icon (Soft Indigo color per design system) + heading, then a 3-column grid of up to 6 `JobCard` components with `matchScore` and `matchedSkills` props.
4. **No-skills prompt** (lines 156–168): Rendered when `noSkills` is true (no rec results and no error). Shows a dashed border card with a prompt to add skills and a "Go to Profile" button linking to `/profile`.
5. **"Skill-Based Learning Picks" section** (lines 170–209): Rendered when `hasRecResources` is true. Shows a `BookOpen` icon + heading, then a 3-column grid of up to 6 resource cards. Each card shows the resource title, platform, cost badge (Free=secondary, Paid=outline), and a "Covers your skill gaps:" label with `SkillTag` components for each matched gap.
6. **"All Jobs" heading** added above the filter grid (line 217) to visually separate the recommended sections from the full browse list.
7. **Loading state** for resources shown below the resource section when `resLoading` is true.

## Third-Party Packages Used

### Newly introduced packages

**None.** This step added zero new dependencies to either `package.json`. All backend logic uses existing packages (mongoose, express, jsonwebtoken via auth middleware). All frontend components use existing packages (react, lucide-react icons, shadcn/ui via tailwindcss/class-variance-authority/radix-ui).

### Existing packages used in new ways

| Package | Where in this step | What changed |
|---------|-------------------|--------------|
| `mongoose` (v9.9.4) | `jobMatching.service.ts` | `User.findById()`, `JobOpportunity.find({})`, `LearningResource.find({})` called from a new module |
| `lucide-react` (v1.40.0) | `jobs/page.tsx` | Added `Sparkles` and `BookOpen` icon imports (previously only used `Search`) |
| `class-variance-authority` + `tailwind-merge` (via `cn()`) | `SkillTag.tsx`, `MatchBadge.tsx` | Used in new components for conditional class merging |
| shadcn `Badge` component | `SkillTag.tsx`, `MatchBadge.tsx`, `jobs/page.tsx` | Used in new components; also used in resource cards on jobs page |

## Request/Data Flow

### GET /api/jobs/recommended

```
Browser loads /jobs page
  → useEffect fires serverFetch<MatchResult[]>("/jobs/recommended")
  → Next.js proxy rewrites to http://localhost:5000/api/jobs/recommended
  → Express matches jobOpportunity.routes.ts: router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedJobs)
  → authMiddleware reads "accessToken" httpOnly cookie, verifies JWT, attaches req.user = { userId, email }
  → JobMatchingController.getRecommendedJobs extracts req.user!.userId
  → JobMatchingServices.getRecommendedJobs(userId):
      → User.findById(userId) — fetches user.skills, user.preferredTrack
      → JobOpportunity.find({}) — fetches all 21 seeded jobs
      → Scores each job: score = Math.round((matchedSkills.length / requiredSkills.length) * 100)
      → Sorts by score desc, then track-match tiebreaker
      → Returns IMatchResult[] (full array, no limit)
  → sendResponse(res, { statusCode: 200, success: true, message: "...", data: results })
  → serverFetch unwraps { success, message, data } → returns data to caller
  → Frontend sets recommended state → renders "Recommended for You" grid (up to 6 cards)
```

### GET /api/resources/recommended

```
Browser loads /jobs page
  → useEffect fires serverFetch<ResourceRecommendation[]>("/resources/recommended")
  → Next.js proxy rewrites to http://localhost:5000/api/resources/recommended
  → Express matches learningResource.routes.ts: router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedResources)
  → authMiddleware verifies JWT, attaches req.user
  → JobMatchingController.getRecommendedResources extracts userId
  → JobMatchingServices.getRecommendedResources(userId):
      → Calls getRecommendedJobs(userId) internally (same logic as above)
      → Iterates top 10 results, collects skill gaps (requiredSkills user lacks)
      → LearningResource.find({}) — fetches all 20 seeded resources
      → Intersects resource.relatedSkills with gapSet
      → Filters out zero-match resources, sorts by match count desc
      → Returns IResourceRecommendation[]
  → sendResponse → serverFetch unwraps → frontend renders "Skill-Based Learning Picks" (up to 6 cards)
```

## API Testing (Postman)

Base URL: `http://localhost:5000` (controlled by `PORT` env var, default `5000`).

### GET /api/jobs/recommended

Auth: **required** — httpOnly cookie named `accessToken` containing a valid JWT. Obtain by calling `POST /api/auth/register` or `POST /api/auth/login` first (the response sets the cookie automatically).

Headers:
```
Content-Type: application/json
Cookie: accessToken=<jwt-from-login>
```

Request body: none (GET request).

**Successful response (200):**
```json
{
  "success": true,
  "message": "Recommended jobs fetched successfully",
  "data": [
    {
      "job": {
        "_id": "66d1a...",
        "title": "Frontend Developer",
        "company": "TechCorp BD",
        "location": "Dhaka",
        "requiredSkills": ["React", "TypeScript", "Tailwind CSS", "HTML", "CSS"],
        "experienceLevel": "Fresher",
        "type": "Full-time",
        "track": "Web Development",
        "description": "...",
        "externalLinks": { "linkedin": "", "bdjobs": "", "glassdoor": "" }
      },
      "score": 60,
      "matchedSkills": ["React", "TypeScript", "HTML"]
    },
    {
      "job": { "..." : "..." },
      "score": 0,
      "matchedSkills": []
    }
  ]
}
```

The `data` array is sorted by `score` descending, then by track-match tiebreaker. Every job in the database appears in the array (all 21 seeded jobs), each with its computed `score` and `matchedSkills`.

**Error responses:**

| Status | When | Example body |
|--------|------|-------------|
| 401 | No `accessToken` cookie | `{ "success": false, "message": "You are not logged in. Please log in first." }` |
| 401 | Expired/invalid JWT | `{ "success": false, "message": "Invalid or expired access token. Please log in again." }` |
| 404 | User ID from JWT not found in DB | `{ "success": false, "message": "User not found" }` |

---

### GET /api/resources/recommended

Auth: **required** — same httpOnly cookie as above.

Headers:
```
Content-Type: application/json
Cookie: accessToken=<jwt-from-login>
```

Request body: none (GET request).

**Successful response (200):**
```json
{
  "success": true,
  "message": "Recommended resources fetched successfully",
  "data": [
    {
      "resource": {
        "_id": "66d2b...",
        "title": "React Tutorial for Beginners",
        "platform": "YouTube",
        "url": "https://youtube.com/...",
        "relatedSkills": ["React", "Hooks", "Component Design"],
        "cost": "Free"
      },
      "matchedGaps": ["React"]
    }
  ]
}
```

The `data` array contains only resources whose `relatedSkills` intersect with the user's skill gaps (derived from top 10 recommended jobs). Sorted by number of matched gaps descending. If the user has no skill gaps (already has all required skills for all jobs), the array is empty `[]`.

**Error responses:** identical to `/api/jobs/recommended` (401, 404).

---

### Suggested Postman test order

1. **Register a test user** — `POST /api/auth/register` with skills set. The response sets `accessToken` and `refreshToken` httpOnly cookies.
2. **Call GET /api/jobs/recommended** — verify the response is an array of `IMatchResult` objects. With no skills, all jobs should have `score: 0`.
3. **Update profile with skills** — `PUT /api/profile` with body `{ "skills": ["React", "TypeScript", "Node.js"], "preferredTrack": "Web Development" }`.
4. **Call GET /api/jobs/recommended** again — verify React/Node.js-related jobs now have non-zero scores, and Web Development track jobs appear first among equal-score results.
5. **Call GET /api/resources/recommended** — verify resources are returned for the skill gaps identified from the top 10 jobs.
6. **Test auth rejection** — call GET `/api/jobs/recommended` without the cookie → expect 401.

## Environment Variables Added

None. This step introduces no new environment variables.

## Known Gaps / TODOs

1. **`AGENTS.md` Step 5 status not updated.** The status table still shows "Not started" for Step 5. Should be updated to "Done" after this is committed.

2. **`jobMatching` module has no `routes.ts` file.** The matching endpoints are served by modifying the existing `jobOpportunity.routes.ts` and `learningResource.routes.ts` to import the `JobMatchingController` directly. This is a deliberate deviation from the strict MVC convention (each module should own its routes). When Phase 2 adds `GET /api/jobs/:id/match`, a dedicated `jobMatching.routes.ts` should be created and mounted.

3. **`getRecommendedResources` calls `User.findById()` twice.** The `getRecommendedJobs` function already fetches the user, but `getRecommendedResources` calls it again redundantly (lines 40-44). This is a minor inefficiency — could be refactored to pass the user object through or cache the first lookup.

4. **No pagination on recommended results.** Both endpoints return the full dataset. With 21 seeded jobs this is fine, but with a larger job corpus (hundreds/thousands) the response size and MongoDB query load will become problematic. Pagination or a `limit` query param should be added when the dataset grows.

5. **Job detail page (`/jobs/[id]`) does not show match score.** The plan says this is a Phase 2 (Step 9) feature. Users clicking through to job details lose the match context.

6. **No `useAuth` hook created.** The plan noted this as a potential creation, but the implementation opted to fetch recommended data directly via `serverFetch` in `useEffect`, consistent with the existing pattern in the jobs page. The hook can be added in a future refactor.

7. **No automated tests.** No test framework is installed in either package (per AGENTS.md: "No test framework is installed"). The matching algorithm's correctness depends on manual Postman testing.

8. **Frontend `noSkills` condition may be overly broad.** The variable `noSkills` is `true` when `recommended.length === 0` and there's no error. This is also true while the fetch is in flight (before `recLoading` becomes false), but `recLoading` being true means `noSkills` evaluates to `false` (because `!recLoading` is false), so the prompt won't flash during loading. This is correct behavior, but the logic is subtle.

## Testing

**Automated tests:** None. No test framework (Jest, Vitest, Mocha, etc.) is installed in either `careerforge-backend` or `careerforge-frontend`. There is no CI/CD pipeline.

**Manual testing checklist:**
- [ ] Seed data: `npm run seed` in `careerforge-backend/`
- [ ] Register a user, add skills (e.g. "React", "TypeScript", "Node.js") and set `preferredTrack` to "Web Development"
- [ ] Navigate to `/jobs` — "Recommended for You" section should appear with scored job cards
- [ ] MatchBadge colors: jobs with >=70% should be emerald, 40-69% amber, <40% red
- [ ] Matched skills should appear with green tint and checkmark on recommended cards
- [ ] "Skill-Based Learning Picks" should appear with resources covering skill gaps
- [ ] Remove all skills from profile → "Add skills to your profile" prompt should appear with link to profile
- [ ] Call `GET /api/jobs/recommended` without auth cookie → 401
- [ ] Call `GET /api/resources/recommended` without auth cookie → 401
