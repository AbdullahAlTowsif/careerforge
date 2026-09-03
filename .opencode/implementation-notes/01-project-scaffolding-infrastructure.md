# Step 01 — Project Scaffolding & Infrastructure

## Summary

Step 1 establishes the full project skeleton for both the backend (Express + TypeScript + MongoDB) and frontend (Next.js 16 + Tailwind CSS v4 + shadcn/ui). The backend gains a complete MVC-ready folder structure with config management, error handling pipeline, request validation middleware, and JWT utilities. The frontend initializes the shadcn/ui design system with CareerForge brand colors, installs all planned UI and form libraries, and wires up the API proxy and cookie-based fetch wrapper. No business logic or feature routes exist yet — this step is purely foundational.

## Scope Documented

All work is **uncommitted** on the `main` branch. There is no `feature/` branch. The diff is the full working-tree changes against `HEAD` (commit `b14b533`, the last committed state). This was determined by running `git status` and `git diff HEAD`.

The repository has 4 total commits on `main`:
1. `1d4f923` — careerforge init
2. `9751c7e` — folder structure modified
3. `bbab545` — packge.json modified
4. `b14b533` — server start

All Step 1 scaffolding work exists in the uncommitted working tree.

## Backend Changes

### New Files

| File | Purpose |
|------|---------|
| `src/app/config/db.ts` | Mongoose connection wrapper. Calls `mongoose.connect(env.MONGODB_URI)`, logs success, calls `process.exit(1)` on failure. |
| `src/app/config/env.ts` | Typed environment variable loader. Reads `.env` via dotenv, exports a single `env` const with all 17 project variables (PORT, MONGODB_URI, JWT secrets, Redis, Anthropic, Stripe, SSLCommerz, Cloudinary, Sentry, NODE_ENV) with sensible defaults. |
| `src/app/config/jwt.ts` | JWT helpers: `generateAccessToken` (15min TTL), `generateRefreshToken` (7d TTL), `verifyAccessToken`, `verifyRefreshToken`. Exports a `TokenPayload` interface (`{ userId: string; email: string }`). Uses `env.JWT_SECRET` and `env.JWT_REFRESH_SECRET`. |
| `src/app/errorHelpers/AppError.ts` | Custom `AppError` class extending `Error` with `statusCode` field. Exports `handleAppError()` that converts it to `IGenericErrorResponse`. |
| `src/app/errorHelpers/globalErrorHandler.ts` | Express error middleware. Handles: `AppError`, Mongoose `ValidationError`, `CastError`, duplicate key (code 11000), and `SyntaxError`. Returns `{ success: false, message, errorSources[], stack? }`. Stack only included in development. |
| `src/app/helpers/sendResponse.ts` | Generic typed response helper. Sends `{ success, message, meta?, data? }` JSON. Meta supports pagination (page, limit, total, totalPages). |
| `src/app/helpers/catchAsync.ts` | Higher-order function wrapping async Express handlers. Catches promise rejections and forwards to `next()`. |
| `src/app/interfaces/error.interface.ts` | TypeScript interfaces: `IErrorSource` (path + message), `IErrorResponse`, `IGenericErrorResponse` (statusCode + message + errorSources). |
| `src/app/middlewares/notFound.ts` | 404 handler. Returns `{ success: false, message: "API endpoint not found", errorSources: [{ path, message }] }`. |
| `src/app/middlewares/validateRequest.ts` | Zod-based validation middleware. Accepts a body schema, wraps it in a full schema validating `body`, `query`, `params`, `cookies`. Sanitizes validated data back onto the request. Returns structured validation errors on failure. |
| `src/routes/index.ts` | Central route aggregator. Currently creates an empty `Router()` — no module routes wired yet. |
| `.env.example` | Template with all 17 backend environment variables, documented with comments grouping them by category (Server, Database, Auth, Redis, AI, Stripe, SSLCommerz, Cloudinary, Sentry). |
| `eslint.config.mjs` | ESLint flat config using `@eslint/js` recommended + `typescript-eslint` recommended. Rules: `no-explicit-any` as warning, `no-unused-vars` as error (with `_` prefix ignore patterns). Ignores `dist/` and `node_modules/`. |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/app.ts` | Expanded from bare Express + "Hello World" to full middleware pipeline: helmet → CORS (localhost:3000 + localhost:5000, credentials) → conditional morgan dev logging → express.json (10mb) + urlencoded + cookie-parser → health check at `GET /` → API routes at `/api` → notFound → globalErrorHandler. |
| `src/server.ts` | Expanded from minimal listen-on-5000 to: `connectDB()` before listen, configurable port via `env.PORT`, graceful shutdown handlers for `unhandledRejection`, `uncaughtException`, `SIGINT`, `SIGTERM`. Properly closes both HTTP server and Mongoose connection. |
| `tsconfig.json` | Changed `"types": []` to `"types": ["node"]` and uncommented `"lib": ["esnext"]`. Required for Node.js type definitions (previously had empty types which would cause missing type errors). |
| `package.json` | Added `"type": "module"` (ESM). Changed `dev` script from `ts-node-dev` to `tsx watch`. Added `seed` script. Added dependencies: `helmet`, `morgan`, `@types/morgan`, `@types/node`, `tsx`. |

### Empty Module Folders Created

10 empty module directories under `src/app/modules/`:
- `aiApi/`, `auth/`, `careerBot/`, `jobMatching/`, `jobOpportunity/`, `learningResource/`, `payment/` (with empty `gateways/` subfolder), `roadmap/`, `upload/`, `user/`

Also empty: `src/app/utils/`, `seed/`, `dist/`

## Frontend Changes

### New Files

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Exports `cn()` helper — merges `clsx` and `tailwind-merge` for conditional Tailwind class merging. Used by all shadcn components. |
| `src/lib/serverFetch.ts` | The single fetch wrapper for all API calls. Attaches credentials (httpOnly cookies) automatically. On 401, attempts `POST /api/auth/refresh` once and retries. If refresh fails, redirects to `/login` (with `from` query param). Unwraps backend's `{ success, data }` response shape. Exports `ServerFetchError` class with `statusCode` and `errorSources`. Uses a `redirectingToLogin` flag to prevent redirect loops. |
| `src/middleware.ts` | Next.js middleware for route protection. Checks for `accessToken` cookie on protected routes (`/dashboard`, `/jobs`, `/resources`, `/profile`, `/roadmap`). Redirects to `/login?from=<path>` if no token. |
| `.env.local.example` | Template with 3 frontend variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`. |
| `components.json` | shadcn/ui configuration: "new-york" style, RSC enabled, TSX, slate base color, CSS variables, lucide icons, path aliases (`@/components`, `@/lib/utils`, etc.). |

