# Step 04 — Seed Jobs & Resources + Pages

> **Date:** 2026-09-04
> **Prerequisite:** Steps 1–3 complete (scaffolding, auth, profile)
> **Reference:** `docs/project_plan_v1.md` (Step 4 section), `CAREER_FORGE.md` (data models, API endpoints)

---

## Summary

Step 4 builds the Job Opportunity and Learning Resource modules — backend models, APIs, seed data — plus the frontend pages to browse them. This is the largest single step in Phase 1 and makes the platform useful: users can register, build a profile, then browse jobs and learning resources.

Decisions confirmed during planning:
- **Public browsing:** `/api/jobs` and `/api/resources` list/detail endpoints do **not** require authentication. Only `/recommended` requires auth.
- **Seed strategy:** `deleteMany({})` + `insertMany()` — destructive but simple, truly idempotent. Data is replaced each run.
- **Page rendering:** Jobs and Resources pages are **client components** with `useState` for filter state and client-side fetch via `serverFetch`. Consistent with the profile page pattern.

---

## Pre-Step 4 Cleanup

Fix technical debt from Steps 1–3 before building on top.

| # | Issue | File | Change | Why |
|---|-------|------|--------|-----|
| 1 | `COOKIE_SECURE=true` on localhost HTTP — browsers won't store `secure: true` cookies over plain HTTP, so auth may silently fail | `careerforge-backend/.env:7` | `true` → `false` | Cookies must work on `http://localhost` |
| 2 | `express-session` + `@types/express-session` installed but unused (project uses httpOnly cookies) | `careerforge-backend/package.json` | Remove from `dependencies` and `devDependencies` | ~200KB saved, eliminates confusion |
| 3 | `@types/bcrypt` in `dependencies` instead of `devDependencies` | `careerforge-backend/package.json` | Move to `devDependencies` | Type packages are dev-only |
| 4 | `ts-node-dev` still in `devDependencies` despite being replaced by `tsx` | `careerforge-backend/package.json` | Remove from `devDependencies` | Dead dependency |
| 5 | `.env.example` missing `COOKIE_SECURE` and `NODE_ENV` variables that exist in `.env` / `env.ts` | `careerforge-backend/.env.example` | Add `COOKIE_SECURE=false` and `NODE_ENV=development` | Documentation completeness |

---

## Backend Changes

### New Files

#### Job Opportunity Module (7 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/app/modules/jobOpportunity/jobOpportunity.interface.ts` | `IJobOpportunity` TypeScript interface |
| 2 | `src/app/modules/jobOpportunity/jobOpportunity.constant.ts` | `JOB_TYPES` array + derived union type |
| 3 | `src/app/modules/jobOpportunity/jobOpportunity.model.ts` | Mongoose schema |
| 4 | `src/app/modules/jobOpportunity/jobOpportunity.validation.ts` | Zod v4 query/filter validation schemas |
| 5 | `src/app/modules/jobOpportunity/jobOpportunity.service.ts` | Business logic: list (with filters), getById |
| 6 | `src/app/modules/jobOpportunity/jobOpportunity.controller.ts` | Thin HTTP handlers |
| 7 | `src/app/modules/jobOpportunity/jobOpportunity.routes.ts` | Express Router |

#### Learning Resource Module (7 files)

| # | File | Purpose |
|---|------|---------|
| 8 | `src/app/modules/learningResource/learningResource.interface.ts` | `ILearningResource` TypeScript interface |
| 9 | `src/app/modules/learningResource/learningResource.constant.ts` | `RESOURCE_COSTS` array |
| 10 | `src/app/modules/learningResource/learningResource.model.ts` | Mongoose schema |
| 11 | `src/app/modules/learningResource/learningResource.validation.ts` | Zod v4 query/filter validation schemas |
| 12 | `src/app/modules/learningResource/learningResource.service.ts` | Business logic: list (with skill filter), getById |
| 13 | `src/app/modules/learningResource/learningResource.controller.ts` | Thin HTTP handlers |
| 14 | `src/app/modules/learningResource/learningResource.routes.ts` | Express Router |

