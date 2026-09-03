# Step 04 — Seed Jobs & Resources + Pages

## Summary
Step 4 delivers the Job Opportunity and Learning Resource modules: backend Mongoose models, list/detail APIs, idempotent seed scripts (21 jobs across all 8 tracks + 20 learning resources), and the frontend pages to browse them. This is the largest single step in Phase 1 — after this, a registered user can build a profile (Step 3) and then browse job opportunities and learning resources (this step). It also includes a pre-step cleanup that removes unused `express-session`/`ts-node-dev`, fixes `COOKIE_SECURE` for local HTTP, and completes the `.env.example` docs.

> **Note on roadmap status:** `AGENTS.md` now marks Step 4 as "Done", and the work exists in the current **uncommitted working tree** (see Scope Documented). It has been verified via clean `lint`/`build` on both packages and idempotent seed runs.

## Scope Documented
- **Scope:** uncommitted working-tree changes vs. `HEAD` (`3cf2651`, the Step 3 commit). No branch or commits were created for this step.
- **How determined:** `git status` / `git diff HEAD`. All Step 4 code is untracked or unstaged; nothing related has been committed.
- Files in this diff (modified): `AGENTS.md`, `careerforge-backend/.env.example`, `careerforge-backend/package.json`, `careerforge-backend/package-lock.json`, `careerforge-backend/src/routes/index.ts`, `careerforge-backend/tsconfig.json`, plus `docs/step4_plan.md`.
- Additional untracked paths created for this step: `careerforge-backend/seed/`, `careerforge-backend/src/app/modules/jobOpportunity/`, `careerforge-backend/src/app/modules/learningResource/`, `careerforge-frontend/src/app/(protected)/jobs/`, `careerforge-frontend/src/app/(protected)/resources/`, `careerforge-frontend/src/components/JobCard.tsx`, `careerforge-frontend/src/types/job.ts`, `careerforge-frontend/src/types/resource.ts`.
- **Note:** `careerforge-backend/.env` was edited directly (set `COOKIE_SECURE=false`) but is gitignored, so it does not appear in `git status`.

## Pre-Step Cleanup
| # | File | Change | Why |
|---|------|--------|-----|
| 1 | `careerforge-backend/.env:7` (gitignored) | `COOKIE_SECURE` `true` → `false` | Browsers won't store `secure: true` cookies over plain-HTTP localhost, so auth could silently fail |
| 2 | `careerforge-backend/package.json` | Removed `express-session` (deps) + `@types/express-session` (devDeps) | Unused — project uses httpOnly cookies, not session middleware |
| 3 | `careerforge-backend/package.json` | Moved `@types/bcrypt` from `dependencies` → `devDependencies` | Type packages are dev-only |
| 4 | `careerforge-backend/package.json` | Removed `ts-node-dev` from devDependencies | Dead dependency (replaced by `tsx`) |
| 5 | `careerforge-backend/.env.example` | Added `COOKIE_SECURE=false`, `NODE_ENV=development` | Missing vars that already exist in `.env` / `env.ts` |

