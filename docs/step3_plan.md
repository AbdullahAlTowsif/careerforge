# Phase 1 Step 3 — Profile & Skills Implementation Plan

> **Date:** 2026-09-03
> **Status:** Planned (not started)
> **Depends on:** Step 2 (Auth & User Management) ✅

---

## 1. Comprehensive Code Review (Pre-Step 3)

### 1.1 Backend Issues Found

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | **CRITICAL** | `.env` | Real MongoDB Atlas credentials committed (`mongodb+srv://careerforge:u7QPsw4GljpWtQuV@...`). If pushed to a public repo, credentials are leaked. |
| 2 | **HIGH** | `.env` | `COOKIE_SECURE=true` will break local development — cookies won't be set/sent over HTTP `localhost`. Should be `false` for dev. |
| 3 | **MEDIUM** | `cookie.ts` | `COOKIE_DOMAIN` is loaded in `env.ts` but **never used** in cookie options. Misleading env variable. |
| 4 | **MEDIUM** | `auth.service.ts` | `publicUser()` returns `_id` (ObjectId), not `id` (string). Frontend must handle `user._id` instead of `user.id`. |
| 5 | **MEDIUM** | `auth.service.ts` | JWT `verify()` throws on invalid tokens — the `if (!payload)` checks in the service are dead code. Error messages like "jwt malformed" leak through the global handler's fallback path instead of friendly 401s. |
| 6 | **LOW** | `auth.service.ts` | Refresh tokens don't rotate — the same token stays valid for 7 days regardless of usage count. |
| 7 | **LOW** | `package.json` | `express-session` is a dead dependency (never imported). |
| 8 | **LOW** | `package.json` | `@types/bcrypt`, `@types/morgan`, `@types/node` are in `dependencies` instead of `devDependencies`. |
| 9 | **LOW** | `tsconfig.json` | `"jsx": "react-jsx"` is unnecessary for a backend-only project. |
| 10 | **LOW** | Global | No rate limiting on auth endpoints (login, register). |

### 1.2 Frontend Issues Found

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | **HIGH** | `serverFetch.ts` | `redirectToLogin()` uses `redirect()` from `next/navigation` — only works in client components. If ever called from a Server Component it will silently skip the redirect or crash. |
| 2 | **HIGH** | `layout.tsx` | No `<ThemeProvider>` from `next-themes` despite `sonner.tsx` calling `useTheme()`. Dark mode support is broken. |
| 3 | **MEDIUM** | `layout.tsx` | Geist fonts loaded via `next/font` but never applied via `font-family` CSS rule. Fonts are downloaded but wasted. |
| 4 | **MEDIUM** | `dashboard/page.tsx` | Dashboard is `"use client"` with `useEffect` data fetching — should be a Server Component per project conventions (AGENTS.md says server components by default). |
| 5 | **MEDIUM** | `form.tsx` | shadcn/ui Form components installed but unused — login/register use manual form patterns instead, missing proper `htmlFor`/`id` and `aria-describedby` accessibility. |
| 6 | **LOW** | Global | Many unused shadcn/ui components: Avatar, Badge, Dialog, Select, Separator, Tabs, Textarea. Adds bundle weight. (Some needed for Step 3.) |
| 7 | **LOW** | Global | No `error.tsx` or `loading.tsx` files for any route segment. |
| 8 | **LOW** | `serverFetch.ts` | Module-level `redirectingToLogin` flag never resets — prevents future redirects after first trigger. |
| 9 | **LOW** | `.env` | Empty `.env` file tracked in git (committed before `.gitignore` rule). |

### 1.3 Key Codebase Patterns to Follow

