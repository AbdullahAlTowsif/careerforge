# Step 09 — Match % + Reasons + Skill Gap Analysis

## Summary

Replaces the basic skill-overlap match scoring on the backend with a **weighted match percentage** (skills 60%, experience 25%, track 15%), and adds a per-job endpoint `GET /api/jobs/:id/match` that returns the match percentage, a human-readable `reasons[]` list, matched/missing skills, per-skill score breakdown, and the learning resources available to fill each skill gap. The frontend job detail page now renders this analysis (match badge with hover breakdown, a score-breakdown card, matched-vs-missing skill tags, and a "Skills to Develop" section linking learning resources), degrading gracefully to the plain job view if the match lookup fails.

## Scope Documented

Working-tree (uncommitted) changes against `HEAD` (`main`, last commit `b26df5c`), on top of the Step 8 implementation. Determined via `git status` / `git diff` — there is no `feature/09-*` branch; all Step 9 work is present as uncommitted modifications plus a few untracked files.

> Note: AGENTS.md's status table still lists Steps 9–13 as "Not started" (it was written before this step was implemented). The implementation described here exists in the current working tree and is ready to be committed.

## Backend Changes

### `careerforge-backend/src/app/modules/jobMatching/jobMatching.constant.ts`
- `MATCH_WEIGHTS` — `{ skillOverlap: 0.6, experienceAlignment: 0.25, trackAlignment: 0.15 }` (weighting factors for the composite score).
- `RELATED_TRACKS` — map of each preferred track to tracks considered "related" (yields partial 40% track alignment).
- `ADJACENT_LEVELS` — map of each experience level to adjacent levels (yields partial 60% experience alignment).

### `careerforge-backend/src/app/modules/jobMatching/jobMatching.interface.ts`
Adds types (existing `IMatchResult`, `IResourceRecommendation` unchanged):
- `IMatchBreakdown` — `{ skillOverlap, experienceAlignment, trackAlignment }` (each 0–100).
- `ILearningLinkResource` — a learning-resource projection (`_id`, `title`, `platform`, `url`, `cost`).
- `ILearningLink` — `{ skill, resources: ILearningLinkResource[] }`.
- `IJobMatchResult` — `{ job, matchPercentage, matchedSkills, missingSkills, breakdown, reasons, learningLinks }`.
- Imports `Types` from `mongoose` for `Types.ObjectId`.

### `careerforge-backend/src/app/modules/jobMatching/jobMatching.service.ts`
- New helpers:
  - `computeExperienceAlignment(userLevel, jobLevel)` → 100 exact / 60 adjacent / 0 otherwise (0 if user level unset).
  - `computeTrackAlignment(userTrack, jobTrack)` → 100 exact / 40 related / 0 otherwise (0 if user track unset).
  - `computeBreakdown(...)` → wraps skill overlap + the two alignments into `IMatchBreakdown`.
  - `computeMatchPercentage(breakdown)` → `round(skillOverlap*0.60 + experienceAlignment*0.25 + trackAlignment*0.15)`.
  - `buildReasons(...)` → one human-readable string per dimension (skill, experience, track).
- Changed `getRecommendedJobs(userId)` — `score` on each result now uses the weighted composite percent (was raw skill-overlap %). Return type unchanged (`IMatchResult[]`), so `/api/jobs/recommended` consumers are unaffected.
- New `getResourcesForGaps(missingSkills)` — queries `LearningResource` where `relatedSkills` matches any missing skill (`$in`), then groups resources per missing skill (case-insensitive) into `ILearningLink[]`.
- New `getJobMatch(userId, jobId)` — loads user + job (both throw `AppError(404, ...)` if absent), computes matched/missing skills, breakdown, percentage, reasons, and looks up learning resources for each gap; returns `IJobMatchResult`. Comparisons for skill diffing are case-insensitive.
- Exports `getJobMatch` on `JobMatchingServices`.

### `careerforge-backend/src/app/modules/jobMatching/jobMatching.controller.ts`
- New `getJobMatch` handler using `catchAsync`, reads `req.user.userId` and `req.params.id` (handles `string | string[]` via the same `Array.isArray` pattern used by `getJobById`), returns `sendResponse(200, "Job match analysis fetched successfully", data)`.
- Added to `JobMatchingController` exports.

