# Step 03 — Profile & Skills

## Summary
This step delivers a full editable user profile: a protected backend API (`GET`/`PUT /api/profile`) backed by the existing Mongoose `User` model, plus a frontend Profile page with a complete edit form (name, education, experience, track, skills, interests, experience notes, and raw CV text). It also introduces a reusable `Navbar` (with active-route highlighting and a responsive mobile menu) that replaces the previous bare header on all protected pages. The `PREFERRED_TRACKS` enum was expanded on both backend and frontend to the full 8-track list, and the two sides are kept in sync.

> **Note on roadmap status:** `AGENTS.md` still lists Step 3 as "Not started", but the implementation exists in the current **uncommitted working tree** (see Scope Documented). It has been verified working via direct HTTP testing of the backend endpoints and clean `lint`/`build` on both packages.

## Scope Documented
- **Scope:** uncommitted working-tree changes vs. `HEAD` (`8a21e8a`, the Step 2 commit). No branch, no commits were created for this step.
- **How determined:** `git status` / `git diff HEAD`. All Step 3 code is untracked or unstaged; nothing related has been committed.
- Files in this diff (modified): `routes/index.ts`, `user.constant.ts`, `(protected)/layout.tsx`, `types/user.ts`.
- Additional untracked files created for this step: `user.service.ts`, `user.controller.ts`, `user.routes.ts`, `(protected)/profile/page.tsx`, `components/Navbar.tsx`, `components/TagInput.tsx`, `lib/validations/profile.ts`.

## Backend Changes
| File | Change |
|------|--------|
| `src/app/modules/user/user.service.ts` (NEW) | `UserServices.getProfile(userId)` finds the user by ID and throws `AppError(404)` if missing. `UserServices.updateProfile(userId, data)` finds the user, applies only a whitelist of editable fields (`fullName`, `educationLevel`, `experienceLevel`, `preferredTrack`, `skills`, `experienceNotes`, `careerInterests`, `cvRawText`) via `user.set()`, then saves. Both return the Mongoose document (password hash excluded by schema `select: false`). |
| `src/app/modules/user/user.controller.ts` (NEW) | `getProfile` and `updateProfile` controllers — thin HTTP handlers wrapped in `catchAsync`, extracting `userId` from `req.user!`, calling the service, and returning via `sendResponse`. |
| `src/app/modules/user/user.routes.ts` (NEW) | Express Router with `GET /` and `PUT /` — both guarded by `authMiddleware`. `PUT` also runs `validateRequest(updateUserSchema)`. Exported as `UserRoutes`. |
| `src/routes/index.ts` (MODIFIED) | Imported and mounted `UserRoutes` under `/profile` (`router.use("/profile", UserRoutes)`), alongside the existing `AuthRoutes` at `/auth`. |
| `src/app/modules/user/user.constant.ts` (MODIFIED) | `PREFERRED_TRACKS` expanded from `["Web Development","Data","Design","Marketing"]` to 8 entries: `Web Development`, `App Development`, `Game Development`, `Software Engineering`, `Machine Learning`, `Data Science`, `UI UX Design`, `Marketing`. (Pre-existing `EXPERIENCE_LEVELS` and `EDUCATION_LEVELS` unchanged.) |

**Auth model (unchanged, used by this step):** `authMiddleware` (`src/app/middlewares/auth.middleware.ts`) reads the `accessToken` httpOnly cookie, verifies it via `verifyAccessToken`, and attaches `{ userId, email }` to `req.user`. This is cookie-based auth, **not** a Bearer header.

**Route registration detail:** both endpoints are registered at the router root (`/`), and because the router is mounted at `/profile`, the full paths are `GET /api/profile` and `PUT /api/profile` (the API is served on port `5000`, mounted at `/api` in `src/app.ts`, with `routes/index.ts` applied under that prefix).