- **sendResponse** — All controllers call `sendResponse(res, { statusCode, success, message, data })` producing `{ success, message, data }` envelope.
- **catchAsync** — Every async handler wrapped in `catchAsync()` to forward rejected promises to error handler.
- **Controller-Service separation** — Controllers handle HTTP, services handle business logic. Controllers never touch DB.
- **Module pattern** — Each feature: `*.controller.ts`, `*.service.ts`, `*.routes.ts`, `*.model.ts`, `*.interface.ts`, `*.validation.ts`, `*.constant.ts`.
- **Routes aggregation** — Module routers imported and mounted in `src/routes/index.ts`.
- **serverFetch** — Single API call point. Returns `body.data` (unwraps envelope).
- **No client-side auth store** — Session is the httpOnly cookie. Pages call `/auth/me` on mount.
- **shadcn/ui "new-york" style** — All UI components follow this convention.
- **Colors via CSS variables only** — Never raw hex in components.
- **Zod frontend = v3, Zod backend = v4** — Schemas are not shareable between packages.

---

## 2. Implementation Plan

### 2.1 Backend Changes

#### 2.1.1 Create `careerforge-backend/src/app/modules/user/user.service.ts`

Two functions:

```typescript
getProfile(userId: string) → IUser
```
- Find user by `userId` via `User.findById(userId)`
- Throw 404 via `AppError(404, "User not found")` if not found
- Return user object (passwordHash excluded by default via `select: false`)

```typescript
updateProfile(userId: string, updateData: Partial<...>) → IUser
- Find user by `userId`
- Throw 404 if not found
- Apply allowed fields from `updateData` (only the fields defined in `updateUserSchema`)
- Save and return updated user
```

**Allowed editable fields:** `fullName`, `educationLevel`, `experienceLevel`, `preferredTrack`, `skills`, `experienceNotes`, `careerInterests`, `cvRawText`

**Excluded fields (Phase 2):** `cvFileUrl`, `avatarUrl`, `extractedSkills`, `extractedRoles`

#### 2.1.2 Create `careerforge-backend/src/app/modules/user/user.controller.ts`

Two handler functions, both wrapped in `catchAsync`:

```typescript
getProfile(req: AuthenticatedRequest, res: Response)
- Extract userId from req.user
- Call UserService.getProfile(userId)
- Call sendResponse(res, { statusCode: 200, success: true, message: "Profile retrieved", data: profile })

updateProfile(req: AuthenticatedRequest, res: Response)
- Extract userId from req.user
- Extract req.body (already validated by middleware)
- Call UserService.updateProfile(userId, req.body)
- Call sendResponse(res, { statusCode: 200, success: true, message: "Profile updated", data: profile })
```

#### 2.1.3 Create `careerforge-backend/src/app/modules/user/user.routes.ts`

```typescript
router.get("/", authMiddleware, UserController.getProfile);
router.put("/", authMiddleware, validateRequest(updateUserSchema), UserController.updateProfile);
```

#### 2.1.4 Modify `careerforge-backend/src/routes/index.ts`

```typescript
// Add import
import UserRoutes from "../app/modules/user/user.routes.js";

// Add mount (after auth routes)
router.use("/profile", UserRoutes);
```

**Resulting endpoints:**
| Method | Route | Middleware | Purpose |
|--------|-------|-----------|---------|
| `GET` | `/api/profile` | `authMiddleware` | Get authenticated user's profile |
| `PUT` | `/api/profile` | `authMiddleware` + `validateRequest(updateUserSchema)` | Update profile fields |

#### 2.1.5 Modify `careerforge-backend/src/app/modules/user/user.validation.ts`

Ensure `updateUserSchema` covers all profile-editable fields:

```typescript
export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    educationLevel: z.enum(EDUCATION_LEVELS).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    preferredTrack: z.enum(PREFERRED_TRACKS).optional(),
    skills: z.array(z.string().min(1).max(50)).optional(),
    experienceNotes: z.string().max(5000).optional(),
    careerInterests: z.array(z.string().min(1).max(100)).optional(),
    cvRawText: z.string().max(50000).optional(),
  }),
});
```

**Note:** The schema already exists and is exported — verify it matches the above and add `careerInterests` if missing.