### shadcn/ui Components Installed (13)

All under `src/components/ui/`:

| Component | Exports |
|-----------|---------|
| `avatar.tsx` | Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount |
| `badge.tsx` | Badge (6 variants: default, secondary, destructive, outline, ghost, link) |
| `button.tsx` | Button (6 variants × 8 sizes including icon sizes) |
| `card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter |
| `dialog.tsx` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogOverlay, DialogPortal |
| `form.tsx` | Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, useFormField — integrated with react-hook-form |
| `input.tsx` | Input |
| `label.tsx` | Label (client component, Radix primitive) |
| `select.tsx` | Select, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectGroup, SelectValue, SelectSeparator |
| `separator.tsx` | Separator |
| `sonner.tsx` | Toaster — wraps sonner with CareerForge theme CSS variables, lucide icons, next-themes integration |
| `tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent (2 variants: default, line) |
| `textarea.tsx` | Textarea |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/app/globals.css` | Replaced default Next.js color hex values with CareerForge design system HSL CSS variables. Added 20+ shadcn tokens (card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, success, warning). Added `--radius` variable and radius utilities. Added `@layer base` for border/body styling. Added `tw-animate-css` import and dark mode custom variant. Removed the `prefers-color-scheme: dark` media query block. |
| `src/app/layout.tsx` | Changed metadata from "Create Next App" to "CareerForge" with SDG 8 description. Added `<Toaster richColors position="top-right" />` to body. Changed `LayoutProps<"/">` to `React.ReactNode` children type. |
| `next.config.ts` | Added rewrite proxy: `/api/:path*` → `http://localhost:5000/api/:path*` (reads `NEXT_PUBLIC_API_URL` env, falls back to localhost:5000). |
| `package.json` | Added 17 new dependencies (see Third-Party Packages section below). |