## Frontend Changes
| File | Change |
|------|--------|
| `src/app/(protected)/profile/page.tsx` (NEW) | Client component. On mount calls `serverFetch("/auth/me")` to hydrate the form, then renders an edit form. On submit it `PUT /api/profile` with the form values via `serverFetch`, updates local state, and toasts success/error. Loading state shows a "Loading your profile..." message; the submit button shows a spinner and disables while saving. Uses React Hook Form + `zodResolver(profileUpdateSchema)`. No validation is applied to `careerInterests` in the JSX (only `skills` shows an inline error). |
| `src/components/Navbar.tsx` (NEW) | Client component. Renders the brand link, desktop nav (Dashboard, Jobs, Resources, Profile), `LogoutButton`, and a right-aligned mobile hamburger (`Menu`/`X` icons) that toggles a stacked menu on small screens. Active link detection uses `usePathname()` (exact match or prefix match). |
| `src/components/TagInput.tsx` (NEW) | Reusable chip/tag input. Renders existing tags as shadcn/ui `Badge` (outline variant) with an `X` remove button. Typing and pressing Enter or comma adds a tag; backspace on an empty input removes the last tag; `onBlur` commits the current draft; de-duplicates case-insensitively; enforces `maxTags` (default 20) and a `disabled` prop. |
| `src/lib/validations/profile.ts` (NEW) | Frontend Zod (v3) schemas mirroring the backend `updateUserSchema` plus re-exported `EDUCATION_LEVELS` / `EXPERIENCE_LEVELS` / `PREFERRED_TRACKS` arrays. Exports `ProfileUpdateFormValues` type. |
| `src/app/(protected)/layout.tsx` (MODIFIED) | Replaced the inline header (brand + `LogoutButton`) with `<Navbar />`. The main content wrapper is unchanged. |
| `src/types/user.ts` (MODIFIED) | `PreferredTrack` union expanded to the same 8 tracks as the backend (containing e.g. `"Data Science"`, `"Machine Learning"`, `"UI UX Design"`). `User` interface otherwise unchanged. |

**API integration:** All frontend calls go through `src/lib/serverFetch.ts` (unchanged), which prepends `/api`, sends `credentials: "include"`, auto-refreshes on 401, and unwraps the backend `{ success, message, data }` envelope to return `data`.

## Third-Party Packages Used
**No new packages were introduced for this step.** `git diff` on both `careerforge-backend/package.json` and `careerforge-frontend/package.json` is empty.

Packages already present (Step 1–2) that were reused, with their role in this step:
- `react-hook-form` + `@hookform/resolvers` (frontend) — form state and Zod validation for the Profile form; `useForm`/`useWatch`/`setValue` used in `profile/page.tsx`.
- `zod` (frontend v3, backend v4) — `profileUpdateSchema` (frontend) and `updateUserSchema` (backend). Noted: the two major versions are incompatible, so schemas are duplicated, not shared.
- shadcn/ui components (frontend) — `Card`, `Input`, `Label`, `Badge`, `Select`, `Textarea`, `Button` from `src/components/ui/`.
- `lucide-react` (frontend) — `Menu`/`X` icons in `Navbar.tsx`, `X` in `TagInput.tsx`, `Loader2` spinner in the profile submit button.
- `sonner` (frontend) — `toast.success`/`toast.error` on the Profile page.
- `express` + `mongoose` (backend) — routing and Mongoose `User` document read/write.

## Request/Data Flow

### View profile (frontend → backend)
```text
Profile page mounts (client component)
    → GET /api/auth/me (careerforge-backend) via serverFetch (auto-proxied by Next.js)
    → AuthController.getMe → AuthServices.getMe(userId)
    → User.findById(userId), passwordHash excluded by schema
    → response: 200 { success, message, data: User }
    → profile/page.tsx hydrates form fields via setValue(...), sets loading=false
```

### Save profile (frontend → backend)
```text
User clicks "Save changes"
    → profileUpdateSchema validates the form (frontend, zod v3)
    → PUT /api/profile via serverFetch
    → authMiddleware verifies accessToken cookie (401 if missing/invalid)
    → validateRequest(updateUserSchema) validates body (zod v4, 400 on error)
    → UserController.updateProfile → UserServices.updateProfile(userId, body)
    → whitelist loop user.set(field, value) for the 8 editable fields, user.save()
    → response: 200 { success, message, data: updated User }
    → profile/page.tsx setUser(updated) + toast.success("Profile updated successfully")
```