## Backend Changes
| File | Change |
|------|--------|
| `src/app/modules/jobOpportunity/jobOpportunity.interface.ts` (NEW) | `IExternalLinks` (`linkedin?`, `bdjobs?`, `glassdoor?`) and `IJobOpportunity` interfaces. Note `experienceLevel` typed as `"Fresher" \| "Junior" \| "Mid"`; `type` as `"Internship" \| "Part-time" \| "Full-time" \| "Freelance"`. |
| `src/app/modules/jobOpportunity/jobOpportunity.constant.ts` (NEW) | `JOB_TYPES` const array with derived union types; reuses `EXPERIENCE_LEVELS` and `PREFERRED_TRACKS` imported from `../user/user.constant.js`. Exports `JobType`, `JobExperienceLevel`, `JobTrack`. |
| `src/app/modules/jobOpportunity/jobOpportunity.model.ts` (NEW) | Mongoose schema with `title`/`company`/`location`/`description` (required, trimmed), `requiredSkills` (`String[]`, default `[]`), `experienceLevel`/`track` (enum from user constants), `type` (enum `JOB_TYPES`), and a nested `externalLinksSchema` (`_id: false`). **No timestamps** — jobs are seed data. |
| `src/app/modules/jobOpportunity/jobOpportunity.validation.ts` (NEW) | Zod v4 schemas: `queryJobsSchema` (optional `track`/`location`/`type`/`search`), `jobIdParamSchema` (`id` min 1), `createJobSchema` (validates required fields, external link URLs via `z.url()`). Exports `QueryJobsInput`, `CreateJobInput`. |
| `src/app/modules/jobOpportunity/jobOpportunity.service.ts` (NEW) | `listJobs(filters)` builds a Mongo query: exact match on `track`/`type`, case-insensitive regex on `location`, `$or` regex on `title`+`company` for `search`; sorts by `createdAt` desc. `getJobById(id)` throws `AppError(404, "Job not found")` if missing. |
| `src/app/modules/jobOpportunity/jobOpportunity.controller.ts` (NEW) | `listJobs` and `getJobById` — thin `catchAsync` handlers. `req.query` values are cast to `QueryJobsInput`; `req.params.id` is handled as `string \| string[]` (Express v5) via `Array.isArray()` unwrap. |
| `src/app/modules/jobOpportunity/jobOpportunity.routes.ts` (NEW) | Router: `GET /` (list, no auth), `GET /recommended` (auth-guarded stub, reuses `listJobs`), `GET /:id` (detail, no auth). Exported as `JobOpportunityRoutes`. |
| `src/app/modules/learningResource/learningResource.interface.ts` (NEW) | `ILearningResource` (`title`, `platform`, `url`, `relatedSkills`, `cost`). |
| `src/app/modules/learningResource/learningResource.constant.ts` (NEW) | `RESOURCE_COSTS = ["Free", "Paid"]` + `ResourceCost` type. |
| `src/app/modules/learningResource/learningResource.model.ts` (NEW) | Mongoose schema: `title`/`platform`/`url` (required, trimmed), `relatedSkills` (`String[]`, default `[]`), `cost` (enum `RESOURCE_COSTS`). **No timestamps.** |
| `src/app/modules/learningResource/learningResource.validation.ts` (NEW) | `queryResourcesSchema` (optional `skill`), `resourceIdParamSchema`, `createResourceSchema` (with `z.url`). Exports `QueryResourcesInput`, `CreateResourceInput`. |
| `src/app/modules/learningResource/learningResource.service.ts` (NEW) | `listResources(filters)` matches `relatedSkills` via case-insensitive regex on `skill`; sorts by `cost` asc then `title` asc. `getResourceById` throws `AppError(404, "Resource not found")`. |
| `src/app/modules/learningResource/learningResource.controller.ts` (NEW) | `listResources` and `getResourceById` — thin `catchAsync` handlers; same `req.params.id` string-or-array handling. |
| `src/app/modules/learningResource/learningResource.routes.ts` (NEW) | Router: `GET /`, `GET /recommended` (auth stub), `GET /:id`. Exported as `LearningResourceRoutes`. |
| `src/routes/index.ts` (MODIFIED) | Imported and mounted `JobOpportunityRoutes` at `/jobs` and `LearningResourceRoutes` at `/resources`, alongside existing `/auth` and `/profile`. |
| `careerforge-backend/tsconfig.json` (MODIFIED) | Added `"include": ["src"]` and `"exclude": ["node_modules", "dist", "seed"]`. Fixes TS6059 (`rootDir`/`include` mismatch) so `tsc` (used by `npm run build`) no longer tries to compile `seed/` and trips over the `.js`-extension import style. |

