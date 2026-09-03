# Step 02 — Auth & User Management

## Summary

Step 2 implements the first feature of the platform: user registration, login, session management via JWT access/refresh tokens in httpOnly cookies, a protected `/auth/me` endpoint, and the frontend login/register pages with route protection. This completes Phase 1 Step 2 per `docs/step2_plan.md`.

## Scope Documented

All work is **uncommitted** on the `main` branch (consistent with Step 1). Work was driven by `docs/step2_plan.md`, which was created earlier in plan mode and now matches what was implemented.

## Backend Changes

### New Files

| File | Purpose |
|------|---------|
| `src/app/modules/user/user.interface.ts` | `IUser` interface for the full User document (all Phase 1 + Phase 2 fields), plus `IUserModel`. |
| `src/app/modules/user/user.model.ts` | Mongoose schema. `email` unique; `passwordHash` required with `select: false` so it never leaks in default queries; `educationLevel`/`experienceLevel`/`preferredTrack` as enums; array fields default to `[]`; timestamps enabled. |
| `src/app/modules/user/user.constant.ts` | `EXPERIENCE_LEVELS` (`Fresher\|Junior\|Mid`), `PREFERRED_TRACKS` (Web Development, Data, Design, Marketing), `EDUCATION_LEVELS`, and derived TS union types. |
| `src/app/modules/user/user.validation.ts` | Zod v4 schemas: `registerUserSchema`, `loginUserSchema`, `updateUserSchema`, plus inferred input types. |
| `src/app/modules/auth/auth.interface.ts` | `IAuthUser` (`{ userId, email }`) and `AuthenticatedRequest` (Express `Request` with optional `user`). |
| `src/app/modules/auth/auth.service.ts` | All business logic: `register` (bcrypt-hash, create, return tokens), `login` (find + compare), `refresh` (verify refresh cookie, new access token), `logout` (clear cookies), `getMe` (current user). `setAuthCookies` helper; `publicUser()` strips `passwordHash` from responses. |
| `src/app/modules/auth/auth.controller.ts` | Thin — parses request, calls service, sends response via `sendResponse`. |
| `src/app/modules/auth/auth.routes.ts` | POST `/register`, `/login`, `/refresh`, `/logout`; GET `/me` (auth required). |
| `src/app/middlewares/auth.middleware.ts` | Reads `accessToken` cookie, verifies via `verifyAccessToken`, attaches `IAuthUser` to `req.user`. |
| `src/app/config/cookie.ts` | Shared cookie config: `ACCESS_TOKEN_COOKIE`/`REFRESH_TOKEN_COOKIE` names, max-ages (15min / 7d), `accessTokenCookieOptions`, `refreshTokenCookieOptions`, `clearCookieOptions`. |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/routes/index.ts` | Mounted the auth router at `/api/auth` (was an empty `Router()`). |
| `src/app/config/env.ts` | Added `COOKIE_SECURE` (defaults `false`); added a fallback default for `MONGODB_URI` (was `string \| undefined`, blocking compilation). |
| `src/app/errorHelpers/globalErrorHandler.ts` | Added a branch to handle the `{ statusCode, message, errorSources }` shaped object that `validateRequest` middleware passes to `next()`. Previously such objects fell through to a generic `500`. This fixes Zod validation errors returning proper `400`s with field-level `errorSources`. |

## Frontend Changes

### New Files

| File | Purpose |
|------|---------|
| `src/lib/validations/auth.ts` | Zod v3 `loginSchema` + `registerSchema` (with password confirmation refine) for React Hook Form. |
| `src/types/user.ts` | `User` type mirroring the backend model, plus `ExperienceLevel`, `PreferredTrack`, `EducationLevel` unions. |
| `src/app/(auth)/layout.tsx` | Centered auth-group shell. |
| `src/app/(auth)/login/page.tsx` | RHF + zod resolver, calls `serverFetch("/auth/login")`, Sonner toast on error, redirects to `?from=` or `/dashboard` on success. Wrapped in `<Suspense>` for `useSearchParams`. |
| `src/app/(auth)/register/page.tsx` | Same pattern → `serverFetch("/auth/register")` → push `/dashboard`. |
| `src/app/(protected)/layout.tsx` | Protected-group shell with a header containing a `LogoutButton` (full Navbar deferred to Step 3). |
| `src/app/(protected)/dashboard/page.tsx` | Minimal client dashboard that fetches `/auth/me` to show the logged-in user's name (full dashboard is Step 6). |
| `src/components/LogoutButton.tsx` | Client button calling `serverFetch("/auth/logout")`, then redirects to `/login`. |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/app/page.tsx` | Replaced Next.js boilerplate with a `redirect("/dashboard")`. |
| `src/middleware.ts` | No change needed (still gates `/dashboard`, `/jobs`, `/resources`, `/profile`, `/roadmap` via the `accessToken` cookie). |