**Auth/authorization:** both endpoints are protected. The middleware reads the JWT from the `accessToken` httpOnly cookie, not an authorization header. The route handlers trust `req.user.userId` set by `authMiddleware`; they never accept a userId from the client.

## API Testing (Postman)

- **Base URL:** `http://localhost:5000/api` (port controlled by `PORT` in `careerforge-backend/.env`, default `5000`).
- **Auth mechanism:** httpOnly cookie `accessToken`. To use protected endpoints you must have registered/logged in within the cookie jar. In Postman, the **Postman Cookie Jar** is enabled by default, so cookies set by the login/register response will be sent automatically on subsequent requests.
- **No Postman collection** exists in the repo; the blocks below can be copied directly.

### POST /api/auth/register
**Auth:** none

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "SecurePass123",
  "educationLevel": "Bachelor",
  "experienceLevel": "Fresher",
  "preferredTrack": "Web Development"
}
```

**Success response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "_id": "65f8...", "fullName": "Jane Doe", "email": "jane.doe@example.com",
    "educationLevel": "Bachelor", "experienceLevel": "Fresher",
    "preferredTrack": "Web Development", "skills": [],
    "careerInterests": [], "extractedSkills": [], "extractedRoles": [],
    "createdAt": "...", "updatedAt": "...", "__v": 0
  }
}
```
Sets `accessToken` + `refreshToken` httpOnly cookies.

**Error responses:**
- `400 Validation Error` — invalid email format, short password, or a `preferredTrack`/`educationLevel` not in the enum.
- `409` — `"An account with email ... already exists"` (duplicate email).

### POST /api/auth/login
**Auth:** none

**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "jane.doe@example.com", "password": "SecurePass123" }
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "_id": "65f8...", "fullName": "Jane Doe", "email": "jane.doe@example.com", "..."
  }
}
```
Sets the JWT httpOnly cookies.

**Error responses:**
- `400 Validation Error` — missing field.
- `401` — `"Invalid email or password"`.

### GET /api/profile
**Auth:** protected — requires the `accessToken` httpOnly cookie.

**Headers:** none (no body)

**Success response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "65f8...", "fullName": "Jane Doe", "email": "jane.doe@example.com",
    "educationLevel": "Bachelor", "experienceLevel": "Fresher",
    "preferredTrack": "Web Development",
    "skills": [], "careerInterests": [],
    "extractedSkills": [], "extractedRoles": [],
    "createdAt": "...", "updatedAt": "...", "__v": 0
  }
}
```

