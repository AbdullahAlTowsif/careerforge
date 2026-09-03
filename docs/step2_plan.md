# Phase 1, Step 2 — Auth & User Management Plan

> **Status:** Planned (not yet implemented)
> **Depends on:** Step 1 (Project Scaffolding & Infrastructure) — complete
> **Scope:** User model + registration/login/refresh/logout + JWT auth middleware + login/register pages

---

## Context

Step 1 delivered the full MVC skeleton, error-handling pipeline, `validateRequest` middleware, JWT helpers (`src/app/config/jwt.ts`), the `serverFetch` fetch wrapper, and the Next.js route-protection `middleware.ts`. Steps 2–17 are "Not started". All module folders under `src/app/modules/` are empty — Step 2 is the first feature step.

Key facts carried forward from Step 1:
- Auth model: JWT access (15 min) + refresh (7 days) in **httpOnly cookies**; cookie name `accessToken` hardcoded in both backend `config/jwt.ts` and frontend `middleware.ts`.
- No global auth store — the session is the cookie itself.
- `serverFetch.ts` is the single fetch wrapper; auto-refreshes on 401, redirects to `/login` if refresh fails.
- Next.js proxies `/api/*` → `http://localhost:5000/api/*` so cookies stay same-origin.
- Backend is ESM (`"type": "module"`, `"module": "nodenext"`) — internal imports need `.js` extensions.
- Backend zod is **v4**, frontend zod is **v3** — schemas are not shareable.

### Decisions confirmed with the user

1. **Introduce `(auth)` and `(protected)` route groups now** — matches CAREER_FORGE.md folder structure and eases Step 3.
2. **Homepage `/` redirects to `/dashboard`** — which is token-gated by middleware.
3. **Add a minimal dashboard placeholder** — so the post-login redirect has a target (full dashboard is Step 6).
4. **Logout clears cookies only** — Redis refresh-token blacklisting is deferred to Phase 2.

---

## Backend (`careerforge-backend/`)

### User module (`src/app/modules/user/`)

| File | Purpose |
|------|---------|
| `user.interface.ts` | TypeScript interface for the full User document — all Phase 1 + Phase 2 fields (see schema below). |
| `user.model.ts` | Mongoose schema. `email` unique; `passwordHash` required with `select: false` so it never leaks in queries; timestamps enabled. |
| `user.constant.ts` | `EXPERIENCE_LEVELS` (`Fresher \| Junior \| Mid`), `PREFERRED_TRACKS` (Web Development, Data, Design, Marketing), `EDUCATION_LEVELS`, role enum. |
| `user.validation.ts` | Zod v4 schemas: `registerUserSchema`, `loginUserSchema`, `updateUserSchema`. |

### Auth module (`src/app/modules/auth/`)

| File | Purpose |
|------|---------|
| `auth.interface.ts` | `AuthenticatedRequest` — extends Express `Request` with a typed `user` property. |
| `auth.service.ts` | `register()` — validate, bcrypt-hash password, create user, generate tokens, set httpOnly cookies. `login()` — find user, compare password, generate tokens, set cookies. `refresh()` — read refresh cookie, verify, issue a new access cookie. `logout()` — clear cookies. `me()` — return the current user from DB excluding `passwordHash`. |
| `auth.controller.ts` | Thin — parse request, call service, send `sendResponse`. |
| `auth.routes.ts` | POST `/register`, POST `/login`, POST `/refresh`, POST `/logout` (public), GET `/me` (auth required). |

### Shared infrastructure

| File | Purpose |
|------|---------|
| `src/app/middlewares/auth.middleware.ts` | Reads `accessToken` cookie → `verifyAccessToken` → loads user → attaches to `req`. |
| `src/app/config/env.ts` | Add `COOKIE_SECURE` (default `false` for local dev); add a cookie-options helper (httpOnly, sameSite, secure, path, maxAge). |
| `src/routes/index.ts` | Mount the auth router and import the user model so it registers with Mongoose. |

### User model schema (from CAREER_FORGE.md)