### Seed Scripts (`careerforge-backend/seed/`)
| File | Description |
|------|-------------|
| `seed/seedJobs.ts` | 21 jobs covering all 8 tracks (Web, App, Game, Software Eng, ML, Data Science, UI/UX, Marketing), each with 3–6 required skills, a multi-paragraph description, mixed BD startup / remote-friendly companies, and a mix of `externalLinks` (some populated, some `{}`). Exports `seedJobs()` = `deleteMany({})` + `insertMany(jobs)` returning the count (idempotent, destructive). |
| `seed/seedResources.ts` | 20 learning resources mapped to common skills (HTML/CSS, JS, React, Python, Node, MongoDB, Figma/UI, Excel/Data, Communication, Marketing, ML). Each has title, platform, URL, 2–5 related skills, `cost` Free/Paid. Exports `seedResources()` = `deleteMany({})` + `insertMany(resources)`. |
| `seed/runSeed.ts` | Runner: connect to Mongo via `env.MONGODB_URI` → `seedJobs()` → `seedResources()` → log counts → disconnect. Wired up as `npm run seed`. |

## Frontend Changes
| File | Change |
|------|--------|
| `src/types/job.ts` (NEW) | `ExternalLinks`, `Job`, and `JobType` interfaces mirroring the backend model. `experienceLevel` reuses the frontend `ExperienceLevel` union from `types/user.ts`. |
| `src/types/resource.ts` (NEW) | `LearningResource` interface (`_id`, `title`, `platform`, `url`, `relatedSkills`, `cost`). |
| `src/components/JobCard.tsx` (NEW) | Reusable job card: title + type badge (variant mapped by `typeVariant`), company · location line with `MapPin` icon, up to 5 skill badges (+N overflow), and a "View Details →" ghost button linking to `/jobs/${job._id}`. |
| `src/app/(protected)/jobs/page.tsx` (NEW) | Client component. On mount fetches `GET /api/jobs` via `serverFetch`, then filters **client-side** with `useMemo` over `useState` values (search, track, type, location). Filter bar: search input, track Select (8 tracks), type Select (4 types), location input. Grid of `JobCard`s with loading + empty states. |
| `src/app/(protected)/jobs/[id]/page.tsx` (NEW) | Client component. Reads `id` via `useParams()`, fetches `GET /api/jobs/:id` via `serverFetch`; on failure navigates back to `/jobs`. Renders a full detail card: title, company · location, type badge, experience + track, required-skill badges, description (with `whitespace-pre-line`), and external link buttons (LinkedIn/BDjobs/Glassdoor) only when present. "← Back to Jobs" button. |
| `src/app/(protected)/resources/page.tsx` (NEW) | Client component. Fetches `GET /api/resources` via `serverFetch`, builds a deduplicated sorted skill list for the filter Select, and filters resources by the selected skill. Resource cards show title, cost badge (Free = secondary / Paid = outline), platform, related-skill badges, and an "Open resource" external-link button (`target="_blank"`). |

**API integration:** all frontend calls go through `src/lib/serverFetch.ts` (unchanged), which prepends `/api`, sends `credentials: "include"`, auto-refreshes on 401, and unwraps the backend `{ success, message, data }` envelope to return `data`.

## Third-Party Packages Used
**No new packages were introduced for this step.** `git diff` on both `careerforge-backend/package.json` and `careerforge-frontend/package.json` shows only removals (backend cleanup — `express-session`, `ts-node-dev` dropped; no additions).

Packages already present that were reused, with their role in this step:
- `express` (backend) — the two new module routers (`JobOpportunityRoutes`, `LearningResourceRoutes`) mounted in `src/routes/index.ts`.
- `mongoose` (backend) — `JobOpportunity` and `LearningResource` schemas/models. **Note:** the models do **not** enable `timestamps`, so sorting is by `createdAt`/`title`/`cost` as relevant, and documents created by `insertMany` receive `_id` but no `createdAt`/`updatedAt`.
- `zod` (backend v4) — `queryJobsSchema`, `queryResourcesSchema`, etc.
- `lucide-react` (frontend) — `MapPin`, `Search`, `ExternalLink`, `ArrowLeft` icons.
- shadcn/ui components (frontend) — `Card`, `Badge`, `Button`, `Input`, `Label`, `Select`, `Separator` from `src/components/ui/`.