### `careerforge-backend/src/app/modules/jobOpportunity/jobOpportunity.routes.ts`
- Mounted new protected route **before** `/:id` (Express matches top-down, so `match` must not be swallowed by the `:id` param):
  - `router.get("/:id/match", authMiddleware, aiRateLimiter, JobMatchingController.getJobMatch)`
- `aiRateLimiter` imported from `../../middlewares/rateLimiter.middleware.js` (10 req / 60 s per IP, Redis-backed with memory fallback). This is the first route the AI rate limiter is actually mounted on.

## Frontend Changes

### `careerforge-frontend/src/types/job.ts`
Adds mirror types `MatchBreakdown`, `LearningLinkResource`, `LearningLink`, and `JobMatchResult` matching the backend contract.

### `careerforge-frontend/src/components/ui/tooltip.tsx` (new, untracked)
shadcn-generated `Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider` primitives wrapping `radix-ui`'s Tooltip. Import uses the project convention `cn` from `@/lib/utils` (not the auto-added `cn` npm package).

### `careerforge-frontend/src/components/modules/jobs/MatchBadge.tsx`
- Added optional `breakdown?: MatchBreakdown` prop and `"use client"`.
- When `breakdown` is provided, wraps the badge in a `TooltipProvider > Tooltip > TooltipTrigger`; hover shows a `Skill Overlap / Experience Fit / Track Alignment` bar breakdown with a "Weights: Skills 60% · Experience 25% · Track 15%" footer.
- Color logic unchanged (≥70 success, 40–69 warning, <40 destructive). Without `breakdown`, renders exactly as before (backward compatible).

### `careerforge-frontend/src/components/shared/SkillTag.tsx`
- Added optional `missing?: boolean` prop; renders an amber-tinted badge `bg-warning/10 text-warning border-warning/40` with an X icon (mirrors the existing green matched checkmark styling).

### `careerforge-frontend/src/components/modules/jobs/JobCard.tsx`
- Added optional `missingSkills?: string[]` prop; required skills present in `missingSkills` render with the new `SkillTag` "missing" variant. No caller passes it yet, so this is prepared for future list views.

### `careerforge-frontend/src/components/modules/jobs/SkillGapSection.tsx` (new, untracked)
- Renders the "Skills to Develop" card: a count badge, one row per missing skill (warning-tinted skill tag), and each linked resource as title / platform / Free-Paid badge. Shows "No resources found yet." for gaps without resources. Displays "You have all the required skills for this job." when there are no gaps.

### `careerforge-frontend/src/app/(protected)/jobs/[id]/page.tsx`
- Fetches job and match in parallel via `Promise.all`, with the match call wrapped in `.catch(() => null)` so a match failure never breaks the page (graceful degradation).
- Adds two conditional cards when `matchResult` exists: (1) a match-summary card (MatchBadge + percentage + reasons list) and (2) a "Score Breakdown" card with three `BreakdownCard` bars using `bg-success`/`bg-warning`/`bg-destructive` by threshold.
- "Required Skills" now renders via `SkillTag` with matched/missing states instead of plain secondary badges.
- Renders `<SkillGapSection>` below the job card.
- New local `BreakdownCard` component (label + % + colored bar). External links block unchanged.

## Third-Party Packages Used

Newly added this step (from `careerforge-frontend/package.json`):

- **`cn@^0.2.5`** — file: only `careerforge-frontend/package.json` + `package-lock.json`. **Not actually used anywhere in code.** It was auto-installed by `npx shadcn@latest add tooltip`; the generated `tooltip.tsx` was reconciled to use the project's existing `cn()` helper from `@/lib/utils`. This is an accidental/unnecessary dependency and is a candidate for removal.

Already present and used in a new way this step:

