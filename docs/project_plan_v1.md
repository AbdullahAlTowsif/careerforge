# CareerForge — Project Implementation Plan v1

> **Date:** 2026-09-03
> **Codename:** CareerForge
> **SDG:** SDG 8 — Full and productive employment for all
> **Stack:** TypeScript (strict), Express, MongoDB/Mongoose, Next.js 16.3.4 App Router, Tailwind CSS + shadcn/ui

---

## Current State Assessment

### Backend (`careerforge-backend/`)
- Bare Express v5 + TypeScript skeleton with only a "Hello World" route
- Dependencies installed: bcrypt, cookie-parser, cors, dotenv, express (v5), jsonwebtoken, mongoose, zod
- No MVC structure, no models, no routes, no middleware
- `.env` file is empty
- `tsconfig.json` is configured for strict mode with `nodenext` module resolution

### Frontend (`careerforge-frontend/`)
- Default Next.js 16.3.4 App Router with Tailwind CSS v4
- Default homepage only (Vercel boilerplate)
- No shadcn/ui, no custom components, no design system configured
- Only default dependencies: next, react, react-dom, tailwindcss

### Conclusion
Both sides are blank slates with basic scaffolding. The full project needs to be built from scratch.

---

## Architecture Notes

- **No client-side auth store** (no Redux/Zustand). Session state lives entirely in httpOnly cookies set by Express.
- **`serverFetch.ts`** is the single fetch wrapper used everywhere — attaches cookies, auto-refreshes on 401, redirects to `/login` if refresh fails.
- **Next.js talks to Express over HTTP** via rewrite proxy (`/api/*` → `http://localhost:5000/api/*`). No business logic in Next.js Route Handlers.
- **Server components** for data-fetching pages, **client components** only for interactive/form UI.
- **Redis is Phase 2 only** — skip in Phase 1.
- **Payments are bonus/optional** — low priority.

---

## Phase 1 — Pre-Hack (Steps 1–7)

### Step 1: Project Scaffolding & Infrastructure

**Backend — Create MVC structure:**
- Create folders:
  - `src/app/config/` — db.ts, env.ts, jwt.ts
  - `src/app/errorHelpers/` — AppError.ts, globalErrorHandler.ts
  - `src/app/helpers/` — sendResponse.ts, catchAsync.ts
  - `src/app/interfaces/` — error.interface.ts
  - `src/app/middlewares/` — auth.middleware.ts, validateRequest.ts, notFound.ts
  - `src/app/modules/` — (empty module folders for auth, user, jobOpportunity, learningResource, jobMatching, roadmap, careerBot, aiApi, payment, upload)
  - `src/app/utils/`
  - `src/routes/` — index.ts (aggregator)
  - `seed/` — seedJobs.ts, seedResources.ts, runSeed.ts

- Create files:
  - `src/app/config/db.ts` — Mongoose connection with error handling
  - `src/app/config/env.ts` — typed env variable loader using dotenv
  - `src/app/helpers/sendResponse.ts` — standardized API response helper
  - `src/app/helpers/catchAsync.ts` — async error wrapper
  - `src/app/errorHelpers/AppError.ts` — custom error class with statusCode
  - `src/app/errorHelpers/globalErrorHandler.ts` — Express global error handler
  - `src/app/interfaces/error.interface.ts` — error type definitions
  - `src/app/middlewares/notFound.ts` — 404 handler

- Update existing:
  - `src/app.ts` — add middleware pipeline: CORS, cookie-parser, express.json, helmet, morgan, routes, notFound, globalErrorHandler
  - `src/server.ts` — connect to MongoDB first, then listen

- Populate `.env` with all required variables (with placeholder values)
- Add `src/app/config/env.ts` to validate env at startup