#### Seed Scripts (3 files)

| # | File | Purpose |
|---|------|---------|
| 15 | `seed/seedJobs.ts` | 15–20+ job entries covering all 8 tracks, entry-level focused |
| 16 | `seed/seedResources.ts` | 15–20+ learning resources mapped to common skills |
| 17 | `seed/runSeed.ts` | Runner: connect → seed jobs → seed resources → disconnect |

### Modified Files

| # | File | Change |
|---|------|--------|
| 18 | `src/routes/index.ts` | Import and mount `JobOpportunityRoutes` at `/jobs`, `LearningResourceRoutes` at `/resources` |
| 19 | `careerforge-backend/.env` | Set `COOKIE_SECURE=false` (pre-step cleanup #1) |
| 20 | `careerforge-backend/.env.example` | Add `COOKIE_SECURE=false`, `NODE_ENV=development` (pre-step cleanup #5) |

---

## Frontend Changes

### New Files

#### Types (2 files)

| # | File | Purpose |
|---|------|---------|
| 21 | `src/types/job.ts` | `Job`, `JobType`, `ExternalLinks` types mirroring backend model |
| 22 | `src/types/resource.ts` | `LearningResource` type mirroring backend model |

#### Components (1 file)

| # | File | Purpose |
|---|------|---------|
| 23 | `src/components/JobCard.tsx` | Reusable job listing card: title, company, location, type badge, skill badges, link to `/jobs/[id]` |

#### Pages (3 files)

| # | File | Purpose |
|---|------|---------|
| 24 | `src/app/(protected)/jobs/page.tsx` | Client component — job list + filter sidebar (track, location, type, search) |
| 25 | `src/app/(protected)/jobs/[id]/page.tsx` | Job detail — full info, skills, external links, back button |
| 26 | `src/app/(protected)/resources/page.tsx` | Client component — resource list + skill filter |

---

## Data Models

### `JobOpportunity` — `modules/jobOpportunity/jobOpportunity.model.ts`

```ts
{
  _id: ObjectId,
  title: string,               // required, trimmed
  company: string,             // required, trimmed
  location: string,            // required, trimmed (e.g. "Dhaka", "Remote")
  requiredSkills: string[],    // default: []
  experienceLevel: "Fresher" | "Junior" | "Mid",
  type: "Internship" | "Part-time" | "Full-time" | "Freelance",
  track: string,               // one of PREFERRED_TRACKS
  description: string,         // required, detailed job description
  externalLinks: {
    linkedin?: string,
    bdjobs?: string,
    glassdoor?: string
  }
}
```

No `timestamps` — jobs are seed data, not user-generated.

### `LearningResource` — `modules/learningResource/learningResource.model.ts`

```ts
{
  _id: ObjectId,
  title: string,               // required, trimmed
  platform: string,            // required (e.g. "YouTube", "Coursera", "Udemy")
  url: string,                 // required, valid URL
  relatedSkills: string[],     // default: []
  cost: "Free" | "Paid"
}
```

No `timestamps` — resources are seed data.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/jobs` | No | List jobs. Query params: `track`, `location`, `type`, `search` |
| GET | `/api/jobs/:id` | No | Job detail by ID |
| GET | `/api/jobs/recommended` | Yes | Stub — returns all jobs sorted by track (real matching in Step 5) |
| GET | `/api/resources` | No | List resources. Query param: `skill` (filters by `relatedSkills`) |
| GET | `/api/resources/:id` | No | Resource detail by ID |
| GET | `/api/resources/recommended` | Yes | Stub — returns all resources (real matching in Step 5) |

### Query Parameter Details

**GET `/api/jobs`:**
| Param | Type | Behavior |
|-------|------|----------|
| `track` | string | Exact match against `track` field |
| `location` | string | Case-insensitive regex match against `location` field |
| `type` | string | Exact match against `type` field |
| `search` | string | Case-insensitive regex match against `title` and `company` fields |

**GET `/api/resources`:**
| Param | Type | Behavior |
|-------|------|----------|
| `skill` | string | Case-insensitive match against any element in `relatedSkills` array |

---

## Seed Data Design

### Jobs (15–20+ entries)

Coverage across tracks, types, and experience levels:

| Track | # Jobs | Types | Levels | Locations |
|-------|--------|-------|--------|-----------|
| Web Development | 3–4 | Full-time, Internship, Freelance | Fresher, Junior | Dhaka, Remote |
| App Development | 2–3 | Full-time, Internship | Junior, Fresher | Dhaka, Chittagong |
| Game Development | 1–2 | Full-time, Freelance | Junior | Remote, Dhaka |
| Software Engineering | 2–3 | Full-time, Part-time | Junior, Mid | Dhaka, Sylhet |
| Machine Learning | 2 | Full-time, Internship | Junior, Fresher | Remote, Dhaka |
| Data Science | 2–3 | Full-time, Part-time | Fresher, Junior | Dhaka, Chittagong |
| UI UX Design | 2 | Full-time, Freelance | Junior | Dhaka, Remote |
| Marketing | 1–2 | Full-time, Part-time | Fresher, Junior | Dhaka |

Each job has:
- 3–6 required skills (realistic for the role)
- A multi-paragraph description
- A mix of Bangladeshi startup/company names and remote-friendly companies
- External links: some with placeholder URLs, some empty

### Resources (15–20+ entries)

| Skill Area | # Resources | Platforms | Cost Mix |
|-----------|-------------|-----------|----------|
| HTML / CSS | 2 | freeCodeCamp, YouTube | Free |
| JavaScript | 2–3 | Udemy, Coursera, YouTube | Free + Paid |
| React | 2 | Udemy, Official Docs | Free + Paid |
| Python | 2 | Coursera, YouTube | Free + Paid |
| Node.js | 1–2 | Udemy, YouTube | Paid + Free |
| MongoDB | 1 | freeCodeCamp, YouTube | Free |
| Figma / UI Design | 2 | Coursera, YouTube | Free + Paid |
| Excel / Data Analysis | 1–2 | Coursera, YouTube | Free + Paid |
| Communication Skills | 1 | Coursera | Free |
| General Career Development | 1–2 | YouTube, Local platform | Free |

Each resource has:
- A realistic title (e.g. "The Complete JavaScript Course 2026")
- A real or realistic platform name
- A real or realistic URL (e.g. `https://www.youtube.com/watch?v=...`)
- 2–5 related skills
- Cost marked as "Free" or "Paid"

---

## Frontend Page Design

### Jobs Page (`/jobs`)

```
┌─────────────────────────────────────────────────┐
│  Jobs                                    [Search] │
├──────────┬──────────────────────────────────────┤
│ Filters  │  JobCard  │  JobCard  │  JobCard     │
│          │           │           │              │
│ Track:   │  JobCard  │  JobCard  │  JobCard     │
│ [Select] │           │           │              │
│          │  JobCard  │  JobCard  │  JobCard     │
│ Location:│           │           │              │
│ [Input]  │                                   │
│          │  No results message (if empty)      │
│ Type:    │                                      │
│ [Select] │                                      │
└──────────┴──────────────────────────────────────┘
```

- **Client component** (`"use client"`)
- On mount: fetch `GET /api/jobs` via `serverFetch`
- Filter state: `useState` for track, location, type, search query
- Filters update a `useMemo` or trigger re-fetch
- Grid layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Loading state: skeleton or "Loading jobs..." text
- Empty state: "No jobs found matching your criteria."

### Job Detail Page (`/jobs/[id]`)

```
┌─────────────────────────────────────────────────┐
│  ← Back to Jobs                                 │
│                                                  │
│  Job Title                              [Type]   │
│  Company Name · Location                        │
│  Experience: Junior                              │
│                                                  │
│  Required Skills                                 │
│  [React] [Node.js] [MongoDB] [TypeScript]       │
│                                                  │
│  Description                                     │
│  Lorem ipsum dolor sit amet...                   │
│                                                  │
│  External Links                                  │
│  [LinkedIn] [BDjobs] [Glassdoor]                │
└─────────────────────────────────────────────────┘
```

- **Server component** or **client component** — fetches by dynamic `[id]` param
- Uses `serverFetch` (or direct `fetch` if server component)
- Shows all job fields in a clean card layout
- External links section only rendered if links exist
- Back navigation to `/jobs`

### Resources Page (`/resources`)

```
┌─────────────────────────────────────────────────┐
│  Learning Resources                              │
├─────────────────────────────────────────────────┤
│  Filter by skill: [Select or Input]              │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Resource Card │  │ Resource Card │             │
│  │ Coursera      │  │ YouTube       │             │
│  │ Free          │  │ Paid          │             │
│  │ [JS] [React]  │  │ [Python]      │             │
│  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Resource Card │  │ Resource Card │             │
│  │ ...           │  │ ...           │             │
│  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
```

- **Client component** (`"use client"`)
- On mount: fetch `GET /api/resources` via `serverFetch`
- Skill filter: selects from a deduplicated list of all skills across resources
- Resource cards show: title, platform, cost badge (Free/Paid colored differently), related skills as badges
- Links open in new tab (`target="_blank"`)

### JobCard Component

```tsx
<Card className="hover:shadow-md transition-shadow">
  <CardHeader className="pb-2">
    <div className="flex items-start justify-between">
      <CardTitle className="text-lg">{job.title}</CardTitle>
      <Badge variant={typeBadgeVariant}>{job.type}</Badge>
    </div>
    <CardDescription>{job.company} · {job.location}</CardDescription>
  </CardHeader>
  <CardContent className="pb-2">
    <div className="flex flex-wrap gap-1">
      {job.requiredSkills.map(skill => (
        <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
      ))}
    </div>
  </CardContent>
  <CardFooter>
    <Link href={`/jobs/${job._id}`}>
      <Button variant="ghost" size="sm">View Details →</Button>
    </Link>
  </CardFooter>
</Card>
```

---

## Implementation Order

| Phase | Task | Depends On |
|-------|------|------------|
| 1 | Pre-step cleanup (fixes 1–5 in `.env`, `package.json`, `.env.example`) | Nothing |
| 2 | Backend: JobOpportunity module (interface → constant → model → validation → service → controller → routes) | Nothing |
| 3 | Backend: LearningResource module (same pattern) | Nothing |
| 4 | Backend: Route registration in `src/routes/index.ts` | Steps 2, 3 |
| 5 | Backend: Seed scripts (`seedJobs.ts`, `seedResources.ts`, `runSeed.ts`) | Steps 2, 3 |
| 6 | **Verify backend:** `npm run seed` + curl/Postman tests against all 6 endpoints | Steps 4, 5 |
| 7 | Frontend: Types (`types/job.ts`, `types/resource.ts`) | Nothing |
| 8 | Frontend: `JobCard` component | Step 7 |
| 9 | Frontend: Jobs page + Job detail page | Steps 7, 8 |
| 10 | Frontend: Resources page | Step 7 |
| 11 | **Verify frontend:** all pages load, filters work, seed data displays | Steps 9, 10 |
| 12 | **Final check:** `npm run lint` + `npm run build` on both packages | All above |

---

## Acceptance Criteria

- [ ] `npm run seed` runs idempotently (safe to re-run without duplicates or errors)
- [ ] 15–20+ jobs seeded in MongoDB covering all 8 tracks
- [ ] 15–20+ resources seeded in MongoDB covering common skills
- [ ] `GET /api/jobs` returns filtered results when query params are provided
- [ ] `GET /api/jobs/:id` returns a single job's full details
- [ ] `GET /api/resources` returns filtered results when `skill` param is provided
- [ ] `GET /api/resources/:id` returns a single resource's full details
- [ ] Jobs page shows a grid of job cards with working filter controls (track, location, type, search)
- [ ] Resources page shows a grid of resource cards with working skill filter
- [ ] Job detail page shows full job info including skills and external links
- [ ] Backend `npm run build` passes
- [ ] Backend `npm run lint` passes (no new errors)
- [ ] Frontend `npm run build` passes
- [ ] Frontend `npm run lint` passes (no new errors)

---

## API Testing (Postman / curl)

### GET /api/jobs
**Auth:** none

**Query params (all optional):**
- `track=Web Development`
- `location=Dhaka`
- `type=Full-time`
- `search=frontend`

**Success response (200):**
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": [
    {
      "_id": "...",
      "title": "Frontend Developer",
      "company": "TechCorp BD",
      "location": "Dhaka",
      "requiredSkills": ["React", "TypeScript", "Tailwind CSS"],
      "experienceLevel": "Junior",
      "type": "Full-time",
      "track": "Web Development",
      "description": "We are looking for...",
      "externalLinks": {
        "linkedin": "https://linkedin.com/jobs/...",
        "bdjobs": "",
        "glassdoor": ""
      }
    }
  ]
}
```

### GET /api/jobs/:id
**Auth:** none

**Success response (200):**
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "_id": "...",
    "title": "Frontend Developer",
    "company": "TechCorp BD",
    "...": "..."
  }
}
```

