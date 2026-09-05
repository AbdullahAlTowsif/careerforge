# Step 8: Redis + AI Infrastructure — Implementation Plan

> **Date:** 2026-09-05
> **Depends on:** Phase 1, Steps 1–7 (complete)
> **Phase:** 2, Step 8 of 13
> **New npm packages required:** `ioredis`, `@google/genai`, `rate-limiter-flexible`

---

## Step 8 Scope (from `project_plan_v1.md`)

The original spec calls for:

- `src/app/config/redis.ts` — ioredis client with connection error handling
- `src/app/helpers/cache.ts` — get/set/invalidate/delete wrappers
- `modules/aiApi/aiApi.service.ts` — shared Anthropic Claude client wrapper (single instance, reused by all AI modules)
- `modules/aiApi/skillExtraction.service.ts` — Claude-based skill extraction from CV text + keyword-dictionary fallback, cached in Redis
- `modules/aiApi/cvAssist.service.ts` — CV summary/bullet-point generation
- `src/app/middlewares/rateLimiter.middleware.ts` — Redis-backed rate limiter for AI endpoints
- Install: `ioredis`, `@anthropic-ai/sdk`, `rate-limiter-flexible`

**Acceptance Criteria (from spec):**
- [ ] Redis connects successfully
- [ ] AI calls fail gracefully when the API key is missing
- [ ] Cache hit returns cached result without an API call
- [ ] Rate limiter blocks excessive requests

---

## Key Decisions (resolved during planning)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI provider | **Google Gemini API** | User requested a completely free model. `@google/genai` official SDK + free tier (no credit card, ~1,500 Flash req/day). Replaces Anthropic Claude from the original spec. |
| Default model | `gemini-2.5-flash` | Free tier, good structured-JSON extraction, suitable for hackathon scale. |
| Redis criticality | **Optional** (graceful degradation) | Server starts even if Redis is down; caching becomes no-op. Phase 1 features unaffected. Better for demo flexibility. |
| Fallback when no API key | Simple keyword dictionary (~100 common tech skills) | Quick to build, works for demo with zero cost. |
| Rate limiter scope | **Per-IP** | Simpler, works for both authenticated and unauthenticated requests. Standard approach. |

### Documented deviation from the written spec

The written spec (`project_plan_v1.md`) says `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY`. **Step 8 deliberately replaces Anthropic with Google Gemini** because the user wants a completely free option:

- `@anthropic-ai/sdk` → `@google/genai`
- `ANTHROPIC_API_KEY` → `GEMINI_API_KEY`
- Shared AI client wrapper (`aiApi.service.ts`) is Gemini-based
- Everything else (Redis, cache, rate limiter, keyword fallback) is unchanged from the spec

---

## New npm packages (backend only)

```bash
cd careerforge-backend
npm install ioredis rate-limiter-flexible
npm install @google/genai   # official Gemini SDK — verify exact package name at install
```

Note: verify the exact `@google/genai` package name / SDK API at install time, as it may have changed.

## Environment variable changes

### `careerforge-backend/src/app/config/env.ts` — add Gemini key

```typescript
GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
```

- `REDIS_URL` already exists in `env.ts` (defaults to `redis://localhost:6379`) — no change.
- Keep or remove `ANTHROPIC_API_KEY` — document either way.

### `careerforge-backend/.env.example` — add/note

```
# AI (Phase 2)
GEMINI_API_KEY=
```

---

## Files to create

### 1. `src/app/config/redis.ts` — Redis client (optional)

Mirror `db.ts` pattern. Named exports:

- `redisClient` — the ioredis instance
- `isRedisConnected()` — boolean status flag
- `connectRedis()` — try connect, log success; on failure log warning + set `redisAvailable: false` (**do not exit**)
- `disconnectRedis()` — quit client if connected

Listen for the `"error"` event without crashing. **Redis is optional** — if unavailable, the app still runs.

### 2. `src/app/helpers/cache.ts` — Cache wrappers

Exports:

- `getCache<T>(key)` — returns `T | null`
- `setCache(key, value, ttlSeconds)`
- `deleteCache(key)`
- `invalidatePattern(pattern)` — flush keys matching a prefix

All check `isRedisConnected()` first; no-op / cache-miss when Redis unavailable. JSON serialize/deserialize internally. Keys namespaced with `careerforge:` prefix.

### 3. `src/app/middlewares/rateLimiter.middleware.ts` — Per-IP rate limiter

- Use `rate-limiter-flexible`'s `RateLimiterRedis` when Redis is available, else fall back to `RateLimiterMemory`.
- Export `aiRateLimiter` middleware (e.g., 10 req/min per IP).
- Returns 429 with a clear "Too many requests" message.
- Not applied globally — reserved for AI endpoints in later steps (10–12).

### 4. `src/app/modules/aiApi/aiApi.interface.ts` — Shared AI types

```typescript
IExtractedSkills { skills: string[], tools: string[], roles: string[] }
ICvAssistResult { summary?: string, bulletPoints: string[], tips: string[] }
IAiServiceResult<T> { data: T, fromCache: boolean, provider: "gemini" | "dictionary" }
```