- **`radix-ui@^1.6.7`** (pre-existing) — now used for `Tooltip` primitives in `src/components/ui/tooltip.tsx` (the umbrella package's `Tooltip` sub-export). No `@radix-ui/react-tooltip` package was installed because `radix-ui` already exposes it.

No new backend packages were added.

## Request/Data Flow

Match analysis for a single job:

```text
User opens /jobs/:id in the frontend
  → serverFetch GET /api/jobs/:id          (public job payload)
  → serverFetch GET /api/jobs/:id/match    (authenticated, httpOnly cookie auto-attached)
      → jobMatching controller getJobMatch
      → authMiddleware verifies accessToken cookie -> req.user.userId
      → aiRateLimiter (10 req/60s per IP)
      → jobMatching.service.getJobMatch(userId, jobId)
          → User.findById(userId)          (404 if missing)
          → JobOpportunity.findById(jobId) (404 if missing)
          → case-insensitive diff of user.skills vs job.requiredSkills
              -> matchedSkills[], missingSkills[]
          → computeBreakdown + computeMatchPercentage (weighted 60/25/15)
          → buildReasons -> reasons[]
          → getResourcesForGaps(missingSkills)
              -> LearningResource.find({ relatedSkills: { $in: missingSkills } })
              -> group per missing skill -> learningLinks[]
      → sendResponse(200, "Job match analysis fetched successfully", data)
  → frontend renders MatchBadge + breakdown card + skills tags + SkillGapSection
```

List recommendations (behavior change, same shape):

```text
GET /api/jobs/recommended -> getRecommendedJobs(userId)
  → each job score now computed with computeMatchPercentage (was raw skill-overlap %)
  → IMatchResult shape unchanged ({ job, score, matchedSkills })
  → sorted by weighted score desc, track tiebreak unchanged
```

## API Testing (Postman)

Base URL: `http://localhost:5000` — port controlled by the `PORT` env var (`careerforge-backend/.env`; default 5000). All routes are under the `/api` prefix mounted in `src/routes/index.ts`.

Auth for this step: the endpoint uses the project's **httpOnly-cookie** session model (cookie name `accessToken`, 15-min lifetime). In Postman you do **not** use `Authorization: Bearer`; you must let Postman store and resend the cookie set by login/register. Steps:
1. Call `POST /api/auth/register` (or `POST /api/auth/login`) — Postman automatically captures the `accessToken`/`refreshToken` Set-Cookie headers.
2. Call `GET /api/jobs/:id/match` in the same Postman session; the `accessToken` cookie is sent automatically.
3. Renew the short-lived token via `POST /api/auth/refresh` when you get a 401 after ~15 minutes.

> No `.postman_collection.json` currently exists in the repo. The blocks below are the up-to-date reference.

---

### GET /api/auth/register  (prerequisite to obtain session)

Auth: none

Headers: `Content-Type: application/json`

Body:
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "educationLevel": "Bachelor",
  "experienceLevel": "Fresher",
  "preferredTrack": "Web Development"
}
```
(`preferredTrack` accepts: `Web Development`, `App Development`, `Game Development`, `Software Engineering`, `Machine Learning`, `Data Science`, `UI UX Design`, `Marketing`. `educationLevel` accepts: `SSC`, `HSC`, `Diploma`, `Bachelor`, `Master`, `Other`.)

Success response (201): sets cookies; JSON:
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": { "_id": "...", "fullName": "Jane Doe", "email": "jane@example.com" }
}
```

Error responses:
- 400 — validation error (e.g. invalid email, password < 6 chars, invalid enum).
- 409 — duplicate email (Mongoose duplicate-key handled by global error handler).

---

### GET /api/auth/login  (alternative prerequisite)

Auth: none

Headers: `Content-Type: application/json`

Body:
```json
{ "email": "jane@example.com", "password": "SecurePass123" }
```

Success response (200): sets `accessToken`/`refreshToken` cookies; returns the public user object.

Error responses:
- 400 — missing/invalid fields.
- 401 — invalid credentials (`Invalid email or password`).

---

### GET /api/jobs/:id/match  (new Step 9 endpoint)

Auth: **required** — httpOnly `accessToken` cookie from a prior register/login call (Postman sends it automatically).

Headers: none required for the body, but results vary with the logged-in user's `skills`, `experienceLevel`, and `preferredTrack`. Use a valid MongoDB ObjectId for `:id` (any value in the seeded `{}` job collection, e.g. from `GET /api/jobs`).

No request body (GET).