## Request/Data Flow

### List jobs (frontend → backend)
```text
Jobs page mounts (client component)
    → GET /api/jobs via serverFetch (auto-proxied by Next.js, no auth needed)
    → JobOpportunityController.listJobs
        → casts req.query { track, location, type, search } → QueryJobsInput
        → JobOpportunityServices.listJobs(filters)
        → JobOpportunity.find(query).sort({ createdAt: -1 })
    → response: 200 { success, message: "Jobs retrieved successfully", data: Job[] }
    → jobs/page.tsx setJobs(data); filter client-side via useMemo
```

### View a job detail (frontend → backend)
```text
User clicks a JobCard "View Details →"
    → Next.js routes to /jobs/[id]
    → GET /api/jobs/:id via serverFetch
    → JobOpportunityController.getJobById → unwraps req.params.id (string | string[])
    → JobOpportunityServices.getJobById(id) → JobOpportunity.findById(id)
        → throws AppError(404, "Job not found") if missing
    → response: 200 { success, data: Job }
    → jobs/[id]/page.tsx setJob(data); on error router.push("/jobs")
```

### List resources (frontend → backend)
```text
Resources page mounts (client component)
    → GET /api/resources via serverFetch (no auth)
    → LearningResourceController.listResources → casts req.query.skill
    → LearningResourceServices.listResources({ skill })
        → regex match on relatedSkills; sort({ cost: 1, title: 1 })
    → response: 200 { success, message: "Resources retrieved successfully", data: LearningResource[] }
    → resources/page.tsx setResources(data); dedupe skills for filter
```

**Auth/authorization:** `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/resources`, and `GET /api/resources/:id` are **public** (no `authMiddleware`). Only the `/recommended` stub routes are auth-guarded, and they currently just reuse the same list handler — real matching is deferred to Step 5.

## API Testing (Postman)
- **Base URL:** `http://localhost:5000/api` (port controlled by `PORT` in `careerforge-backend/.env`, default `5000`).
- **Auth:** none required for the list/detail endpoints below.
- **No Postman collection** exists in the repo; the blocks below can be copied directly.

### GET /api/jobs
**Auth:** none
**Query params (all optional):** `track`, `location`, `type`, `search`
- `track=Web Development` — exact match.
- `location=Dhaka` — case-insensitive substring.
- `type=Full-time` — exact match.
- `search=frontend` — case-insensitive against `title`/`company`.

