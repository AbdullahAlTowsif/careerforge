# Step 08 — Redis + AI Infrastructure

## Summary

Adds the Phase 2 foundation: an optional Redis layer (caching + distributed rate limiting) and a Google Gemini AI client with keyword-dictionary / template fallbacks so all AI features work even without Redis or an API key. Services are built for the upcoming Step 9–13 features: skill extraction can already run, CV assistant summary/bullet-points/tips are wired, and an `aiRateLimiter` middleware is ready to attach to AI routes (Steps 10–12).

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| AI provider | **Google Gemini** (`@google/genai`, model `gemini-2.5-flash`) | User wanted a completely free option — no credit card. Anthropic was dropped. |
| Redis required? | **Optional — graceful degradation** | App works with zero Redis; cache/rate-limit silently disable when down. |
| Fallback when no Gemini key or API error | Keyword dictionary (`extract`) / template (CV assist) | Features stay usable offline / keyless. |
| Rate limiting | Per-IP, `10 req/min` on the AI middleware | Simple, prevents abuse of the free AI quota. |

## Setup (one-time, done)

1. Created a free Redis Cloud database (user did this in the Redis Cloud console).
2. `REDIS_URL` set to the **redis-cli** connection string from Redis Cloud (plain `redis://`, NO TLS), e.g.
   `redis://default:<password>@<host>:<port>`.
   - Verified: plain `redis://` works; `rediss://` (TLS) fails on this instance (`packet length too long`).
   - The `.env` value points at database `redis-19329` (user confirmed this is the one to use).
3. `@google/genai@2.21.0`, `ioredis@6.0.0`, `rate-limiter-flexible@11.2.0` installed in `careerforge-backend`.
4. `GEMINI_API_KEY` is **empty** in `.env` — user must paste a free key from https://aistudio.google.com/apikey to enable real Gemini calls. Everything else works without it.

## New Files

### `careerforge-backend/src/app/config/redis.ts`
ioredis v6 client with graceful degradation.
- `connectRedis()`: creates client with `maxRetriesPerRequest: 1` and bounded retry (15 retries, `min(times*200, 2000)` backoff). Attaches `ready`/`error`/`close`/`end` handlers, then **awaits the first settle** so startup only proceeds after Redis either connects or gives up. `error` logs once (throttled via `connectionErrorLogged`), sets availability flags, but never throws — server startup never fails because of Redis.
- `disconnectRedis()`: `quit()` with error tolerance.
- `getRedisClient()` / `isRedisConnected()`: accessors used by cache + rate limiter.
- Note: ioredis v6 requires the named import `import { Redis } from "ioredis"` and the type `InstanceType<typeof Redis>` (default import breaks typecheck under nodenext).

### `careerforge-backend/src/app/helpers/cache.ts`
Redis cache helper, prefix `careerforge:`, all functions no-op when Redis is down:
- `getCache<T>(key)` / `setCache(key, value, ttlSeconds)` / `deleteCache(key)` / `invalidatePattern(pattern)` (bulk `DEL` by `KEYS`).

### `careerforge-backend/src/app/middlewares/rateLimiter.middleware.ts`
`createRateLimiter(options)` factory producing an Express middleware.
- Uses `RateLimiterRedis` when Redis is connected (lazy-created once; `insuranceLimiter: memoryLimiter` falls back within `rate-limiter-flexible` itself), else plain `RateLimiterMemory`.
- On `RateLimiterRes` rejection → `429` JSON in the standard error shape; other errors → fail-open (`next()`).
- Exports `aiRateLimiter` = 10 points / 60 s, `keyPrefix: "rl:ai"`. **Not yet mounted on any route** — it will be applied to the AI endpoints in Steps 10–12.