### Files Not Changed (Still Default)

| File | Status |
|------|--------|
| `src/app/page.tsx` | Still the default Next.js boilerplate homepage ("To get started, edit the page.tsx file"). |
| `.env` | Empty file (no env vars set). |

## Third-Party Packages Used

### Newly Added — Backend (5 packages)

| Package | Version | Where Used | Why |
|---------|---------|-----------|-----|
| `helmet` | ^8.3.0 | `src/app.ts` | Sets security-related HTTP headers (X-Content-Type-Options, Strict-Transport-Security, etc.). Installed per project plan Step 1. |
| `morgan` | ^1.12.0 | `src/app.ts` | HTTP request logger in dev mode (conditional on `NODE_ENV === "development"`). Installed per project plan Step 1. |
| `@types/morgan` | ^1.9.10 | TypeScript type support for morgan | Required for TypeScript to recognize morgan's type signatures. |
| `@types/node` | ^26.4.1 | TypeScript type support | Provides Node.js type definitions (tsconfig.json references `"types": ["node"]`). |
| `tsx` | ^4.23.13 | `package.json` scripts (`dev`, `seed`) | Replaced `ts-node-dev` for dev server (`tsx watch`) and will be used for seed scripts. Faster TypeScript execution without type checking overhead. |

### Newly Added — Frontend (17 packages)

| Package | Version | Where Used | Why |
|---------|---------|-----------|-----|
| `@hookform/resolvers` | ^5.9.1 | `src/lib/validations/*.ts` (future), shadcn form component | Zod resolver integration for react-hook-form — will validate form inputs against Zod schemas. |
| `class-variance-authority` | ^0.7.1 | `src/components/ui/button.tsx`, `badge.tsx`, `tabs.tsx` | Generates variant-based CSS class maps. Core dependency of shadcn/ui component variants. |
| `clsx` | ^2.1.1 | `src/lib/utils.ts` | Conditional classname joining. Half of the `cn()` helper. |
| `date-fns` | ^4.4.1 | (not yet used — installed for future roadmap/date features) | Lightweight date formatting/manipulation library. Will be used for roadmap phase dates and job posting dates. |
| `lucide-react` | ^1.40.0 | `src/components/ui/select.tsx` (ChevronDown, ChevronUp, Check icons), `dialog.tsx` (X icon), `sonner.tsx` (status icons) | SVG icon library. Default icon provider for shadcn/ui components. |
| `next-themes` | ^0.4.6 | `src/components/ui/sonner.tsx` | Theme detection (light/dark/system) for the Toaster component. Required by shadcn's sonner wrapper. |
| `radix-ui` | ^1.6.7 | All shadcn/ui components | Headless UI primitives. The new unified Radix package — provides Dialog, Select, Tabs, Avatar, Label, Separator, Slot. |
| `react-hook-form` | ^7.87.0 | `src/components/ui/form.tsx`, future form pages | Performant form state management. Powers the shadcn Form component with Controller, FormProvider, useFormContext. |
| `recharts` | ^3.10.1 | (not yet used — installed for future dashboard charts) | React charting library. Will be used for DashboardCharts (skill coverage, match score distribution). |
| `sonner` | ^2.0.8 | `src/components/ui/sonner.tsx`, `src/app/layout.tsx` | Toast notification library. Integrated as `<Toaster>` in root layout for all user-facing feedback. |
| `tailwind-merge` | ^3.6.0 | `src/lib/utils.ts` | Intelligent Tailwind class merging. The other half of the `cn()` helper — prevents conflicting classes. |
| `tw-animate-css` | ^1.4.0 | `src/app/globals.css` | Tailwind CSS animation utilities. Required by shadcn/ui for dialog/toast enter/exit animations. |
| `zod` | ^3.25.76 | `src/components/ui/form.tsx` (future validation schemas) | TypeScript-first schema validation. Will be used for form validation via @hookform/resolvers. Note: frontend uses v3, backend uses v4. |

### Pre-Existing — Backend (used in new ways)