## API Endpoints (verified)

| Method | Path | Auth | Result |
|--------|------|------|--------|
| POST | `/api/auth/register` | none | 201; sets httpOnly `accessToken` (15m) + `refreshToken` (7d); returns user without `passwordHash` |
| POST | `/api/auth/login` | none | 200; sets both cookies; wrong password → 401; missing user → 401 |
| POST | `/api/auth/refresh` | refresh cookie | 200; issues a new `accessToken` cookie |
| POST | `/api/auth/logout` | none | 200; clears both cookies |
| GET | `/api/auth/me` | access cookie | 200 with current user; no cookie → 401 |

Error cases verified: duplicate email → 409; invalid input → 400 with structured `errorSources` (`body.email`, `body.password`, etc.).

## Third-Party Packages Used

No new packages were added. Existing dependencies were used for the first time: `bcrypt` (password hashing, cost 12), `jsonwebtoken` (token sign/verify via `config/jwt.ts`).

## Request/Data Flow

### Registration

```text
POST /api/auth/register
    → validateRequest(registerUserSchema) → 400 on invalid body
    → AuthServices.register(body)
        → check existing email → 409 if taken
        → bcrypt.hash(password, 12)
        → User.create(...)
        → build IAuthUser { userId, email }
    → setAuthCookies(res, authUser)  // httpOnly accessToken + refreshToken
    → sendResponse 201 { data: publicUser }  // passwordHash stripped
```

### Authenticated request (`/api/auth/me`)

```text
GET /api/auth/me (with accessToken cookie)
    → authMiddleware
        → verifyAccessToken(cookie) → 401 if absent/invalid
        → req.user = { userId, email }
    → AuthController.getMe
        → AuthServices.getMe → User.findById(userId) → publicUser
    → sendResponse 200 { data: user }
```

## Testing

Backend verified manually with `curl` against the live backend (Atlas MongoDB):
- register → 201 + both httpOnly cookies set
- login → 200 + cookies; wrong password/missing user → 401
- `/me` with cookie → 200 (no passwordHash); without cookie → 401
- refresh → 200 + new access cookie
- logout → clears both cookies (cookie jar emptied)
- duplicate email → 409; invalid input → 400 with field-level errorSources
- Test users cleaned up from DB afterward.

Frontend: `npm run build` (Next.js production build) and `npm run lint` both pass. Backend `npm run build` + `npm run lint` pass (only pre-existing `no-explicit-any` warnings in `globalErrorHandler.ts`).

## Known Gaps / TODOs

1. `express-session` + `@types/express-session` remain installed but unused (pre-existing; project uses httpOnly cookies). Safe to ignore or remove.
2. Dashboard is a placeholder (full dashboard is Step 6).
3. `(protected)/layout.tsx` uses a minimal header with a `LogoutButton`; the full `Navbar` (Dashboard, Jobs, Resources, Profile links) is Step 3.
4. Logout does not blacklist refresh tokens (Redis is Phase 2) — logout simply clears cookies.