**Frontend — Initialize design system + core libs:**
- Initialize shadcn/ui: `npx shadcn@latest init`
- Add shadcn components: button, input, card, form, dialog, label, badge, tabs, separator, toaster
- Install packages: `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `date-fns`, `clsx`, `tailwind-merge`, `sonner`, `recharts`
- Update `globals.css` with CareerForge design system colors (convert hex → HSL CSS variables for shadcn)
- Create `src/lib/utils.ts` — `cn()` helper using clsx + tailwind-merge
- Create `src/lib/serverFetch.ts` — cookie-based fetch wrapper with auto 401 → refresh → retry logic
- Update `next.config.ts` — add rewrite proxy `/api/*` → `http://localhost:5000/api/*`
- Create `.env.local.example`

**Install missing backend packages:**
- `helmet`, `morgan`, `@types/node`, `@types/morgan`

**Acceptance Criteria:**
- [ ] `npm run dev` works on both backend (port 5000) and frontend (port 3000)
- [ ] Backend returns 200 on `GET /`
- [ ] Frontend proxy to backend works (`/api/` rewrite)

---

### Step 2: Auth & User Management

**Backend:**
- `modules/user/user.interface.ts` — TypeScript interfaces for User document
- `modules/user/user.model.ts` — Mongoose schema with ALL fields (Phase 1 + Phase 2 fields pre-defined):
  - fullName, email (unique), passwordHash, educationLevel, experienceLevel, preferredTrack, skills[], experienceNotes, careerInterests[], cvRawText, cvFileUrl, avatarUrl, extractedSkills[], extractedRoles[], timestamps
- `modules/user/user.constant.ts`
- `modules/user/user.validation.ts` — Zod schemas: registerUserSchema, loginUserSchema, updateUserSchema
- `modules/auth/auth.interface.ts` — request/user types
- `modules/auth/auth.service.ts`:
  - `register()` — validate input, hash password with bcrypt, create user, generate tokens, set httpOnly cookies (access + refresh)
  - `login()` — find user, compare password, generate tokens, set cookies
  - `refresh()` — read refresh cookie, verify, issue new access cookie
  - `logout()` — clear cookies
  - `me()` — return current user from DB
- `modules/auth/auth.controller.ts` — thin: parse req, call service, sendResponse
- `modules/auth/auth.routes.ts`:
  - POST `/api/auth/register`
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - POST `/api/auth/logout`
  - GET `/api/auth/me` (auth required)
- `src/app/config/jwt.ts` — access + refresh token sign/verify helpers
- `src/app/middlewares/auth.middleware.ts` — verify access token from httpOnly cookie, attach user to `req`
- `src/app/middlewares/validateRequest.ts` — generic Zod validation middleware
- `src/routes/index.ts` — aggregate all module routers, export combined router

**Frontend:**
- `src/lib/validations/auth.ts` — Zod schemas for register/login (required fields, email format, min password length)
- `src/app/(auth)/login/page.tsx` — React Hook Form + zod resolver, calls `serverFetch`, shows errors via Sonner, redirects to `/dashboard` on success
- `src/app/(auth)/register/page.tsx` — same pattern
- `src/middleware.ts` — Next.js middleware: check JWT cookie, redirect unauthenticated users from `(protected)/*` to `/login`
- Add `<Toaster />` (from sonner) to root `layout.tsx`
- Update root layout metadata to "CareerForge"

**Acceptance Criteria:**
- [ ] Can register a new user and receive JWT in httpOnly cookies
- [ ] Can access `/api/auth/me` with valid token
- [ ] Invalid input rejected with clear error messages
- [ ] Frontend redirects work (unauthenticated → login, after login → dashboard)

---

### Step 3: Profile & Skills

**Backend:**
- `modules/user/user.service.ts` — getProfile(userId), updateProfile(userId, data)
- `modules/user/user.controller.ts`
- `modules/user/user.routes.ts`:
  - GET `/api/profile` (auth required)
  - PUT `/api/profile` (auth required)

**Frontend:**
- `src/app/(protected)/layout.tsx` — shared shell with Navbar + auth check
- `src/components/Navbar.tsx` — links: Dashboard, Jobs, Resources, Profile, Logout button
- `src/app/(protected)/profile/page.tsx` — editable profile form:
  - Full name, education level, experience level, preferred track
  - Skill tags (add/remove)
  - Career interests
  - Experience notes (free text)
  - CV raw text (textarea)
- `src/hooks/useAuth.ts` — fetch current user via serverFetch

**Acceptance Criteria:**
- [ ] Profile page loads with current user data
- [ ] Can edit and save skills, experience notes, interests, CV text
- [ ] Changes persist and reload correctly on page refresh

---

### Step 4: Seed Jobs & Resources + Pages

**Backend:**
- `modules/jobOpportunity/jobOpportunity.interface.ts`
- `modules/jobOpportunity/jobOpportunity.model.ts` — title, company, location, requiredSkills[], experienceLevel, type, track, description, externalLinks
- `modules/jobOpportunity/jobOpportunity.service.ts` — list (with filters: track, location, type), getById
- `modules/jobOpportunity/jobOpportunity.controller.ts`
- `modules/jobOpportunity/jobOpportunity.routes.ts`:
  - GET `/api/jobs` (query params: track, location, type)
  - GET `/api/jobs/:id`
  - GET `/api/jobs/recommended` (stub — populated in Step 5)
- `modules/jobOpportunity/jobOpportunity.constant.ts`

- `modules/learningResource/learningResource.interface.ts`
- `modules/learningResource/learningResource.model.ts` — title, platform, url, relatedSkills[], cost
- `modules/learningResource/learningResource.service.ts` — list (with skill filter)
- `modules/learningResource/learningResource.controller.ts`
- `modules/learningResource/learningResource.routes.ts`:
  - GET `/api/resources` (query param: skill)
  - GET `/api/resources/recommended` (stub)
- `modules/learningResource/learningResource.constant.ts`

- `seed/seedJobs.ts` — 15-20+ entry-level focused jobs (Web Dev, Data, Design, Marketing tracks)
- `seed/seedResources.ts` — 15-20+ learning resources mapped to common skills
- `seed/runSeed.ts` — runner that imports and executes both seeders
- Add `"seed": "ts-node-dev --transpile-only ./seed/runSeed.ts"` to backend package.json
- Mount all routes in `src/routes/index.ts`

**Frontend:**
- `src/app/(protected)/jobs/page.tsx` — list view + filter sidebar (track, location, type)
- `src/components/JobCard.tsx` — reusable card component for job listings
- `src/app/(protected)/jobs/[id]/page.tsx` — job detail view with full description
- `src/app/(protected)/resources/page.tsx` — list view + skill filter
- `src/types/` — shared TypeScript types mirroring backend models

**Acceptance Criteria:**
- [ ] `npm run seed` runs idempotently (safe to re-run)
- [ ] 15-20+ jobs and 15-20+ resources seeded in MongoDB
- [ ] Jobs page shows list with working filters
- [ ] Resources page shows list with working skill filter
- [ ] Job detail page shows full job info

---

### Step 5: Basic Matching Logic (Rule-Based)

**Backend:**
- `modules/jobMatching/jobMatching.interface.ts` — MatchResult type (job, score, matchedSkills[])
- `modules/jobMatching/jobMatching.service.ts`:
  - `getRecommendedJobs(userId)` — score = skill overlap between user.skills and job.requiredSkills
  - Filter by preferredTrack
  - Return matchedSkills[] for each job for transparency
  - Sort by score descending
- `modules/jobMatching/jobMatching.controller.ts`
- `modules/jobMatching/jobMatching.routes.ts`:
  - GET `/api/jobs/recommended` (auth required) — replaces the stub from Step 4
- `modules/jobMatching/jobMatching.constant.ts`
- Also add: GET `/api/resources/recommended` based on skill gaps (missing skills from top jobs)

**Frontend:**
- Update Jobs page: add "Recommended for You" section at top
- `src/components/SkillTag.tsx` — colored tag display for skills
- `src/components/MatchBadge.tsx` — match score badge with color coding:
  - >= 70% → Emerald (Success)
  - 40-69% → Amber (Warning)
  - < 40% → Soft Red (Error)
- Update job cards to show match score + matched skills

**Acceptance Criteria:**
- [ ] Recommendations change when user skills change
- [ ] "Why recommended" (matched skills) is shown on job cards
- [ ] MatchBadge uses correct color for each score range

---

### Step 6: Dashboard & Navigation

**Backend:**
- Add `getDashboardData(userId)` to user service or create dashboard module:
  - Profile summary (name, skills count, top skills)
  - Top 5 recommended jobs
  - Top 5 recommended resources
  - Basic stats
- Routes:
  - GET `/api/dashboard` (auth required)

**Frontend:**
- `src/app/(protected)/dashboard/page.tsx`:
  - Profile summary card (name, track, experience level, skill count)
  - Top recommended jobs section
  - Top recommended resources section
- `src/components/DashboardCharts.tsx`:
  - Recharts: skill coverage bar/radar chart
  - Recharts: match score distribution (if enough data)
- Finalize `Navbar.tsx` with active route highlighting, responsive mobile menu

**Acceptance Criteria:**
- [ ] Dashboard shows profile summary + top jobs + top resources in one view
- [ ] Charts render with real data
- [ ] Navigation works correctly across all pages

---

### Step 7: Polish & Documentation

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

## Phase 2 — Onsite, AI Layer (Steps 8–13)

> Only start after Phase 1 acceptance criteria are met.

### Step 8: Redis + AI Infrastructure

- `src/app/config/redis.ts` — ioredis client with connection error handling
- `src/app/helpers/cache.ts` — get/set/invalidate/delete wrappers
- `modules/aiApi/aiApi.service.ts` — shared Anthropic Claude client wrapper (single instance, reused by all AI modules)
- `modules/aiApi/skillExtraction.service.ts`:
  - Call Claude on cvRawText → extract skills[], tools[], roles[]
  - Fallback: keyword-dictionary matcher if no ANTHROPIC_API_KEY
  - Cache results in Redis (same input → cached output)
- `modules/aiApi/cvAssist.service.ts` — CV summary/bullet point generation
- `src/app/middlewares/rateLimiter.middleware.ts` — Redis-backed rate limiter for AI endpoints
- Install: `ioredis`, `@anthropic-ai/sdk`, `rate-limiter-flexible`

**Acceptance Criteria:**
- [ ] Redis connects successfully
- [ ] AI calls fail gracefully when ANTHROPIC_API_KEY is missing
- [ ] Cache hit returns cached result without API call
- [ ] Rate limiter blocks excessive requests

---

### Step 9: Match % + Reasons + Skill Gap Analysis

**Backend:**
- Extend `modules/jobMatching/jobMatching.service.ts`:
  - Weighted score = skill overlap % + experience level alignment + track alignment
  - `getJobMatch(userId, jobId)` → { percentage, matchedSkills[], missingSkills[] }
- `modules/jobMatching/jobMatching.routes.ts`:
  - GET `/api/jobs/:id/match` (auth required)
- Skill gap analysis: query LearningResource by missingSkills from match result

**Frontend:**
- `src/components/MatchBadge.tsx` — enhance with detailed tooltip (score breakdown)
- Job detail page: show match %, matched skills, missing skills
- `src/components/SkillGapSection.tsx` — on job detail, show missing skills with linked learning resources
- Add external platform links (LinkedIn, BDjobs, Glassdoor) to job detail page

**Acceptance Criteria:**
- [ ] Match percentage is consistent with the same inputs
- [ ] Reasons are human-readable
- [ ] Every missing skill has a mapped resource or "no resource yet" state

---

### Step 10: AI Career Roadmap

**Backend:**
- `modules/roadmap/roadmap.model.ts` — Roadmap schema (userId, targetRole, timeframeMonths, phases[], generatedAt)
- `modules/roadmap/roadmap.interface.ts`
- `modules/roadmap/roadmap.service.ts`:
  - `generateRoadmap(userId, targetRole, timeframeMonths)` — prompt Claude with skills + target + timeframe → structured phases JSON
  - Save to MongoDB per user
  - Cache in Redis
- `modules/roadmap/roadmap.validation.ts`
- `modules/roadmap/roadmap.routes.ts`:
  - POST `/api/roadmap/generate` (auth required)
  - GET `/api/roadmap` (auth required)
  - GET `/api/roadmap/pdf` (auth required) — generate PDF with pdfkit
- Install: `pdfkit`, `@types/pdfkit`

**Frontend:**
- `src/app/(protected)/roadmap/page.tsx`:
  - Form: select target role, timeframe (3 or 6 months)
  - Display generated roadmap timeline
  - Download PDF button
- `src/components/RoadmapTimeline.tsx`:
  - Phase-by-phase timeline visualization
  - Topics, project ideas per phase
  - "Start applying" marker on appropriate phase

**Acceptance Criteria:**
- [ ] Roadmap is saved, reloadable, and downloadable as PDF
- [ ] Includes topics, project ideas, and "start applying" marker
- [ ] PDF download works

---

### Step 11: CareerBot

**Backend:**
- `modules/careerBot/careerBot.model.ts` — ChatLog schema (userId, messages[{role, text, timestamp}])
- `modules/careerBot/careerBot.interface.ts`
- `modules/careerBot/careerBot.service.ts`:
  - `askCareerBot(userId, message)` — LLM call with context injection (user profile + available jobs/resources in system prompt)
  - Redis short-term memory for last few turns
  - Persist full transcript to MongoDB periodically
- `modules/careerBot/careerBot.validation.ts`
- `modules/careerBot/careerBot.routes.ts`:
  - POST `/api/careerbot/ask` (auth required)

**Frontend:**
- `src/components/CareerBotWidget.tsx`:
  - Floating chat widget (local useState for open/closed + message list)
  - Input field + send button
  - Messages labeled as "suggestions, not guarantees"
  - AI features use Soft Indigo (#6366F1) for visual distinction

**Acceptance Criteria:**
- [ ] Bot answers stay on-topic (career/SDG8)
- [ ] Bot references real data from the platform when relevant
- [ ] Chat history persists across sessions
- [ ] Responses are clearly labeled as suggestions

---

### Step 12: CV / Profile Assistant

**Backend:**
- Add to `modules/user/user.routes.ts` or create dedicated route:
  - POST `/api/profile/cv-assist` (auth required)
- Uses `aiApi/cvAssist.service.ts`:
  - Generate professional summary from profile data
  - Generate bullet points for experience section
  - Provide LinkedIn/portfolio improvement tips

**Frontend:**
- Add to Profile page:
  - "Generate CV Summary" button
  - Display generated content with copy-to-clipboard button
  - "Generate Bullet Points" for experience section

**Acceptance Criteria:**
- [ ] Output is usable/copyable without further editing
- [ ] AI-generated content is high quality and relevant

---

### Step 13: File Uploads + Sentry Monitoring

**Backend:**
- `modules/upload/upload.interface.ts`
- `modules/upload/upload.service.ts` — wrap cloudinary.uploader.upload_stream (memory storage → stream to Cloudinary)
- `modules/upload/upload.validation.ts` — file type/size checks (CV: PDF/DOCX, 5MB max; avatar: image types, 2MB max)
- `modules/upload/upload.controller.ts`
- `modules/upload/upload.routes.ts`:
  - POST `/api/uploads/cv` (auth required)
  - POST `/api/uploads/avatar` (auth required)
- Install: `multer`, `cloudinary`, `@types/multer`

- `src/app/config/sentry.ts` — Sentry initialization (wrapped so missing DSN doesn't crash)
- Wire Sentry into app.ts (request handler before routes, error handler after routes)

**Frontend:**
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Install: `@sentry/nextjs`
- Update `next.config.ts` with `withSentryConfig`

**Acceptance Criteria:**
- [ ] File uploads work (CV and avatar)
- [ ] Files never touch local disk (memory storage → Cloudinary)
- [ ] Sentry captures errors but doesn't crash when DSN is missing
- [ ] Uploaded URLs are saved on User document

---

## Phase 2b — Bonus Features (Steps 14–17)

> Only attempt after all core Phase 2 features pass acceptance.

### Step 14: Payment Integration (Stripe + SSLCommerz)

- `modules/payment/payment.model.ts` — Transaction schema
- `modules/payment/payment.interface.ts`
- `modules/payment/gateways/stripe.service.ts`
- `modules/payment/gateways/sslcommerz.service.ts`
- `modules/payment/payment.service.ts` — unified interface
- `modules/payment/payment.validation.ts`
- `modules/payment/payment.controller.ts`
- `modules/payment/payment.routes.ts`:
  - POST `/api/payment/stripe/checkout-session`
  - POST `/api/payment/stripe/webhook`
  - POST `/api/payment/sslcommerz/init`
  - POST `/api/payment/sslcommerz/ipn`
  - GET `/api/payment/history`
- Install: `stripe`, `@stripe/stripe-js`, `sslcommerz-lts`

### Step 15: Admin Panel

- Admin role on User model
- Admin-only routes for managing jobs, resources, viewing flagged data
- Admin dashboard with CRUD operations

### Step 16: Analytics for SDG 8 Impact

- Admin analytics dashboard
- Metrics: users analyzed, jobs suggested, in-demand skills, common gaps
- Recharts visualizations

### Step 17: Multi-language Support

- i18n setup for English + Bangla
- Language switcher in UI
- Translated strings for key pages

---

## File Structure Summary

```
CareerForge/
├── careerforge-backend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── config/            # db.ts, env.ts, jwt.ts, anthropic.ts, redis.ts, cloudinary.ts, sentry.ts
│   │   │   ├── errorHelpers/      # AppError.ts, globalErrorHandler.ts
│   │   │   ├── helpers/           # sendResponse.ts, catchAsync.ts, cache.ts
│   │   │   ├── interfaces/        # error.interface.ts
│   │   │   ├── middlewares/       # auth.middleware.ts, validateRequest.ts, notFound.ts, rateLimiter.middleware.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # auth.controller.ts, .interface.ts, .routes.ts, .service.ts, .validation.ts
│   │   │   │   ├── user/          # user.controller.ts, .interface.ts, .model.ts, .routes.ts, .service.ts, .validation.ts, .constant.ts
│   │   │   │   ├── jobOpportunity/ # jobOpportunity.controller.ts, .interface.ts, .model.ts, .routes.ts, .service.ts, .validation.ts, .constant.ts
│   │   │   │   ├── learningResource/ # learningResource.controller.ts, .interface.ts, .model.ts, .routes.ts, .service.ts, .validation.ts, .constant.ts
│   │   │   │   ├── jobMatching/   # jobMatching.controller.ts, .interface.ts, .routes.ts, .service.ts, .constant.ts
│   │   │   │   ├── roadmap/       # roadmap.controller.ts, .interface.ts, .model.ts, .routes.ts, .service.ts, .validation.ts
│   │   │   │   ├── careerBot/     # careerBot.controller.ts, .interface.ts, .model.ts, .routes.ts, .service.ts, .validation.ts
│   │   │   │   ├── aiApi/         # aiApi.service.ts, skillExtraction.service.ts, cvAssist.service.ts
│   │   │   │   ├── payment/       # payment.controller.ts, .interface.ts, .model.ts, .routes.ts, .service.ts, .validation.ts, gateways/
│   │   │   │   └── upload/        # upload.controller.ts, .interface.ts, .routes.ts, .service.ts, .validation.ts
│   │   │   └── utils/
│   │   ├── constants.ts
│   │   ├── routes/index.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── seed/
│   │   ├── seedJobs.ts
│   │   ├── seedResources.ts
│   │   └── runSeed.ts
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── careerforge-frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (protected)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── resources/page.tsx
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── roadmap/page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── favicon.ico
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── Navbar.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── SkillTag.tsx
│   │   │   ├── MatchBadge.tsx
│   │   │   ├── RoadmapTimeline.tsx
│   │   │   ├── DashboardCharts.tsx
│   │   │   └── CareerBotWidget.tsx
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── serverFetch.ts
│   │   │   ├── validations/
│   │   │   └── utils.ts
│   │   ├── types/
│   │   └── utils/
│   ├── middleware.ts
│   ├── next.config.ts
│   ├── sentry.client.config.ts
│   ├── sentry.server.config.ts
│   ├── sentry.edge.config.ts
│   ├── .env.local.example
│   ├── components.json
│   ├── package.json
│   ├── postcss.config.mjs
│   └── tsconfig.json
│
├── docs/
│   └── project_plan_v1.md
├── CAREER_FORGE.md
├── README.md
└── .gitignore
```

---

## Data Models Summary

### User (Phase 1 + Phase 2 fields)
- _id, fullName, email (unique), passwordHash, educationLevel, experienceLevel ("Fresher"|"Junior"|"Mid"), preferredTrack, skills[], experienceNotes, careerInterests[], cvRawText, cvFileUrl, avatarUrl, extractedSkills[] (Phase 2), extractedRoles[] (Phase 2), timestamps

### Job
- _id, title, company, location, requiredSkills[], experienceLevel, type ("Internship"|"Part-time"|"Full-time"|"Freelance"), track, description, externalLinks{linkedin, bdjobs, glassdoor}

### LearningResource
- _id, title, platform, url, relatedSkills[], cost ("Free"|"Paid")

### Roadmap (Phase 2)
- _id, userId, targetRole, timeframeMonths (3|6), phases[{label, topics[], projectIdeas[], startApplying}], generatedAt

### ChatLog (Phase 2)
- _id, userId, messages[{role: "user"|"bot", text, timestamp}]

### Transaction (Bonus)
- _id, userId, gateway ("stripe"|"sslcommerz"), gatewayTransactionId, amount, currency, status ("pending"|"paid"|"failed"|"cancelled"), purpose, timestamps

---

## API Endpoints Summary

### Auth
| Method | Route | Phase |
|--------|-------|-------|
| POST | /api/auth/register | 1 |
| POST | /api/auth/login | 1 |
| POST | /api/auth/refresh | 1 |
| POST | /api/auth/logout | 1 |
| GET | /api/auth/me | 1 |

### Profile
| Method | Route | Phase |
|--------|-------|-------|
| GET | /api/profile | 1 |
| PUT | /api/profile | 1 |
| POST | /api/profile/cv-assist | 2 |

### Jobs
| Method | Route | Phase |
|--------|-------|-------|
| GET | /api/jobs | 1 |
| GET | /api/jobs/:id | 1 |
| GET | /api/jobs/recommended | 1 |
| GET | /api/jobs/:id/match | 2 |

### Resources
| Method | Route | Phase |
|--------|-------|-------|
| GET | /api/resources | 1 |
| GET | /api/resources/recommended | 1 |

### Dashboard
| Method | Route | Phase |
|--------|-------|-------|
| GET | /api/dashboard | 1 |

### Skills (Phase 2)
| Method | Route | Phase |
|--------|-------|-------|
| POST | /api/skills/extract | 2 |

### Roadmap (Phase 2)
| Method | Route | Phase |
|--------|-------|-------|
| POST | /api/roadmap/generate | 2 |
| GET | /api/roadmap | 2 |
| GET | /api/roadmap/pdf | 2 |

### CareerBot (Phase 2)
| Method | Route | Phase |
|--------|-------|-------|
| POST | /api/careerbot/ask | 2 |

### Uploads (Phase 2)
| Method | Route | Phase |
|--------|-------|-------|
| POST | /api/uploads/cv | 2 |
| POST | /api/uploads/avatar | 2 |

### Payments (Bonus)
| Method | Route | Phase |
|--------|-------|-------|
| POST | /api/payment/stripe/checkout-session | Bonus |
| POST | /api/payment/stripe/webhook | Bonus |
| POST | /api/payment/sslcommerz/init | Bonus |
| POST | /api/payment/sslcommerz/ipn | Bonus |
| GET | /api/payment/history | Bonus |

---

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/career-platform
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
COOKIE_DOMAIN=localhost
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_IS_LIVE=false
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SENTRY_DSN=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Design System — Color Palette

| Role | Color | Hex | Tailwind Token |
|------|-------|-----|----------------|
| Primary | Deep Teal | #0D9488 | bg-primary |
| Primary Dark | Dark Teal | #0F766E | hover:primary |
| Secondary | Soft Indigo | #6366F1 | bg-secondary (AI features) |
| Background | Cool Off-White | #F8FAFC | bg-background |
| Surface | Pure White | #FFFFFF | bg-card |
| Text Primary | Slate Gray | #1E293B | text-foreground |
| Text Secondary | Muted Slate | #64748B | text-muted-foreground |
| Success | Emerald | #10B981 | text-success (>=70% match) |
| Warning | Amber | #F59E0B | text-warning (40-69% match) |
| Error | Soft Red | #EF4444 | text-error (<40% match) |
| Border | Light Gray | #E2E8F0 | border-border |

---

## Key Design Decisions

1. **No client-side auth store** — httpOnly cookies only, session managed by Express backend
2. **serverFetch is the single API call point** — no component calls fetch() directly
3. **Next.js as frontend-only** — Express backend is separate, not Next.js API routes
4. **Redis introduced in Phase 2** — skip for Phase 1 (not needed for core features)
5. **Payments are bonus** — skip unless time permits after Phase 2
6. **Sentry gracefully degrades** — missing DSN disables reporting, never crashes
7. **AI calls have fallbacks** — keyword-dictionary matcher when no ANTHROPIC_API_KEY
8. **File uploads never touch disk** — Multer memory storage → Cloudinary stream
9. **Colors from design system only** — CSS variables/Tailwind tokens, no raw hex in components
10. **Server components by default** — `'use client'` only for interactive/form UI

---

## Package List

### Backend Dependencies
| Package | Purpose | Phase |
|---------|---------|-------|
| express (v5) | HTTP server | 1 |
| mongoose | MongoDB ODM | 1 |
| bcrypt | Password hashing | 1 |
| jsonwebtoken | JWT signing/verification | 1 |
| cookie-parser | Read httpOnly cookies | 1 |
| cors | Cross-origin requests | 1 |
| dotenv | Env var loading | 1 |
| zod | Input validation | 1 |
| helmet | Security headers | 1 |
| morgan | Request logging | 1 |
| ts-node-dev | Dev auto-reload | 1 |
| ioredis | Redis client | 2 |
| @anthropic-ai/sdk | Claude API client | 2 |
| rate-limiter-flexible | Redis rate limiting | 2 |
| multer | Multipart upload parsing | 2 |
| cloudinary | File storage | 2 |
| pdfkit | PDF generation | 2 |
| @sentry/node | Error monitoring | 2 |
| stripe | Payment (international) | Bonus |
| sslcommerz-lts | Payment (BD local) | Bonus |

### Frontend Dependencies
| Package | Purpose | Phase |
|---------|---------|-------|
| next (16.3.4) | React framework | 1 |
| react / react-dom | UI library | 1 |
| tailwindcss (v4) | CSS framework | 1 |
| shadcn/ui | Component library | 1 |
| react-hook-form | Form management | 1 |
| @hookform/resolvers | Zod integration for RHF | 1 |
| zod | Schema validation | 1 |
| lucide-react | Icons | 1 |
| date-fns | Date formatting | 1 |
| clsx + tailwind-merge | Conditional classes | 1 |
| sonner | Toast notifications | 1 |
| recharts | Charts/visualizations | 1 |
| @sentry/nextjs | Error monitoring | 2 |
| @stripe/stripe-js | Stripe checkout | Bonus |

---

## Notes

- Follow Phase 1 build order top to bottom; don't build Phase 2 before Phase 1 acceptance criteria pass.
- Every new field in Phase 2 extends existing models (no breaking schema changes).
- Backend follows modular MVC: every feature in `app/modules/<name>/` with controller, interface, model, routes, service, validation, constant files.
- Business logic goes in `.service.ts`, never inline in controllers.
- Shared AI logic lives in `modules/aiApi/` and is imported by other AI modules.
- Use Sonner for all user-facing feedback (no alert() or inline banners).
- Use Recharts for all data visualizations.
- Auth gating happens in Next.js middleware.ts, not client-side wrappers.
- Validate all inputs with zod — backend via validateRequest middleware, frontend via react-hook-form resolvers.