Success response (200):
```json
{
  "success": true,
  "message": "Job match analysis fetched successfully",
  "data": {
    "job": { "_id": "...", "title": "...", "requiredSkills": ["HTML", "CSS", "JavaScript"], "experienceLevel": "Fresher", "track": "Web Development", "..." : "..." },
    "matchPercentage": 73,
    "matchedSkills": ["HTML", "CSS"],
    "missingSkills": ["JavaScript"],
    "breakdown": { "skillOverlap": 67, "experienceAlignment": 100, "trackAlignment": 100 },
    "reasons": [
      "Partial skill match: you have 2 of 3 required skills.",
      "Fresher experience level is a perfect fit for you.",
      "Matches your preferred track (Web Development)."
    ],
    "learningLinks": [
      { "skill": "JavaScript", "resources": [ { "_id": "...", "title": "JS for Beginners", "platform": "freeCodeCamp", "url": "https://...", "cost": "Free" } ] }
    ]
  }
}
```
(`reason` rows follow the exact `buildReasons` wording; aggregate `matchPercentage` = `round(0.6*skillOverlap + 0.25*experienceAlignment + 0.15*trackAlignment)`.)

Error responses:
- 401 — missing/invalid `accessToken` cookie → `{ "success": false, "message": "You are not logged in. Please log in first." }` (or invalid-token variant).
- 400 — invalid ObjectId for `:id` (mongoose CastError → `Invalid _id: <value>`).
- 404 — user not found, or job not found → `{ "success": false, "message": "Job not found" }`.
- 429 — rate-limited (10 match requests / 60 s / IP) → `{ "success": false, "message": "Too many requests. Please slow down and try again later." }`.

Suggested call order:
1. `POST /api/auth/register` → capture cookies.
2. `GET /api/jobs` → copy a job `_id`.
3. `GET /api/jobs/:id/match` → review the analysis.
4. (Optional) `PUT /api/profile` to change `skills`/`experienceLevel`/`preferredTrack`, then re-run step 3 to see scores change.

---

### GET /api/jobs/recommended  (changed behavior — scoring only)

Auth: required (httpOnly cookie).

Success response (200): array of `{ job, score, matchedSkills }`. `score` is now the weighted composite percent (was raw skill-overlap %). No request body.

Errors: same auth/429 handling.

---

## Environment Variables Added

None. No new env vars were introduced for this step. The endpoint reuses existing `PORT`, the existing JWT cookie environment, and the rate limiter's Redis/fallback (existing `REDIS_URL` / no config).

## Known Gaps / TODOs

- **`cn@^0.2.5` added but unused** — installed by the shadcn tooltip generator but never imported (tooltip uses `cn` from `@/lib/utils`). Safe to remove from `package.json`/lockfile.
- **AGENTS.md status table is stale** — lists Steps 9–13 as "Not started" though this step is implemented in the working tree.
- **Param validation** — `GET /api/jobs/:id/match` does not use `validateRequest(jobIdParamSchema)`. That middleware only validates `req.body` (would reject the empty body), so invalid ObjectIds fall through to the mongoose `CastError` → 400 path, matching the existing `/jobs/:id` convention. Plan originally listed `validateRequest`; it was intentionally dropped.
- **`extractedSkills` still unused in matching** — matching reads only the user's manually-declared `skills` array (pre-existing limitation, not introduced here).
- **`/api/jobs/recommended` users see re-ranked results** — the weighted formula changes ordering vs. the old pure skill-overlap score; intended, but any screenshot/snapshot tests based on old ordering will shift.
- **Get & load**: `getRecommendedJobs` fetches the entire job collection each call (pre-existing; no pagination/caching added in this step).
- **Tooltip ARIA/animation**: shadcn's default tooltip content applies `animate-in`/`zoom-in` classes which require `tw-animate-css`; that package is already a dependency, so no change was needed.
- **No automated tests** — the repo has no test framework; Step 9 adds none. `scripts/smokeTest.ts` (Step 8) does not cover the new endpoint.

## Testing

- No automated tests exist for Step 9 (the project has no test framework installed).
- Manual verification performed during implementation:
  - Backend: `npm run lint` (0 errors, 2 pre-existing `any` warnings in `globalErrorHandler.ts`) and `npm run build` (tsc passes).
  - Frontend: `npm run lint` (clean) and `npm run build` (Next.js production build succeeds; only pre-existing `middleware`→`proxy` deprecation warning).
- Recommended manual checks: confirm `matchPercentage` is reproducible for identical user+job inputs; confirm `reasons[]` text matches the `buildReasons` branches for strong/partial/limited, exact/adjacent/distant experience, and exact/related/unrelated track; confirm every `missingSkills` entry appears in `learningLinks` (possibly with an empty `resources` array); confirm the detail page renders correctly even when `/match` returns an error (graceful `.catch(() => null)`).