**Error responses:**
- `401` — `"You are not logged in. Please log in first."` (no/invalid cookie).
- `404` — `"User not found"` (only if the token's user was deleted).

### PUT /api/profile
**Auth:** protected — requires the `accessToken` httpOnly cookie.

**Headers:** `Content-Type: application/json`

**Body (any subset of the editable fields is accepted; all fields optional):**
```json
{
  "fullName": "Jane Q. Doe",
  "educationLevel": "Master",
  "experienceLevel": "Junior",
  "preferredTrack": "Data Science",
  "skills": ["JavaScript", "React", "Python", "MongoDB"],
  "experienceNotes": "2 years of internship experience at a SaaS startup.",
  "careerInterests": ["Frontend", "Backend", "Data"],
  "cvRawText": "Experienced developer with skills in JavaScript and Python."
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "65f8...", "fullName": "Jane Q. Doe", "email": "jane.doe@example.com",
    "educationLevel": "Master", "experienceLevel": "Junior",
    "preferredTrack": "Data Science",
    "skills": ["JavaScript", "React", "Python", "MongoDB"],
    "experienceNotes": "2 years of internship experience at a SaaS startup.",
    "careerInterests": ["Frontend", "Backend", "Data"],
    "cvRawText": "Experienced developer with skills in JavaScript and Python.",
    "extractedSkills": [], "extractedRoles": [],
    "createdAt": "...", "updatedAt": "...", "__v": 1
  }
}
```

**Error responses:**
- `400 Validation Error` — e.g. `preferredTrack: "Invalid Track"`, or `skills` containing non-strings:
```json
{
  "success": false,
  "message": "Validation Error",
  "errorSources": [
    { "path": "body.preferredTrack", "message": "Invalid option: expected one of \"Web Development\"|\"App Development\"|..." },
    { "path": "body.skills.0", "message": "Invalid input: expected string, received number" }
  ]
}
```
- `401` — `"You are not logged in. Please log in first."` (no/invalid cookie).
- `404` — `"User not found"`.

**Note:** although `updateUserSchema` permits `cvFileUrl` and `avatarUrl`, the service whitelist does **not** include them (they are reserved for Phase 2 file uploads), so sending them has no effect.

### Suggested test order
1. `POST /api/auth/register` (creates user + sets cookies in the jar).
2. `GET /api/profile` — returns the fresh profile.
3. `PUT /api/profile` with a full body — returns the updated profile; verify the response body and then `GET /api/profile` again to confirm persistence.
4. `PUT /api/profile` with an invalid track to observe the `400` block above.

## Environment Variables Added
**None added for this step.** This step introduces no new environment variables. The port used in Postman is controlled by the pre-existing `PORT` (backend `.env`, default 5000); `COOKIE_SECURE` and `COOKIE_DOMAIN` remain pre-existing and are untouched by this step.

## Known Gaps / TODOs
- **`COOKIE_SECURE=true` in `.env`:** As flagged in the Step 3 planning review, this is set to `true` while the dev stack runs over HTTP `localhost`. It is unchanged in this step, so the access/refresh cookies may not be stored/sent over plain-HTTP localhost in some setups. No fix was applied here — the `.env` was left as the user had it.
- **Jobs / Resources nav links point to not-yet-built pages:** The `Navbar` links to `/jobs` and `/resources`, but those pages are Step 4 work. Authenticated users clicking them will currently hit a 404 until those routes exist. This resolves a question in `docs/step3_plan.md` — the choice was to include the links now.
- **Dashboard not refactored:** The plan's open question about converting `dashboard/page.tsx` from a client component to a server component was not pursued; the dashboard remains a `"use client"` component (deferred to Step 6).
- **`careerInterests` inline error omitted:** The Profile page shows inline error text for `skills` but not for `careerInterests`; validation is still applied on submit, it just lacks an inline message.
- **Selected value flow on pre-filled Selects:** The Profile page uses Radix `Select` with `defaultValue` derived from the user object, which is fine because the Selects only render after the loading fetch completes. However, if a field's value is `undefined` and the user never interacts with that Select, that field is simply not sent in the PUT (acceptable, since every field is optional).
- **AGENTS.md roadmap status is stale:** It still marks Step 3 as "Not started" even though the work is implemented. Updating it is future work (likely Step 7 polish).
- **No tests:** No automated test framework is installed in the repo. All verification was manual (backend endpoints exercised via HTTP in-session; `lint` and `build` run on both packages).

## Testing
- **Automated tests:** none — the repo has no test framework (per `AGENTS.md`).
- **Static checks run and passing:**
  - Backend `npm run build` (`tsc`) — passes. One fix applied during implementation: `updateProfile` originally cast the Mongoose document to `Record<string, unknown>` (a TypeScript error); this was corrected to use `user.set(field, value)`.
  - Backend `npm run lint` — passes (2 pre-existing `no-explicit-any` warnings in `globalErrorHandler.ts`, unrelated to this step).
  - Frontend `npm run lint` — passes clean.
  - Frontend `npm run build` (`next build`) — passes; all routes compile.
- **Manual API verification (in-session):** register → `GET /api/profile` → `PUT /api/profile` (full update) → re-`GET` confirmed persistence; unauth `GET /api/profile` returned 401; invalid track / non-string skills returned the 400 validation block above.
- **Not covered:** no automated regression tests for the profile endpoints, and no end-to-end browser test of the Profile page form interaction.