### `careerforge-backend/src/app/modules/aiApi/`
- **`aiApi.interface.ts`** — types: `IExtractedSkills` (`skills: string[]`, `tools: string[]`, `roles: string[]`), `ICvAssistResult`, `IAiServiceResult<T>` (`provider: AiProvider`, `data`, `fromCache`), `AiProvider = "gemini" | "dictionary" | "template"`.
- **`aiApi.service.ts`** — `getGeminiClient()` (singleton `GoogleGenAI`), `callGemini({ promptText, systemInstruction?, jsonMode? })` using `ai.models.generateContent({ model: GEMINI_MODEL, contents, config })`. Returns `null` when no `GEMINI_API_KEY` or on any error (never throws). `GEMINI_MODEL = "gemini-2.5-flash"`.
- **`aiApi.constant.ts`** — keyword dictionaries: ~140 skill entries (with aliases/word-boundary matching to avoid partial matches like *Java* inside *JavaScript*) and ~30 role entries mapped to the user's career tracks.
- **`skillExtraction.service.ts`** — `extractSkillsFromText(text)` (public use; also exported for test) and `extractFromUser(userId)` (reads `cvRawText`, falls back to all user skills):
  1. Cache key `skill:extract:<sha256(hashInput)>`, TTL 24 h. Cache hit → return `fromCache: true`.
  2. If `GEMINI_API_KEY` → `callGemini` with a JSON-mode prompt; parse into `IExtractedSkills`.
  3. Else dictionary matcher → `provider: "dictionary"`.
  4. `extractFromUser` additionally persists `extractedSkills`/`extractedRoles` on the User doc.
- **`cvAssist.service.ts`** — `generateSummary(user)`, `generateBulletPoints(user, text?)`, `generateTips(user)`:
  - Cache keys `cv:summary:`, `cv:bulletPoints:`, `cv:tips:` + user id, TTL 1 h.
  - Gemini when key present, else **template** provider (fills in name/track/skills inserts). Slow/err → `null` handled by callers.

## Modified Files

| File | Change |
|------|--------|
| `careerforge-backend/src/app/config/env.ts` | Added `REDIS_URL` (default `redis://localhost:6379`) and `GEMINI_API_KEY`. |
| `careerforge-backend/src/server.ts` | `await connectRedis()` after `connectDB()`; `disconnectRedis()` in `unhandledRejection` handler and SIGINT/SIGTERM shutdown. |
| `careerforge-backend/.env.example` | Documents local vs Redis Cloud `REDIS_URL` formats and the Gemini key source/link. |
| `careerforge-backend/.env` | `REDIS_URL` = cloud `redis-19329`; `GEMINI_API_KEY=` (empty). |
| `careerforge-backend/package.json` | Added the three Phase 2 deps (all runtime deps). |
| `docs/step8_plan.md` | The implementation plan for this step (created first). |

## Bugs Found & Fixed During Implementation

1. **ioredis v6 import** — default import fails typecheck under nodenext; must use named `{ Redis }` import + `InstanceType<typeof Redis>`.
2. **Keyword false positives** — `Java` matched inside `JavaScript`. Fixed with word-boundary regexes for word-like keywords.
3. **Rate limiter recreated per request** — `getLimiter()` now memoizes the `RateLimiterRedis` instance (was a fresh `RateLimiterMemory` per call, which never actually limited).
4. **Redis unhandled `error` event** — handler must be attached before `connect()`; now attached before, and `connectRedis()` awaits the first `ready`/`error` settle so startup isn't racy.
5. **`exactOptionalPropertyTypes`** — optional interface members must literally not be set (vs `undefined`) when building result objects; fixed by conditional object spread.

## Verification

- `npm run lint` → passes (only 2 pre-existing `no-explicit-any` warnings in `src/app/errorHelpers/globalErrorHandler.ts`, unrelated).
- `npm run build` → `tsc` passes.
- `scripts/smokeTest.ts` (dev utility) against live cloud Redis + Mongo:
  - Redis connects; cache set/get/delete works.
  - Skill extraction twice → 2nd call `fromCache: true` (24 h TTL) — Redis key ✓.
  - `extractFromUser` persists to Mongo → `[JavaScript, TypeScript, Python]`, roles persisted.
  - CV assist uses template provider (no key yet) — cache keys visible, TTL ~1 h.
  - Rate limiter: 12 rapid requests → 11th & 12th `429` (10 allowed) with Redis-backed `rl:ai:*` keys ✓.
- Full server boot (`npx tsx src/server.ts`): `MongoDB connected successfully`, `Redis connected successfully`, GET `/` → `200` `CareerForge API is running`.

## Status

Ready for Steps 9–13 to consume. Real Gemini path is code-complete but untested until a `GEMINI_API_KEY` is added to `.env`. Everything else is verified end-to-end against the live Redis Cloud database.