**Success response (200):**
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": [
    {
      "_id": "...",
      "title": "Frontend Developer",
      "company": "Smart Soult Bangladesh",
      "location": "Dhaka",
      "requiredSkills": ["React", "TypeScript", "Tailwind CSS", "HTML", "CSS"],
      "experienceLevel": "Junior",
      "type": "Full-time",
      "track": "Web Development",
      "description": "We are looking for a passionate Frontend Developer...",
      "externalLinks": {
        "linkedin": "https://linkedin.com/jobs/view/frontend-developer-smart-soult",
        "bdjobs": "https://bdjobs.com/job/frontend-developer",
        "glassdoor": ""
      }
    }
  ]
}
```
*(Untracked seed fields like `glassdoor` omitted by Mongo appear as empty when populated; `externalLinks` defaults to `{}` if absent.)*

### GET /api/jobs/:id
**Auth:** none

**Success response (200):** `{ success, message: "Job retrieved successfully", data: { ...full job... } }`

**Error response (404):**
```json
{
  "success": false,
  "message": "Job not found",
  "errorSources": [{ "path": "", "message": "Job not found" }]
}
```

### GET /api/resources
**Auth:** none
**Query param (optional):** `skill` — e.g. `skill=JavaScript` (case-insensitive match on `relatedSkills`).

**Success response (200):**
```json
{
  "success": true,
  "message": "Resources retrieved successfully",
  "data": [
    {
      "_id": "...",
      "title": "The Complete JavaScript Course 2026",
      "platform": "Udemy",
      "url": "https://www.udemy.com/course/the-complete-javascript-course/",
      "relatedSkills": ["JavaScript", "ES6", "DOM", "Async/Await"],
      "cost": "Paid"
    }
  ]
}
```

### GET /api/resources/:id
**Auth:** none. **Success (200):** full resource. **Error (404):** `"Resource not found"`.

### GET /api/jobs/recommended & GET /api/resources/recommended
**Auth:** required (`accessToken` httpOnly cookie). **Stubs:** return all jobs / all resources (real matching is Step 5).

### Suggested test order
1. Run `npm run seed` (backend) to populate `JobOpportunity` (21) + `LearningResource` (20).
2. `GET /api/jobs` — full list.
3. `GET /api/jobs?track=Web Development&type=Full-time&search=frontend` — filtered.
4. `GET /api/jobs/:id` (take an `_id` from list) — single job; then an invalid id → 404.
5. `GET /api/resources?skill=Python` — filtered.
6. `GET /api/resources/:id` — single resource; invalid id → 404.
7. Re-run `npm run seed` and confirm the same counts (idempotent).

## Environment Variables Added
**None added for this step.** No new env vars are introduced. The existing backend `.env` (`MONGODB_URI` pointing to Atlas) is sufficient for seeding. `COOKIE_SECURE` was **changed** (pre-step cleanup #1: `true` → `false`) in the gitignored `.env` and documented in `.env.example`.

## Known Gaps / TODOs
- **`/api/jobs/recommended` and `/api/resources/recommended` are stubs** — they return all results. Real rule-based matching (skill-overlap scoring) is Step 5.
- **No pagination** — list endpoints return all matching results. `sendResponse` already supports `meta` pagination fields for later.
- **No job posting dates** — the `JobOpportunity` model has no `postedAt`; also no `timestamps` on the schema, so `sort({ createdAt: -1 })` has no field to sort by for seed data (seeds have no `createdAt`). Acceptable for seed data but a gap for a production job board.
- **Dashboard remains a placeholder** — the full dashboard (profile summary + top jobs + resources) is Step 6.
- **Frontend `.env` remains empty** — works because `next.config.ts` falls back to `http://localhost:5000/api`.
- **`serverFetch` uses `redirect()` from `next/navigation`** — works only in browser context (client components). Jobs/resources pages are client components, so this is fine here, but Step 6 (dashboard) may need a different approach for server components.
- **Seed `/recommended` routes headers:** The auth-guarded stub routes currently call the same `listJobs`/`listResources` controller regardless of identity — they ignore `req.user`. This is intentional for the stub and will be replaced in Step 5.
- **`age` of seed entries / no timestamps:** because the job schema has no `timestamps`, `sort({ createdAt: -1 })` is effectively a stable seed-order sort (Mongo preserves array/insertion order without a sort field). Not a bug for the current seed, but worth revisiting if `createdAt`-based sorting is expected later.

## Testing
- **Automated tests:** none — the repo has no test framework (per `AGENTS.md`).
- **Static checks run and passing:**
  - Backend `npm run build` (`tsc`) — passes. One fix applied during implementation: `tsconfig.json` needed `"include": ["src"]` + `"exclude": ["node_modules", "dist", "seed"]` to stop `tsc` from compiling `seed/` (TS6059) and to keep the seed scripts out of the build output.
  - Backend `npm run lint` — passes (2 pre-existing `no-explicit-any` warnings in `globalErrorHandler.ts`, unrelated to this step).
  - Frontend `npm run lint` — passes clean.
  - Frontend `npm run build` (`next build`) — passes; the jobs list, job detail, and resources routes all compile.
- **Manual API verification (in-session):** `npm run seed` was run twice and produced identical counts (21 jobs + 20 resources), confirming idempotency; all 6 endpoints (jobs list/detail, resources list/detail, plus stub review) were verified against the running backend.
- **Not covered:** no automated regression tests for the new endpoints, and no end-to-end browser test of the Jobs/Resources page interactions.