#### 2.1.6 Create `careerforge-backend/src/app/config/cookie.ts` (FIX)

Apply the `COOKIE_DOMAIN` from env to cookie options so it's actually used:

```typescript
import { env } from "./env.js";

export const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  maxAge,
  path: "/",
  domain: env.COOKIE_DOMAIN || undefined,
});
```

---

### 2.2 Frontend Changes

#### 2.2.1 Create `careerforge-frontend/src/components/Navbar.tsx`

**Client component** (`"use client"`).

Structure:
```
┌─────────────────────────────────────────────────┐
│ CareerForge    Dashboard  Jobs  Resources  Profile  [Logout] │
└─────────────────────────────────────────────────┘
```

- Use `usePathname()` to highlight active link
- Links: Dashboard (`/dashboard`), Jobs (`/jobs`), Resources (`/resources`), Profile (`/profile`)
- Jobs and Resources links point to their future URLs (Step 4 will add the pages)
- Logout button on the right
- Responsive: on mobile, collapse links into a hamburger menu or scrollable nav
- Use shadcn/ui `Button` with `variant="ghost"` for nav links
- Active link: `text-primary font-medium` with a bottom border indicator
- Inactive link: `text-muted-foreground hover:text-foreground`

#### 2.2.2 Modify `careerforge-frontend/src/app/(protected)/layout.tsx`

Import and render `Navbar` above the main content:

```tsx
import Navbar from "@/components/Navbar";

export default function ProtectedLayout({ children }) {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

#### 2.2.3 Create `careerforge-frontend/src/lib/validations/profile.ts`

Zod schema (v3) for frontend validation of profile updates:

```typescript
import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  educationLevel: z.enum(["SSC", "HSC", "Diploma", "Bachelor", "Master", "Other"]).optional(),
  experienceLevel: z.enum(["Fresher", "Junior", "Mid"]).optional(),
  preferredTrack: z.enum([...PREFERRED_TRACKS]).optional(),
  skills: z.array(z.string().min(1).max(50)).optional(),
  experienceNotes: z.string().max(5000).optional(),
  careerInterests: z.array(z.string().min(1).max(100)).optional(),
  cvRawText: z.string().max(50000).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
