# 🔥 CareerForge — AI-Powered Youth Employment & Career Roadmap Platform

> **SDG 8** — Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.

**Purpose of this document:** this README is the build spec for an agentic coding agent (opencode) building **CareerForge**. It defines the fixed stack, data models, API contract, folder structure, design system, and a phased task order. Follow the phases in order — do not skip ahead to Part 2 tasks before Part 1 acceptance criteria are met.

---

## 📌 Table of Contents

- [Locked Tech Stack](#-locked-tech-stack)
- [Why Redis?](#-why-redis)
- [Payments (Stripe + SSLCommerz)](#-payments-stripe--sslcommerz)
- [File Uploads (Cloudinary + Multer)](#-file-uploads-cloudinary--multer)
- [Monitoring (Sentry)](#-monitoring-sentry)
- [Design System — Color Palette](#-design-system--careerforge-color-palette)
- [Additional Packages](#-additional-packages)
- [Folder Structure](#-folder-structure)
- [Data Models](#-data-models)
- [API Endpoints](#-api-endpoints)
- [Build Order — Phase 1 (Pre-Hack)](#-build-order--phase-1-pre-hack)
- [Build Order — Phase 2 (Onsite, AI Layer)](#-build-order--phase-2-onsite-ai-layer)
- [Bonus Features](#-bonus-features-optional-tie-breakers)
- [Judging Criteria](#-judging-criteria-total-50-points)
- [Environment Variables](#-environment-variables)
- [Setup & Run](#-setup--run)
- [Agent Working Rules](#-agent-working-rules)

---

## 🔒 Locked Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict mode, both frontend & backend) |
| Backend | Node.js + Express (modular MVC, standalone API service) |
| Database | MongoDB (Mongoose ODM) |
| Frontend | **Next.js v16.3.4 (App Router)** — React is used only as Next.js's underlying library, not as a separate stack choice |
| Auth / Session | JWT (access + refresh token, hashed with **bcrypt** on the password side) in **httpOnly cookies**, read via a custom **`serverFetch`** wrapper with automatic refresh — no client-side auth store (see below) |
| Styling | Tailwind CSS + **shadcn/ui** |
| Forms | **React Hook Form** + `@hookform/resolvers/zod` |
| Charts | **Recharts** (dashboard/analytics visualizations) |
| Notifications | **Sonner** (toast) |
| Cache / Rate Limiting | **Redis** (`ioredis`) — see [Why Redis?](#-why-redis) below |
| AI/NLP (Phase 2) | Anthropic API (Claude) via `@anthropic-ai/sdk` — fallback to keyword-dictionary extraction if no API key is set |
| PDF Export (Phase 2) | `pdfkit` (backend-generated) |
| File Storage | **Cloudinary** — receives uploads via **Multer** (memory storage → streamed to Cloudinary, nothing written to local disk) |
| Monitoring | **Sentry** (`@sentry/node` backend, `@sentry/nextjs` frontend) — error tracking + performance tracing |
| Payments | **Stripe** (international/card) + **SSLCommerz** (local BD gateway — bKash, Nagad, cards) |
| Validation | `zod` on both frontend and backend |

Do not introduce other frameworks or databases without explicit instruction.

**Architecture note:** Next.js is the frontend only (App Router, mostly server components for data-fetching pages, client components for interactive/form UI). The Express backend from the modular MVC structure remains a separate API service — Next.js calls it over HTTP rather than reimplementing logic in Next.js API routes/Route Handlers. This keeps the backend reusable and keeps the two build phases (frontend/backend) independently deployable.

**Auth/session note — no client-side store:** there is no Redux/Zustand global store for auth. Session state lives entirely in **httpOnly, Secure cookies** set by the Express backend on login. `careerforge-frontend/src/lib/serverFetch.ts` is a single fetch wrapper used everywhere (server components, route handlers if any, and client components) that:
1. Attaches the access-token cookie automatically (browser does this natively for same-origin requests — see the Next.js rewrite proxy note in [Folder Structure](#-folder-structure)).
2. On a `401`, calls the refresh endpoint once, retries the original request, and only then redirects to `/login` if refresh also fails.
3. Is the *only* place API calls are made from — no component calls `fetch()` directly.

Any remaining local UI state (form state, a chat widget's open/closed state, chart hover state) is handled with plain `useState`/`useReducer` in the component that owns it, or React Hook Form's internal state for forms — not a global store.

---

## 🧠 Why Redis?

Redis is used for **speed and cost-control**, not as a primary data store — MongoDB stays the source of truth. Concrete uses in this project:

| Use Case | Where | Why |
|---|---|---|
| **Rate limiting AI endpoints** | `skills/extract`, `roadmap/generate`, `careerbot/ask` | These call the Anthropic API — without limits, one user (or a bug/loop) can burn through API cost/quota fast |
| **Caching AI responses** | Skill extraction & roadmap generation | Same CV text or same (skills + target role + timeframe) input → return the cached result instead of paying for a duplicate Claude call |
| **Caching read-heavy lists** | `/api/jobs`, `/api/resources`, `/api/dashboard` | These are queried constantly and change rarely (jobs/resources are seeded); short TTL cache (e.g. 60–300s) takes real load off MongoDB |
| **Refresh token / logout blacklist** | Auth middleware | Store revoked/blacklisted JWTs so logout actually invalidates a token before its natural expiry |
| **CareerBot short-term memory** | `careerBot.service.ts` | Keep the last few turns of a conversation in Redis (fast) for assembling context on the next message, and only persist the full transcript to MongoDB's `ChatLog` periodically |

Not required for Phase 1 core features — introduce Redis when Phase 2 AI endpoints are built, since that's where cost and latency actually matter. `app/config/redis.ts` should export a single shared client, reused across modules (mirrors how `aiApi.service.ts` is the single shared Claude client).

---

## 💳 Payments (Stripe + SSLCommerz)

Not part of the graded hackathon requirements — this is your own addition, most naturally used as a **"Pro" upgrade** (bonus/monetization angle, ties into "Innovation & Practical Impact"): e.g. unlimited AI roadmap regenerations, no CareerBot rate limit, premium CV templates. Define the exact paid feature set when you get there; the plumbing below is gateway-agnostic.

| Gateway | Use for | Package |
|---|---|---|
| **Stripe** | International users, card payments | `stripe` (server SDK) + `@stripe/stripe-js` (client checkout redirect) |
| **SSLCommerz** | Bangladeshi users — bKash, Nagad, Rocket, local cards | `sslcommerz-lts` |

- Backend owns both integrations in `modules/payment/` (see [Folder Structure](#-folder-structure)) behind one internal interface — the rest of the app calls `payment.service.ts`, not Stripe/SSLCommerz directly.
- Let the user pick a gateway at checkout (or auto-suggest SSLCommerz for BDT/Bangladesh, Stripe otherwise) rather than hard-coding one.
- Both gateways need a **webhook/IPN endpoint** (Stripe webhook, SSLCommerz IPN) to confirm payment server-side — never mark a purchase "paid" based on the client-side redirect alone.
- Store transactions in a `Transaction` model (gateway, amount, currency, status, userId) so payment state survives even if a webhook is delayed.

---

## 🖼️ File Uploads (Cloudinary + Multer)

Used for: CV file uploads (Phase 2 skill extraction from an uploaded document, not just pasted text), profile pictures, and generated CV/roadmap PDFs if you want them hosted rather than streamed on-demand.

- **Multer** handles the multipart form parse only, using **memory storage** (`multer.memoryStorage()`) — the file buffer goes straight to Cloudinary, nothing is written to local disk (important for platforms like Vercel/Render with ephemeral/read-only filesystems).
- **Cloudinary** stores the actual file and returns a secure URL + public ID; save that URL/ID on the `User` document (e.g. `avatarUrl`, `cvFileUrl`), not the file itself.
- Validate file type/size in `.validation.ts` before upload (e.g. CV: PDF/DOCX only, 5MB max; avatar: image types only, 2MB max).
- Client uploads go through `serverFetch` to a backend endpoint (`POST /api/uploads/cv`, `POST /api/uploads/avatar`) — never expose the Cloudinary API secret to the frontend.

---

## 🩺 Monitoring (Sentry)

- **Backend:** `@sentry/node`, initialized in `app/config/sentry.ts` and wired into `app.ts` before routes (request handler) and after routes (error handler, ahead of your own `globalErrorHandler`). Captures unhandled exceptions and, optionally, performance traces on slow endpoints (AI calls are the ones worth watching).
- **Frontend:** `@sentry/nextjs`, set up via `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` (generated by `npx @sentry/wizard@latest -i nextjs`). Captures client-side render errors and failed `serverFetch` calls.
- Keep DSNs in env vars (`SENTRY_DSN` backend, `NEXT_PUBLIC_SENTRY_DSN` frontend) — never hard-code them.
- Don't let Sentry block the app if misconfigured: initialization should be wrapped so a missing/invalid DSN just disables reporting instead of crashing startup.

---

## 🎨 Design System — CareerForge Color Palette

Defined once as CSS variables in `careerforge-frontend/src/app/globals.css` (shadcn/ui reads these) and mapped in `@theme inline` — components should reference the semantic Tailwind tokens (`bg-primary`, `text-foreground`, etc.), not hard-coded hex values.

| Role | Color Name | Hex | Usage |
|---|---|---|---|
| Primary | Deep Teal | `#0D9488` | Buttons, links, highlights, navbar |
| Primary Dark | Dark Teal | `#0F766E` | Hover states, active menu |
| Secondary | Soft Indigo | `#6366F1` | Accents, progress bars, AI features |
| Background | Cool Off-White | `#F8FAFC` | Main page background |
| Surface | Pure White | `#FFFFFF` | Cards, modals, forms |
| Text Primary | Slate Gray | `#1E293B` | Headings & body text |
| Text Secondary | Muted Slate | `#64748B` | Secondary text, labels |
| Success | Emerald | `#10B981` | Match % high, success messages |
| Warning | Amber | `#F59E0B` | Skill gaps, medium match |
| Error | Soft Red | `#EF4444` | Errors, low match |
| Border | Light Gray | `#E2E8F0` | Card borders, dividers |

**Notes for the agent:**
- Map `Success` / `Warning` / `Error` directly to the job **match %** UI: e.g. ≥70% → Success (Emerald), 40–69% → Warning (Amber), <40% → Error (Soft Red) — same palette drives `MatchBadge.tsx` and the Recharts match-score visualizations.
- `Secondary` (Soft Indigo) is reserved for AI-flavored UI specifically — CareerBot widget, "AI-generated" badges on the roadmap, skill-extraction tags — so AI features feel visually distinct from the plain rule-based Phase 1 UI.
- shadcn/ui's default theme generator uses HSL; convert each hex above to HSL once and set as CSS variables (`--primary`, `--secondary`, `--background`, `--foreground`, `--muted-foreground`, `--destructive`, `--border`, etc.) rather than overriding component styles ad hoc.

---

## 📦 Additional Packages

Beyond what's in the stack table — the small utilities you'll actually reach for while building:

**Backend**
| Package | Purpose |
|---|---|
| `bcrypt` | Password hashing |
| `jsonwebtoken` | Access/refresh JWT signing & verification |
| `cookie-parser` | Read httpOnly cookies in Express |
| `cors` | Allow the Next.js origin (with `credentials: true`) if not using the rewrite-proxy setup |
| `helmet` | Basic security headers |
| `morgan` | Request logging in dev |
| `multer` | Parse multipart uploads (CV files, avatars) into memory before sending to Cloudinary |
| `cloudinary` | Cloudinary SDK — upload buffer, get back secure URL |
| `@sentry/node` | Backend error/performance monitoring |
| `express-rate-limit` or `rate-limiter-flexible` (Redis-backed) | AI endpoint rate limiting |
| `dotenv` | Env var loading |
| `ts-node-dev` / `nodemon` | Dev server auto-reload |

**Frontend**
| Package | Purpose |
|---|---|
| `@hookform/resolvers` | Wire `zod` schemas into React Hook Form |
| `lucide-react` | Icon set (pairs with shadcn/ui) |
| `date-fns` | Formatting roadmap phase dates/timeframes |
| `clsx` + `tailwind-merge` | Conditional class names (the shadcn `cn()` util) |
| `@sentry/nextjs` | Frontend error/performance monitoring |


## 📁 Folder Structure

```
project-root/
├── careerforge-backend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── config/            # db.ts, env.ts, jwt.ts, anthropic.ts, redis.ts, cloudinary.ts, sentry.ts
│   │   │   ├── errorHelpers/       # AppError.ts, handleValidationError.ts, etc.
│   │   │   ├── helpers/             # sendResponse.ts, catchAsync.ts, cache.ts (Redis get/set/invalidate wrappers), pagination helpers
│   │   │   ├── interfaces/           # shared/global interfaces (e.g. error.interface.ts)
│   │   │   ├── middlewares/           # auth.middleware.ts, validateRequest.ts, globalErrorHandler.ts, notFound.ts, rateLimiter.middleware.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.interface.ts
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.validation.ts
│   │   │   │   ├── user/                       # profile + skills + CV text live here
│   │   │   │   │   ├── user.controller.ts
│   │   │   │   │   ├── user.interface.ts
│   │   │   │   │   ├── user.model.ts
│   │   │   │   │   ├── user.routes.ts
│   │   │   │   │   ├── user.service.ts
│   │   │   │   │   ├── user.validation.ts
│   │   │   │   │   └── user.constant.ts
│   │   │   │   ├── jobOpportunity/
│   │   │   │   │   ├── jobOpportunity.controller.ts
│   │   │   │   │   ├── jobOpportunity.interface.ts
│   │   │   │   │   ├── jobOpportunity.model.ts
│   │   │   │   │   ├── jobOpportunity.routes.ts
│   │   │   │   │   ├── jobOpportunity.service.ts
│   │   │   │   │   ├── jobOpportunity.validation.ts
│   │   │   │   │   └── jobOpportunity.constant.ts
│   │   │   │   ├── learningResource/
│   │   │   │   │   ├── learningResource.controller.ts
│   │   │   │   │   ├── learningResource.interface.ts
│   │   │   │   │   ├── learningResource.model.ts
│   │   │   │   │   ├── learningResource.routes.ts
│   │   │   │   │   ├── learningResource.service.ts
│   │   │   │   │   ├── learningResource.validation.ts
│   │   │   │   │   └── learningResource.constant.ts
│   │   │   │   ├── jobMatching/                 # Phase 1 rule-based + Phase 2 weighted match %
│   │   │   │   │   ├── jobMatching.controller.ts
│   │   │   │   │   ├── jobMatching.interface.ts
│   │   │   │   │   ├── jobMatching.routes.ts
│   │   │   │   │   ├── jobMatching.service.ts
│   │   │   │   │   └── jobMatching.constant.ts
│   │   │   │   ├── roadmap/                      # [Phase 2]
│   │   │   │   │   ├── roadmap.controller.ts
│   │   │   │   │   ├── roadmap.interface.ts
│   │   │   │   │   ├── roadmap.model.ts
│   │   │   │   │   ├── roadmap.routes.ts
│   │   │   │   │   ├── roadmap.service.ts
│   │   │   │   │   └── roadmap.validation.ts
│   │   │   │   ├── careerBot/                    # [Phase 2]
│   │   │   │   │   ├── careerBot.controller.ts
│   │   │   │   │   ├── careerBot.interface.ts
│   │   │   │   │   ├── careerBot.model.ts        # ChatLog
│   │   │   │   │   ├── careerBot.routes.ts
│   │   │   │   │   ├── careerBot.service.ts
│   │   │   │   │   └── careerBot.validation.ts
│   │   │   │   ├── aiApi/                        # shared Anthropic client + skill extraction + CV assist
│   │   │   │   │   ├── aiApi.service.ts          # low-level Claude client wrapper
│   │   │   │   │   ├── skillExtraction.service.ts
│   │   │   │   │   └── cvAssist.service.ts
│   │   │   │   ├── payment/                      # optional — Pro/premium upgrade
│   │   │   │   │   ├── payment.controller.ts
│   │   │   │   │   ├── payment.interface.ts
│   │   │   │   │   ├── payment.model.ts          # Transaction
│   │   │   │   │   ├── payment.routes.ts
│   │   │   │   │   ├── payment.service.ts        # unified interface, called by the rest of the app
│   │   │   │   │   ├── payment.validation.ts
│   │   │   │   │   └── gateways/
│   │   │   │   │       ├── stripe.service.ts
│   │   │   │   │       └── sslcommerz.service.ts
│   │   │   │   └── upload/                        # CV files + avatars, via Multer → Cloudinary
│   │   │   │       ├── upload.controller.ts
│   │   │   │       ├── upload.interface.ts
│   │   │   │       ├── upload.routes.ts
│   │   │   │       ├── upload.service.ts          # wraps cloudinary.uploader.upload_stream
│   │   │   │       └── upload.validation.ts        # file type/size checks
│   │   │   └── utils/                             # generic reusable utilities
│   │   ├── constants.ts                           # app-wide constants
│   │   ├── routes/
│   │   │   └── index.ts                            # aggregates all module routers
│   │   ├── app.ts                                   # express app setup (Sentry request handler → middleware → routes → Sentry error handler → globalErrorHandler)
│   │   └── server.ts                                 # entrypoint, DB connect, listen
│   ├── seed/                                          # seedJobs.ts, seedResources.ts, runSeed.ts
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── careerforge-frontend/                                          # Next.js v16.3.4, App Router
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/                    # route group — no auth required
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── (protected)/               # route group — requires auth (guarded by middleware.ts)
│   │   │   │   ├── layout.tsx              # shared shell: navbar + auth check
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx             # list + filters
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx          # job detail + match %
│   │   │   │   ├── resources/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── roadmap/
│   │   │   │       └── page.tsx
│   │   │   ├── api/                        # [only if a Next.js Route Handler is genuinely needed, e.g. a payment webhook that must run on the Next.js server — otherwise call the Express API directly via serverFetch]
│   │   │   ├── layout.tsx                   # root layout — wraps <html>/<body>, renders <Toaster /> (Sonner) once here
│   │   │   ├── globals.css                    # Tailwind directives + shadcn/ui CSS variables
│   │   │   └── favicon.ico
│   │   ├── components/
│   │   │   ├── ui/                          # shadcn/ui generated components (button, input, dialog, form, etc.)
│   │   │   ├── Navbar.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── SkillTag.tsx
│   │   │   ├── MatchBadge.tsx
│   │   │   ├── RoadmapTimeline.tsx           # Recharts phase/progress visualization
│   │   │   ├── DashboardCharts.tsx            # Recharts: skill coverage, match score distribution, etc.
│   │   │   └── CareerBotWidget.tsx             # local useState for open/closed + message list
│   │   ├── config/                          # app constants, gateway/publishable keys (Stripe pk, etc.)
│   │   ├── hooks/                            # useAuth (reads session via serverFetch), useDebounce
│   │   ├── lib/
│   │   │   ├── serverFetch.ts                 # THE fetch wrapper — cookie-based auth, auto token refresh, single source of truth for API calls
│   │   │   ├── validations/                    # zod schemas shared with React Hook Form (login, register, profile, roadmap-generate forms)
│   │   │   └── utils.ts                          # cn() and other framework-agnostic helpers
│   │   ├── types/                                # shared TS types (mirror backend models)
│   │   └── utils/                                 # small pure utility functions
│   ├── middleware.ts                                # Next.js middleware — reads the auth cookie, redirects unauthenticated users away from (protected) routes
│   ├── next.config.ts                                # includes rewrites() proxying /api/* to the Express backend, so cookies stay same-origin; wrapped with withSentryConfig
│   ├── sentry.client.config.ts
│   ├── sentry.server.config.ts
│   ├── sentry.edge.config.ts
│   ├── .env.local.example
│   ├── .gitignore
│   ├── README.md
│   ├── components.json                              # shadcn/ui config
│   ├── eslint.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.mjs                            # Tailwind
│   └── tsconfig.json
└── README.md
```

---

## 🗂 Data Models

> Design these once in Phase 1 so Phase 2 fields (match %, extracted skills, roadmap) slot in without migrations. Each model below lives inside its module's `*.model.ts` (e.g. `modules/user/user.model.ts`), with the matching TS shape in that module's `*.interface.ts`.

### `User` — `modules/user/user.model.ts`
```ts
{
  _id: ObjectId,
  fullName: string,
  email: string,           // unique, validated
  passwordHash: string,
  educationLevel: string,  // e.g. "BSc CSE", department
  experienceLevel: "Fresher" | "Junior" | "Mid",
  preferredTrack: string,  // e.g. "Web Development", "Data", "Design", "Marketing"
  skills: string[],        // user-managed tags — this array is reused by Phase 2 matching
  experienceNotes: string, // free text: projects/experience
  careerInterests: string[],
  cvRawText: string,       // pasted CV text, stored in Phase 1, parsed in Phase 2
  cvFileUrl: string,       // Cloudinary URL if the user uploaded a CV file instead of/alongside pasting text
  avatarUrl: string,       // Cloudinary URL, optional
  extractedSkills: string[],   // [Phase 2] AI/heuristic-extracted, editable tags
  extractedRoles: string[],    // [Phase 2] e.g. "Frontend Developer"
  createdAt: Date,
  updatedAt: Date
}
```

### `Job` — `modules/jobOpportunity/jobOpportunity.model.ts`
```ts
{
  _id: ObjectId,
  title: string,
  company: string,
  location: string,        // or "Remote"
  requiredSkills: string[],
  experienceLevel: "Fresher" | "Junior" | "Mid",
  type: "Internship" | "Part-time" | "Full-time" | "Freelance",
  track: string,            // for filtering by role/track
  description: string,
  externalLinks: {          // [Phase 2] real-world platforms
    linkedin?: string,
    bdjobs?: string,
    glassdoor?: string
  }
}
```
Seed with **15–20+ entries**, entry-level focused.

### `LearningResource` — `modules/learningResource/learningResource.model.ts`
```ts
{
  _id: ObjectId,
  title: string,
  platform: string,          // YouTube, Coursera, Udemy, local platform
  url: string,
  relatedSkills: string[],
  cost: "Free" | "Paid"
}
```
Seed with **15–20+ entries** mapped to common skills (HTML, JS, Excel, communication, design, etc.).

### `Roadmap` (Phase 2) — `modules/roadmap/roadmap.model.ts`
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  targetRole: string,
  timeframeMonths: 3 | 6,
  phases: [
    {
      label: string,          // e.g. "Month 1: Foundations"
      topics: string[],
      projectIdeas: string[],
      startApplying: boolean  // flag the phase where job-hunting should begin
    }
  ],
  generatedAt: Date
}
```

### `ChatLog` (Phase 2, CareerBot) — `modules/careerBot/careerBot.model.ts`
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  messages: [{ role: "user" | "bot", text: string, timestamp: Date }]
}
```

### `Transaction` (Payment) — `modules/payment/payment.model.ts`
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  gateway: "stripe" | "sslcommerz",
  gatewayTransactionId: string,
  amount: number,
  currency: string,          // "USD" or "BDT"
  status: "pending" | "paid" | "failed" | "cancelled",
  purpose: string,            // e.g. "pro-upgrade"
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Endpoints

> Each table below is served by that module's `*.routes.ts` (inside `app/modules/<module>/`), aggregated in `src/routes/index.ts`, and mounted in `app.ts`.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create user, hash password, set httpOnly access + refresh cookies |
| POST | `/api/auth/login` | Validate credentials, set httpOnly access + refresh cookies |
| POST | `/api/auth/refresh` | Read refresh cookie, issue a new access cookie — called automatically by `serverFetch` on a `401` |
| POST | `/api/auth/logout` | Clear cookies, blacklist the refresh token in Redis |
| GET | `/api/auth/me` | Return current user (auth required) |

### Profile
| Method | Route | Description |
|---|---|---|
| GET | `/api/profile` | Get current user's profile |
| PUT | `/api/profile` | Update skills, experience notes, interests, CV text |

### Jobs
| Method | Route | Description |
|---|---|---|
| GET | `/api/jobs` | List jobs, query params: `track`, `location`, `type` |
| GET | `/api/jobs/:id` | Job detail |
| GET | `/api/jobs/recommended` | Rule-based matches (Phase 1) → match % + reasons (Phase 2) |

### Resources
| Method | Route | Description |
|---|---|---|
| GET | `/api/resources` | List resources, query param: `skill` |
| GET | `/api/resources/recommended` | Recommended based on user skills/gaps |

### Dashboard
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Aggregated: profile summary + recommended jobs + recommended resources |

### Phase 2 — AI Endpoints
| Method | Route | Description |
|---|---|---|
| POST | `/api/skills/extract` | Extract skills/roles from `cvRawText`, return editable tags |
| GET | `/api/jobs/:id/match` | Match % + reasons + skill gap for a specific job |
| POST | `/api/roadmap/generate` | Generate roadmap from skills + targetRole + timeframe |
| GET | `/api/roadmap` | Get saved roadmap for current user |
| GET | `/api/roadmap/pdf` | Download roadmap as PDF |
| POST | `/api/careerbot/ask` | Send a message, get CareerBot reply |
| POST | `/api/profile/cv-assist` | Generate CV summary/bullet points, or export CV as PDF |

### Payments
| Method | Route | Description |
|---|---|---|
| POST | `/api/payment/stripe/checkout-session` | Create a Stripe Checkout session, return redirect URL |
| POST | `/api/payment/stripe/webhook` | Stripe webhook — confirms payment, updates `Transaction` |
| POST | `/api/payment/sslcommerz/init` | Init an SSLCommerz session, return gateway redirect URL |
| POST | `/api/payment/sslcommerz/ipn` | SSLCommerz IPN — confirms payment, updates `Transaction` |
| GET | `/api/payment/history` | Current user's transaction history |

### Uploads
| Method | Route | Description |
|---|---|---|
| POST | `/api/uploads/cv` | Multer parses the file → Cloudinary upload → save URL on `user.cvFileUrl` |
| POST | `/api/uploads/avatar` | Same pattern for profile picture → `user.avatarUrl` |

---

## 🏗️ Build Order — Phase 1 (Pre-Hack)

Work through these tasks **in order**. Each has explicit acceptance criteria.

**1. Project scaffolding**
- Init `backend/` (Express + TS + Mongoose, modular MVC skeleton) and `frontend/` (Next.js v16.3.4 App Router + TS + Tailwind + shadcn/ui, `npx create-next-app@latest`)
- Acceptance: both run with `npm run dev`, hello-world route returns 200

**2. Auth & User Management**
- Implement `User` model, register/login/me routes, JWT middleware, bcrypt hashing
- Frontend: Register + Login pages built with React Hook Form + zod resolver (required fields, email format, min password length); on success the backend sets auth cookies and the page redirects
- Acceptance: can register, receive JWT, access `/me` with token, invalid input rejected with clear errors

**3. Profile & Skills**
- Profile GET/PUT routes, Profile page with editable skill tags, experience notes, interests, CV textarea
- Acceptance: profile changes persist and reload correctly

**4. Seed Jobs & Resources**
- Build `seed/seedJobs.ts` / `seed/seedResources.ts` (using the `jobOpportunity` and `learningResource` models) with 15–20+ entries each, `npm run seed` command via `seed/runSeed.ts`
- Jobs page: list + filters (track, location, type) + detail view
- Resources page: list, filterable by skill
- Acceptance: seed is idempotent (safe to re-run), filters work against seeded data

**5. Basic Matching Logic (rule-based, non-AI)**
- `modules/jobMatching/jobMatching.service.ts`: score = skill overlap between `user.skills` and `job.requiredSkills`; filter/sort by `preferredTrack`
- Return `matchedSkills[]` alongside each recommendation for transparency
- Acceptance: recommendations change correctly when user skills change; "why recommended" is shown in UI

**6. Dashboard & Navigation**
- `/api/dashboard` aggregation endpoint + Dashboard page
- Navbar: Dashboard, Jobs, Resources, Profile, Logout
- Acceptance: dashboard shows profile summary + top job/resource recommendations in one view

**7. README & Docs**
- Keep this file updated with actual setup commands and any env notes as they're added

> ✅ **Phase 1 done when:** a user can register → build a profile with skills → see seeded jobs/resources → get rule-based recommendations with visible reasons → all from a working dashboard.

---

## 🤖 Build Order — Phase 2 (Onsite, AI Layer)

Only start once Phase 1 acceptance criteria are met.

**1. Smart Skill Extraction**
- `modules/aiApi/skillExtraction.service.ts`: call Anthropic API on `cvRawText` → return `skills[]`, `tools[]`, `roles[]`
- Fallback: keyword-dictionary matcher if no API key present
- Frontend: extracted skills shown as editable tags on Profile, merge-able into `user.skills`
- Acceptance: extraction result is deterministic-ish and explainable (log/show what matched or was inferred)

**2. Match % + Reasons**
- Extend `jobMatching.service.ts`: weighted score = skill overlap % + experience level alignment + track alignment
- `/api/jobs/:id/match` returns `{ percentage, matchedSkills, missingSkills }`
- Frontend: match badge + reasons on job cards and detail view + external platform links (LinkedIn, BDjobs, Glassdoor)
- Acceptance: percentage is consistent with the same inputs, reasons are human-readable

**3. Skill Gap Analysis**
- Reuse `missingSkills` from match result → query `LearningResource` by `relatedSkills`
- Frontend: "Skill Gap" section on job detail page with resource recommendations
- Acceptance: every missing skill either has a mapped resource or a clear "no resource yet" state

**4. AI Career Roadmap (mandatory)**
- `modules/roadmap/roadmap.service.ts`: prompt Claude (via `aiApi.service.ts`) with current skills, target role, timeframe → structured phases JSON
- Persist to `roadmap.model.ts` (Roadmap collection) per user; `/api/roadmap/pdf` via `pdfkit`
- Frontend: Roadmap page with phase-by-phase timeline, download button
- Acceptance: roadmap is saved, reloadable, and downloadable; includes topics, project ideas, and an "start applying" marker

**5. CareerBot**
- `modules/careerBot/careerBot.service.ts`: LLM call (via `aiApi.service.ts`) with platform context (user profile + available jobs/resources) injected into system prompt
- `/api/careerbot/ask` + `careerBot.model.ts` (ChatLog) persistence
- Frontend: chat widget, responses labeled as suggestions not guarantees
- Acceptance: bot answers stay on-topic (career/SDG8) and reference real data from the platform when relevant

**6. CV / Profile Assistant** — implement at least one:
- CV PDF export from profile data, or
- AI-generated professional summary + bullet points, or
- LinkedIn/portfolio improvement tips
- Acceptance: output is usable/copyable without further editing needed

---

## 🌟 Bonus Features (optional, tie-breakers)

Only attempt after all core Phase 2 features pass acceptance:

1. **Local Context & Real Impact** — real/sample local job board or gov portal data
2. **Analytics for SDG 8 Impact** — admin dashboard: users analyzed, jobs suggested, in-demand skills, common gaps
3. **Admin Panel** — manage jobs, resources, flagged data
4. **Multi-language Support** — English + one local language (e.g., Bangla)

---

## 🏆 Judging Criteria (Total: 50 points)

| Criterion | Points |
|---|---|
| Relevance to SDG 8 | 10 |
| Functionality & Reliability | 10 |
| AI / Logic Quality | 10 |
| UX & Usability | 8 |
| Technical Implementation | 7 |
| Innovation & Practical Impact | 5 |

---

## 🔑 Environment Variables

```env
# careerforge-backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/career-platform
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
COOKIE_DOMAIN=localhost
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=          # optional in Phase 1, required for full Phase 2 AI features
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

```env
# careerforge-frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api   # used by the Next.js rewrite proxy in next.config.ts, not called directly from components
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## 🚀 Setup & Run

```bash
# Redis (required from Phase 2 onward — run locally or via Docker)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Backend
cd careerforge-backend
npm install
cp .env.example .env
npm run seed     # seeds jobs + learning resources
npm run dev       # http://localhost:5000

# Frontend (Next.js)
cd ../careerforge-frontend
npm install
cp .env.local.example .env.local
npm run dev       # http://localhost:3000
```

---

## 🤖 Agent Working Rules

- Follow the Phase 1 build order top to bottom; don't build Phase 2 endpoints/UI before Phase 1 acceptance criteria pass.
- Every new field added in Phase 2 must extend existing models (no breaking schema changes to Phase 1 fields).
- Backend follows a **modular MVC pattern**: every feature is a self-contained folder under `app/modules/<name>/` with its own `.controller.ts`, `.interface.ts`, `.model.ts` (if it owns a collection), `.routes.ts`, `.service.ts`, `.validation.ts`, and `.constant.ts` as needed. Business logic goes in `.service.ts`, never inline in the controller — controllers only parse the request, call the service, and send the response via `app/helpers/sendResponse.ts`.
- Don't create loose top-level `services/`, `controllers/`, or `models/` folders — everything module-specific lives inside that module's folder. Only truly cross-module code (DB config, JWT config, global error handler, shared AppError class, generic utils) goes in `app/config/`, `app/errorHelpers/`, `app/helpers/`, `app/interfaces/`, `app/middlewares/`, or `app/utils/`.
- Phase 2 extends existing module services (e.g. `jobMatching.service.ts` grows from simple overlap scoring to weighted match %) rather than being rewritten elsewhere.
- Shared AI logic (Anthropic client, skill extraction, CV assist) lives in `modules/aiApi/` and is imported by `roadmap.service.ts` and `careerBot.service.ts` — don't duplicate the Claude client setup per module.
- All API calls go through `lib/serverFetch.ts` — no component calls `fetch()`/`axios` directly. It attaches cookies automatically, retries once on `401` via `/api/auth/refresh`, and redirects to `/login` only if refresh also fails.
- Keep the exact frontend folder structure defined above — new files go into the matching existing folder (`lib/` for `serverFetch`/validations/utils, `hooks/` for `useAuth`/`useDebounce`, `config/` for constants and gateway keys) rather than creating new top-level folders.
- **Next.js App Router discipline:** pages under `app/` default to server components and should fetch their own data server-side with `serverFetch` wherever possible (cookies are forwarded automatically via `next/headers`). Only add `'use client'` to files that actually need it — forms (React Hook Form), the CareerBot widget, charts with interactivity, or anything using `useState`/`useEffect`.
- Forms use **React Hook Form** with a `zod` schema from `lib/validations/` passed through `@hookform/resolvers/zod` — don't hand-roll form state with `useState` per field.
- Use **Sonner** (`toast.success(...)`, `toast.error(...)`) for all user-facing success/error feedback instead of `alert()` or inline banners; `<Toaster />` is mounted once in the root `layout.tsx`.
- Use **Recharts** for the dashboard/analytics visualizations (skill coverage, match-score distribution, roadmap progress) — keep chart components in `components/` and feed them data fetched via `serverFetch`, not mock data.
- Auth gating for `(protected)/*` routes happens in `middleware.ts` (checks the JWT cookie/header and redirects to `/login`), not by wrapping every page in a client-side "ProtectedRoute" component.
- Next.js talks to the Express API over HTTP via `config/` (base URL from `NEXT_PUBLIC_API_URL`) — don't implement business logic in `app/api/` Route Handlers; that's the Express backend's job. Only use a Route Handler for something that must run on the Next.js server itself (e.g. a third-party webhook).
- Use shadcn/ui components (`components/ui/`) as the base for form inputs, buttons, dialogs, and cards instead of hand-rolling them; keep custom composed components (`JobCard`, `MatchBadge`, etc.) in `components/` built on top of `components/ui/`.
- **Redis is for caching/rate-limiting/ephemeral state only — never the source of truth.** Any data that must survive a Redis flush (jobs, resources, roadmaps, chat history, users) belongs in MongoDB; Redis just sits in front of it. Wrap all Redis access through `app/helpers/cache.ts` rather than calling the client directly in services.
- All AI calls (skill extraction, roadmap generation, CareerBot) must fail gracefully with a non-AI fallback or clear error if `ANTHROPIC_API_KEY` is missing, and should check the Redis cache before calling Anthropic.
- **File uploads never touch local disk.** Multer uses memory storage; the buffer streams straight to Cloudinary via `upload.service.ts`. Only the returned Cloudinary URL is persisted on the `User` document.
- **Colors come from the design system only** — use the CSS variables/Tailwind tokens defined in [Design System](#-design-system--careerforge-color-palette) (`bg-primary`, `text-destructive`, etc.), never a raw hex value inline in a component. Match-percentage UI must use the Success/Warning/Error mapping consistently everywhere it appears (job cards, job detail, dashboard charts).
- **Sentry must not break local dev.** If `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` is unset, initialization should no-op rather than throw — same fallback pattern as the AI/Redis config.
- Validate all inputs with `zod` — request validation happens in each module's `.validation.ts`, applied via the shared `validateRequest` middleware.
- After completing each numbered task above, run the app and verify its acceptance criteria before moving to the next task.
- Document any deviation from this spec directly in this README, in the relevant section, not as a separate file.