### 5. `src/app/modules/aiApi/aiApi.service.ts` — Gemini client wrapper (singleton)

- Lazy singleton `getGeminiClient()` using `@google/genai` (`GoogleGenAI`).
- `callGemini(systemPrompt, userMessage, opts)` wrapper returning `string | null`:
  - Returns `null` if no `GEMINI_API_KEY` (triggers fallback downstream)
  - Returns `null` on API error (logged, never thrown) — graceful degradation
- Export `GEMINI_MODEL = "gemini-2.5-flash"` constant.

### 6. `src/app/modules/aiApi/skillExtraction.service.ts` — Skill extraction

Exports:

- `SkillExtractionService.extractSkillsFromText(text)` — ad-hoc, not tied to a user
- `SkillExtractionService.extractFromUser(userId)` — fetches user + `cvRawText`

Flow (both):

1. Build cache key from hash of text → check Redis (TTL 24h)
2. If Gemini available: prompt for structured JSON `{ skills[], tools[], roles[] }`, parse + validate with Zod
3. If no key or parse fails: **keyword-dictionary matcher** (~100 common tech skills, case-insensitive scan of the text)
4. Cache result (TTL 24h)
5. For user variant: also save `extractedSkills` + `extractedRoles` on the User document
6. Return `IAiServiceResult<IExtractedSkills>`

### 7. `src/app/modules/aiApi/cvAssist.service.ts` — CV assistance

Exports:

- `CvAssistService.generateSummary(userId)`
- `CvAssistService.generateBulletPoints(userId)`
- `CvAssistService.generateTips(userId)`

Each: cache check (TTL 1h) → Gemini prompt filled from user profile → fallback generic templates built from user's skills/experience → cache → return `IAiServiceResult<ICvAssistResult>`.

---

## Files to modify

### 8. `src/app/server.ts` — wire Redis connect/disconnect

- After `await connectDB()`, add `await connectRedis()`
- In `unhandledRejection` handler: add `await disconnectRedis()` before `mongoose.connection.close()`
- In `shutdown` (SIGINT/SIGTERM): add `await disconnectRedis()` before `mongoose.connection.close()`

---

## What this step does NOT do

- No new API routes (skill extraction / CV assist routes come in Steps 10/12)
- No new frontend pages or components
- No changes to existing routes or services
- No MongoDB model changes (User already has `extractedSkills` / `extractedRoles`)
- The `aiApi` controller is NOT created yet — only services
- The `aiRateLimiter` middleware is created but NOT applied to any route yet

---

## Caching keys convention

| Key | TTL |
|-----|-----|
| `careerforge:skill:extract:<hash>` | 24h |
| `careerforge:cv:summary:<userId>` | 1h |
| `careerforge:cv:bullets:<userId>` | 1h |
| `careerforge:cv:tips:<userId>` | 1h |

---

## Execution order

1. Install packages (`ioredis`, `rate-limiter-flexible`, `@google/genai`)
2. `src/app/config/redis.ts`
3. `src/app/helpers/cache.ts`
4. Update `src/server.ts` (connect/disconnect Redis)
5. `src/app/modules/aiApi/aiApi.interface.ts`
6. `src/app/modules/aiApi/aiApi.service.ts` (Gemini wrapper)
7. `src/app/modules/aiApi/skillExtraction.service.ts`
8. `src/app/modules/aiApi/cvAssist.service.ts`
9. `src/app/middlewares/rateLimiter.middleware.ts`
10. Update `src/app/config/env.ts` + `.env.example`
11. `npm run lint` in backend
12. Write `.opencode/implementation-notes/08-redis-ai-infrastructure.md`

---

## Acceptance criteria & verification

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Redis connects | Start Redis → "Redis connected successfully" log |
| 2 | Redis down doesn't crash | Stop Redis → warning logged, Phase 1 routes still work |
| 3 | Cache get/set/invalidate work | Small test via service logs (no dedicated route) |
| 4 | Gemini absent → graceful | No `GEMINI_API_KEY` → `extractSkillsFromText("I know JS + React")` returns dictionary result, `provider: "dictionary"` |
| 5 | Gemini present → real AI | With key → returns Gemini result, `provider: "gemini"` |
| 6 | Cache hit returns cached result | Same input twice → 2nd returns `fromCache: true`, no API call |
| 7 | Rate limiter blocks excess requests | 11 AI requests/min → 11th returns 429 |
| 8 | Lint passes | `npm run lint` clean in backend |

---

## User setup required during implementation

- Obtain a free `GEMINI_API_KEY` at https://aistudio.google.com/apikey (no credit card) and place it in `careerforge-backend/.env`
- Have Redis running locally (`redis-server` or Docker) for full caching + rate-limiting

---

## Notes

- Follow existing MVC conventions: ESM with `.js` import extensions, named exports, `XServices` object-export pattern, `AppError` + `catchAsync` error handling, `.xServices` style matching existing modules.
- `env.ts` already has `REDIS_URL` defined; `ANTHROPIC_API_KEY` may remain for optional future use but is superseded by `GEMINI_API_KEY`.
- All AI calls (Gemini) must have a deterministic non-AI fallback so the app works without any API key.