```ts
{
  _id: ObjectId,
  fullName: string,
  email: string,           // unique, validated
  passwordHash: string,
  educationLevel: string,  // e.g. "BSc CSE", department
  experienceLevel: "Fresher" | "Junior" | "Mid",
  preferredTrack: string,  // e.g. "Web Development", "Data", "Design", "Marketing"
  skills: string[],        // user-managed tags — reused by Phase 2 matching
  experienceNotes: string, // free text: projects/experience
  careerInterests: string[],
  cvRawText: string,       // pasted CV text, stored in Phase 1, parsed in Phase 2
  cvFileUrl: string,       // Cloudinary URL (optional, Phase 2)
  avatarUrl: string,       // Cloudinary URL, optional
  extractedSkills: string[],   // [Phase 2] AI/heuristic-extracted, editable tags
  extractedRoles: string[],    // [Phase 2] e.g. "Frontend Developer"
  createdAt: Date,
  updatedAt: Date
}
```

### API endpoints

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| POST | `/api/auth/register` | none | Create user, hash password with bcrypt, set httpOnly `accessToken` + `refreshToken` cookies |
| POST | `/api/auth/login` | none | Validate credentials, set httpOnly access + refresh cookies |
| POST | `/api/auth/refresh` | none (refresh cookie) | Read refresh cookie, verify, issue a new access cookie |
| POST | `/api/auth/logout` | none | Clear both httpOnly cookies |
| GET | `/api/auth/me` | required | Return the current user from DB (no passwordHash) |

---

## Frontend (`careerforge-frontend/`)

| File | Purpose |
|------|---------|
| `src/lib/validations/auth.ts` | Zod v3 register/login schemas (required fields, email format, min password length) for React Hook Form. |
| `src/types/` (`auth.ts` or `index.ts`) | TypeScript types mirroring the backend User model. |
| `src/app/(auth)/layout.tsx` | Auth route-group shell (centered card layout). |
| `src/app/(auth)/login/page.tsx` | RHF + zod resolver → `serverFetch("/auth/login")` → `toast.error` on failure → `router.push(from ?? "/dashboard")` on success. |
| `src/app/(auth)/register/page.tsx` | Same pattern → `serverFetch("/auth/register")` → push `/dashboard`. |
| `src/app/(protected)/layout.tsx` | Protected route-group shell (placeholder; full Navbar comes in Step 3). |
| `src/app/(protected)/dashboard/page.tsx` | Minimal "You're logged in" placeholder (post-login target; full dashboard is Step 6). |
| `src/middleware.ts` | Update to redirect `/` → `/dashboard` and keep protected prefix list (`/dashboard`, `/jobs`, `/resources`, `/profile`, `/roadmap`). |
| `src/app/page.tsx` | Replace Next.js boilerplate with a redirect to `/dashboard`. |
| Logout action | A small client component in the protected shell that calls `serverFetch("/auth/logout")` → clear UI state → redirect to `/login`; wire a Sonner toast. |

---

## Implementation Order

1. Backend User module (`user.interface.ts` → `user.model.ts` → `user.constant.ts` → `user.validation.ts`).
2. Backend Auth module (`auth.interface.ts` → `auth.service.ts` → `auth.controller.ts` → `auth.routes.ts`).
3. `auth.middleware.ts`, `env.ts` updates, wire routes in `src/routes/index.ts`.
4. Frontend validation schemas + types.
5. Route groups `(auth)` and `(protected)`, login/register pages, dashboard placeholder.
6. Update `middleware.ts`, `page.tsx`, add logout action.

---

## Acceptance Criteria

- [ ] Can register a new user and receive `accessToken` + `refreshToken` in httpOnly cookies.
- [ ] Can access `GET /api/auth/me` with a valid token (response excludes `passwordHash`).
- [ ] Invalid input is rejected with clear, structured error messages (400 with `errorSources`).
- [ ] Refresh flow: an expired access token triggers `POST /api/auth/refresh` once, then retries the original request successfully.
- [ ] Unauthenticated users are redirected to `/login?from=<path>`; after login they land on `/dashboard`.
- [ ] Logout clears both cookies.

---

## Notes / Gotchas

- Keep the `accessToken` cookie name identical across backend and frontend.
- `passwordHash` must use `select: false` and `me()` must explicitly exclude it from the response.
- Backend zod v4 vs frontend zod v3 — write schemas per-package, never share.
- Redis refresh-token blacklisting is intentionally skipped in Phase 2 (logout = clear cookies only).
- No test framework exists — verify manually per the acceptance criteria.