| Package | New Usage |
|---------|-----------|
| `bcrypt` | Listed as dependency but not yet used in Step 1 (will be used in Step 2 auth) |
| `jsonwebtoken` | Now used via `src/app/config/jwt.ts` for token generation/verification |
| `cookie-parser` | Now wired into `src/app.ts` middleware pipeline |
| `cors` | Now configured in `src/app.ts` with specific origins + credentials |
| `dotenv` | Now used via `src/app/config/env.ts` with centralized env loading |

## Request/Data Flow

### Health Check (the only active endpoint)

```text
Client sends GET / (or GET /api/* which hits the 404 handler)
    → Express receives request
    → helmet() sets security headers
    → cors() checks origin + sets Access-Control headers
    → morgan("dev") logs request (if NODE_ENV=development)
    → express.json() + express.urlencoded() parse body
    → cookie-parser parses cookies
    → Route matching:
        GET /       → returns "CareerForge API is running" (200, text/html)
        GET /api/*  → router (currently empty) → notFound middleware → 404 JSON
        * (any)     → notFound middleware → 404 JSON
    → If error thrown at any point → globalErrorHandler catches, classifies, returns structured JSON
```

### Frontend-to-Backend Proxy Flow (for future use)

```text
Browser requests /api/some-endpoint
    → Next.js middleware.ts checks cookie for protected routes
    → next.config.ts rewrites /api/:path* → http://localhost:5000/api/:path*
    → Express backend receives the request
    → Response flows back through the rewrite to the browser
```

### serverFetch Flow (for future use in Server Components)

```text
Server Component calls serverFetch("/auth/me")
    → Constructs URL: /api/auth/me
    → Calls fetch() with credentials: "include" (forwards httpOnly cookies)
    → If 401 response:
        → Calls POST /api/auth/refresh with credentials
        → If refresh succeeds → retries original request
        → If refresh fails → throws ServerFetchError with 401
    → If non-OK response → throws ServerFetchError with status + errorSources
    → If OK → unwraps { success, data } envelope, returns data
```

## API Testing (Postman)

### Active Endpoints

#### GET / — Health Check
```
Auth: none

Headers:
  (none required — standard browser/AJAX request works)

Success response (200):
  Content-Type: text/html
  Body: "CareerForge API is running"

404 response (for any unknown route):
  Content-Type: application/json
  {
    "success": false,
    "message": "API endpoint not found",
    "errorSources": [
      {
        "path": "/unknown-route",
        "message": "Route /unknown-route does not exist"
      }
    ]
  }
```

### Base URL Configuration

- **Backend port**: `5000` (controlled by `PORT` env var, defaults to 5000)
- **Base URL**: `http://localhost:5000`
- **API prefix**: All feature routes will be mounted at `/api/...` (router mounted at `/api` in `src/app.ts`)
- **Frontend proxy**: Next.js rewrites `/api/*` → `http://localhost:5000/api/*` (configured in `next.config.ts` via `NEXT_PUBLIC_API_URL` env)

### Postman Collection

No Postman collection (`.postman_collection.json`) exists in the repository.

## Environment Variables Added

### Backend (.env / .env.example)

| Variable | Default | Required | Purpose |
|----------|---------|----------|---------|
| `PORT` | `5000` | No | HTTP server port |
| `MONGODB_URI` | `mongodb://localhost:27017/career-platform` | Yes for DB | MongoDB connection string |
| `JWT_SECRET` | `change-me` | Yes for auth (Step 2) | Access token signing secret |
| `JWT_REFRESH_SECRET` | `change-me-too` | Yes for auth (Step 2) | Refresh token signing secret |
| `COOKIE_DOMAIN` | `localhost` | No | Domain for httpOnly cookies |
| `REDIS_URL` | `redis://localhost:6379` | No (Phase 2) | Redis connection string |
| `ANTHROPIC_API_KEY` | `""` | No (Phase 2) | Claude API key for AI features |
| `STRIPE_SECRET_KEY` | `""` | No (Bonus) | Stripe payment gateway key |
| `STRIPE_WEBHOOK_SECRET` | `""` | No (Bonus) | Stripe webhook verification |
| `SSLCOMMERZ_STORE_ID` | `""` | No (Bonus) | SSLCommerz store ID |
| `SSLCOMMERZ_STORE_PASSWORD` | `""` | No (Bonus) | SSLCommerz store password |
| `SSLCOMMERZ_IS_LIVE` | `false` | No (Bonus) | SSLCommerz environment toggle |
| `CLOUDINARY_CLOUD_NAME` | `""` | No (Phase 2) | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `""` | No (Phase 2) | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `""` | No (Phase 2) | Cloudinary API secret |
| `SENTRY_DSN` | `""` | No (Phase 2) | Sentry error reporting DSN |
| `NODE_ENV` | `development` | No | Environment mode (affects morgan logging, error stack traces) |