```

#### 2.2.4 Create `careerforge-frontend/src/app/(protected)/profile/page.tsx`

**Client component** (`"use client"`).

**On mount:**
1. Fetch current user via `serverFetch("/auth/me")`
2. Populate form with user data

**Form fields:**
| Field | Component | Notes |
|-------|-----------|-------|
| Full name | `<Input>` | Required, 2-100 chars |
| Education level | `<Select>` | From EDUCATION_LEVELS enum |
| Experience level | `<Select>` | From EXPERIENCE_LEVELS enum |
| Preferred track | `<Select>` | From PREFERRED_TRACKS enum |
| Skills | Tag input (custom) | Add/remove skill chips |
| Career interests | Tag input (custom) | Add/remove interest chips |
| Experience notes | `<Textarea>` | Free text, max 5000 chars |
| CV raw text | `<Textarea>` | Large textarea, max 50000 chars |

**Submit:**
- Validate with `profileUpdateSchema` via `zodResolver`
- `PUT /api/profile` via `serverFetch`
- Show success toast via `toast.success("Profile updated")`
- Show error toast via `toast.error(message)` on failure
- Disable form during submission

**Loading state:** Show skeleton/spinner while fetching initial profile data.

#### 2.2.5 Create `careerforge-frontend/src/components/TagInput.tsx`

Reusable tag input component for skills and career interests:

**Props:**
```typescript
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}
```

**Behavior:**
- Display current tags as chips/badges with an "x" remove button
- Text input field for adding new tags
- Press Enter or comma to add a tag
- Prevent duplicates
- Max tags limit (configurable)
- Use shadcn/ui `Badge` for tag chips

#### 2.2.6 Modify `careerforge-frontend/src/types/user.ts`

Ensure the `User` type matches the backend model:

```typescript
export interface User {
  _id: string;
  fullName: string;
  email: string;
  educationLevel?: EducationLevel;
  experienceLevel?: ExperienceLevel;
  preferredTrack?: PreferredTrack;
  skills: string[];
  experienceNotes?: string;
  careerInterests: string[];
  cvRawText?: string;
  cvFileUrl?: string;
  avatarUrl?: string;
  extractedSkills: string[];   // Phase 2
  extractedRoles: string[];   // Phase 2
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. File Summary

| Action | File Path | Purpose |
|--------|-----------|---------|
| CREATE | `careerforge-backend/src/app/modules/user/user.service.ts` | Profile get/update logic |
| CREATE | `careerforge-backend/src/app/modules/user/user.controller.ts` | HTTP handlers for profile |
| CREATE | `careerforge-backend/src/app/modules/user/user.routes.ts` | GET/PUT `/api/profile` routes |
| MODIFY | `careerforge-backend/src/routes/index.ts` | Mount user routes |
| VERIFY | `careerforge-backend/src/app/modules/user/user.validation.ts` | Ensure `updateUserSchema` is complete |
| CREATE | `careerforge-frontend/src/components/Navbar.tsx` | Navigation bar with active links |
| CREATE | `careerforge-frontend/src/app/(protected)/profile/page.tsx` | Editable profile form page |
| CREATE | `careerforge-frontend/src/components/TagInput.tsx` | Reusable tag/chip input |
| CREATE | `careerforge-frontend/src/lib/validations/profile.ts` | Frontend Zod schema for profile |
| MODIFY | `careerforge-frontend/src/app/(protected)/layout.tsx` | Add Navbar |
| MODIFY | `careerforge-frontend/src/types/user.ts` | Ensure type matches backend model |

---

## 4. Acceptance Criteria

- [ ] `GET /api/profile` returns the authenticated user's profile (200)
- [ ] `PUT /api/profile` updates profile fields and persists to MongoDB (200)
- [ ] Invalid input rejected with clear error messages via Zod validation (400)
- [ ] Unauthenticated requests to `/api/profile` rejected with 401
- [ ] Profile page loads with current user data pre-filled in all fields
- [ ] Can edit and save skills (add/remove tags), career interests, experience notes, CV text
- [ ] Can change education level, experience level, preferred track via dropdowns
- [ ] Changes persist and reload correctly on page refresh
- [ ] Navbar appears on all protected pages with correct active route highlighting
- [ ] Success/error toasts display correctly via Sonner
- [ ] Form disables during submission to prevent double-submit

---

## 5. Open Questions

1. **Jobs/Resources links in Navbar** — Should placeholder links be added now (pointing to future Step 4 URLs), or skip them until those pages exist?

2. **Select components** — Use the already-installed shadcn/ui `<Select>` component, or simple native `<select>` elements?

3. **Tag input approach** — Build a custom `TagInput` component with shadcn/ui `<Badge>` chips, or use a simpler comma-separated text input?

4. **COOKIE_SECURE fix** — Should we fix `COOKIE_SECURE=true` → `false` in `.env` as part of this step? It could cause auth to break in local dev.

5. **Dashboard refactor** — Should the dashboard page be converted from `"use client"` to a Server Component as part of this step, or defer to Step 6?

---

## 6. Implementation Order

1. Backend: `user.service.ts`
2. Backend: `user.controller.ts`
3. Backend: `user.routes.ts`
4. Backend: Wire routes in `routes/index.ts`
5. Backend: Verify `updateUserSchema`
6. Frontend: `types/user.ts` (update)
7. Frontend: `lib/validations/profile.ts`
8. Frontend: `components/TagInput.tsx`
9. Frontend: `components/Navbar.tsx`
10. Frontend: `(protected)/layout.tsx` (add Navbar)
11. Frontend: `(protected)/profile/page.tsx`
12. Test: Verify backend endpoints with curl/Postman
13. Test: Verify frontend flow end-to-end