**Error response (404):**
```json
{
  "success": false,
  "message": "Job not found",
  "errorSources": [{ "path": "", "message": "No job found with ID ..." }]
}
```

### GET /api/resources
**Auth:** none

**Query params (all optional):**
- `skill=JavaScript`

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
      "url": "https://www.udemy.com/course/...",
      "relatedSkills": ["JavaScript", "ES6", "DOM"],
      "cost": "Paid"
    }
  ]
}
```

### GET /api/jobs/recommended
**Auth:** required (access token cookie)

Returns all jobs (stub for Step 5 matching logic).

### GET /api/resources/recommended
**Auth:** required (access token cookie)

Returns all resources (stub for Step 5 matching logic).

---

## Seed Script Usage

```bash
cd careerforge-backend

# Run the seed script
npm run seed

# Expected output:
# MongoDB connected successfully
# Seeding jobs...
# Inserted 20 jobs
# Seeding resources...
# Inserted 18 resources
# Seeding complete!
# Disconnecting from MongoDB...
```

The script is idempotent — running it multiple times replaces all seed data with a fresh copy. Safe to re-run during development.

---

## Environment Variables

No new environment variables are added in Step 4. The existing backend `.env` (with `MONGODB_URI` pointing to Atlas) is sufficient.

---

## Known Gaps / Deferred Items

1. **`/api/jobs/recommended` and `/api/resources/recommended` are stubs** — they return all results. Real matching logic is implemented in Step 5 (rule-based skill overlap scoring).

2. **No pagination** — list endpoints return all matching results. Pagination support can be added later (the `sendResponse` helper already supports `meta` pagination fields).

3. **No job posting dates** — the model doesn't include a `postedAt` field. This is acceptable for seed data but would be needed for a production job board.

4. **Dashboard remains a placeholder** — the full dashboard (profile summary + top jobs + top resources) is Step 6.

5. **Frontend `.env` remains empty** — works because `next.config.ts` falls back to `http://localhost:5000/api`.

6. **`serverFetch` uses `redirect()` from `next/navigation`** — this only works in browser context (client components). Server components need a different fetch approach. This is acceptable for Step 4 since jobs/resources pages are client components, but will need attention in Step 6 (dashboard).