### Frontend (.env / .env.local.example)

| Variable | Default | Required | Purpose |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | No | Backend API base URL for the rewrite proxy |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `""` | No (Bonus) | Stripe client-side key |
| `NEXT_PUBLIC_SENTRY_DSN` | `""` | No (Phase 2) | Sentry frontend DSN |

## Known Gaps / TODOs

1. **No AGENTS.md exists** — The project plan references conventions, but no `AGENTS.md` was found at root, backend, or frontend level. There is no documented source of truth for step status tracking.

2. **Module folders are all empty** — All 10 module directories under `src/app/modules/` are empty placeholders. No controllers, services, models, interfaces, routes, or validation files exist yet.

3. **`src/routes/index.ts` is an empty router** — The central route aggregator creates and exports a bare `Router()` with no routes mounted. No module routes are wired up.

4. **No `auth.middleware.ts` exists** — The project plan lists `auth.middleware.ts` under middlewares for Step 1, but it was not created. Only `notFound.ts` and `validateRequest.ts` were implemented. Auth middleware is likely deferred to Step 2 (Auth & User Management).

5. **`seed/` directory is empty** — The `seed/` directory exists but contains no files (`seedJobs.ts`, `seedResources.ts`, `runSeed.ts` are planned for Step 4). The `seed` script in `package.json` references `tsx ./seed/runSeed.ts` which would fail if run now.

6. **No `CAREER_FORGE.md` or `README.md` at root** — The project plan references a root-level `CAREER_FORGE.md` for setup documentation. No root-level README exists (only `docs/project_plan_v1.md`).

7. **Frontend `.env` is empty** — The actual `.env` file in the frontend is empty. Without `NEXT_PUBLIC_API_URL` set, the proxy falls back to `http://localhost:5000/api` (hardcoded default in `next.config.ts`), which is correct for local dev.

8. **Homepage is still boilerplate** — `src/app/page.tsx` is still the default Next.js "To get started, edit the page.tsx file" placeholder. No CareerForge landing page or redirect to login exists.

9. **No automated tests** — The `test` script in backend `package.json` is the default `echo "Error: no test specified" && exit 1`. No test framework is installed or configured on either side.

10. **Frontend zod is v3, backend zod is v4** — The backend uses `zod@^4.5.4` while the frontend uses `zod@^3.25.76`. This is a potential source of schema incompatibility if shared validation schemas are attempted between the two packages. The `validateRequest.ts` middleware imports from `zod` (v4 API) while `@hookform/resolvers` on the frontend expects zod v3.

11. **`express-session` installed but unused** — Both `@types/express-session` and `express-session` are in backend dependencies but are not imported or used anywhere. This appears to be leftover from the initial scaffold and is not needed (project uses httpOnly cookies, not session-based auth).

## Testing

**No automated tests exist.** The backend `test` script is a placeholder (`echo "Error: no test specified" && exit 1`). No test framework (Jest, Vitest, Mocha, Playwright, etc.) is installed in either package. No test files exist anywhere in the repository.

**Manual verification (from project plan acceptance criteria):**
- [ ] `npm run dev` works on both backend (port 5000) and frontend (port 3000) — **verifiable**
- [ ] Backend returns 200 on `GET /` — **verifiable via Postman**
- [ ] Frontend proxy to backend works (`/api/` rewrite) — **verifiable by hitting `/api/` from the frontend origin**

None of these acceptance criteria have been verified in code or documentation. The scaffolding code appears complete and correct, but manual testing is needed to confirm.
