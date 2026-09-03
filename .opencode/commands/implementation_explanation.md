---
description: Generate a clear, detailed implementation explanation for a completed roadmap step in the CareerForge monorepo, documenting exactly what was built, how, why (including every third-party package used), and how to test the API in Postman
argument-hint: "Step number and feature name, e.g. 2 registration or 5 job-matching"
allowed-tools: Read, Write, Glob, Bash(git:*)
---

You are a senior full-stack engineer responsible for writing precise, technically accurate implementation documentation for the **CareerForge** platform.

Your job is NOT to plan or build a feature. The feature has already been implemented (in this repository, in the current working tree and/or a related branch). Your job is to **investigate what was actually implemented** and produce a clear, human-readable explanation of it — as if handing off to another engineer or writing a changelog entry a reviewer can trust, and detailed enough that someone can immediately test the resulting API in Postman without guessing.

This command is executed from the **CareerForge** monorepo root, which contains:

- `careerforge-backend/` — the backend service
- `careerforge-frontend/` — the frontend application

Both live in the same repository. Unlike a multi-repo setup, you are expected to inspect **both** folders when relevant, since a single roadmap step often touches both sides.

Do NOT create, switch, or push Git branches. Do NOT commit code. This command only produces a documentation file. It is a read/investigate/document command, not a build command.

Always follow `AGENTS.md` (root-level, and per-package if one exists) as the project's source of truth for conventions and roadmap status.

User input:

$ARGUMENTS

---

# Step 1 — Parse the arguments

From `$ARGUMENTS`, extract:

## 1. step_number

Extract the roadmap step number. Convert to exactly two digits (`1` → `01`, `10` → `10`, etc.).

## 2. feature_title

Convert the feature name into human-readable Title Case, preserving CareerForge domain terminology (e.g. `job matching` → `Job Matching`, `career roadmap` → `Career Roadmap`, `careerbot` → `CareerBot Assistant`).

## 3. feature_slug

Create a lowercase, kebab-case, file-safe slug (max 40 characters, only `a-z`, `0-9`, `-`).

If the step number or feature name cannot be determined confidently, ask the user for clarification and STOP.

---

# Step 2 — Confirm scope with the user (only if ambiguous)

Determine which commits/diff represent this implementation. In order of preference:

1. If a branch named `feature/<feature_slug>` exists (or the user names a branch), use `git log` / `git diff` against the base branch (e.g. `main`/`develop`) to see everything introduced by that branch.
2. If the user references specific commits, use those.
3. If work is uncommitted, use `git status` and `git diff` against the last commit.
4. If none of the above resolves cleanly, ask the user once: "Which branch or commit range should I document?" Then proceed.

Do not guess silently if the scope is genuinely unclear — a wrong scope produces a wrong document.

---

# Step 3 — Read project rules

Read the root `AGENTS.md`, and `careerforge-backend/AGENTS.md` / `careerforge-frontend/AGENTS.md` if they exist separately.

Extract and respect:

- roadmap and current step status
- architecture and folder conventions for each package
- naming conventions
- API conventions
- database conventions
- completed roadmap steps (to confirm this step is genuinely marked in-progress/complete, not still pending)

If `AGENTS.md` shows this step as not yet started, warn the user:

"This roadmap step doesn't appear to be implemented yet according to AGENTS.md. Do you still want me to document the current (possibly partial) state?"

Wait for confirmation before proceeding if this happens.

---

# Step 4 — Investigate what was actually built

Inspect the real diff/files for the resolved scope (Step 2). Do not describe intentions — describe what the code actually does.

## Backend (`careerforge-backend/`), if touched

- New/changed routes, controllers, services, middleware, validators, repositories/data-access
- New/changed Prisma (or other ORM) models, enums, relations, migrations
- Auth/authorization changes
- New environment variables and what they configure
- Error-handling additions

## Frontend (`careerforge-frontend/`), if touched

- New/changed pages, routes, components
- State management additions (context, stores, hooks)
- API integration — which backend endpoints are called, with what payloads/responses
- Forms, validation, UI states (loading/error/empty)
- New environment variables

## Cross-cutting

- Any shared types/contracts kept in sync between backend and frontend
- Any new scripts (seed scripts, build scripts, dev tooling)

Use only paths and code that actually exist. Do not invent files, functions, or behavior that isn't in the diff.

---

# Step 5 — Identify every third-party package used

This is a required, non-optional section.

1. Diff `careerforge-backend/package.json` and `careerforge-frontend/package.json` (dependencies + devDependencies) against the base to find every newly added package for this step.
2. For each new package, determine from actual usage in the code (not assumption) where and how it's used.
3. For each, document:
   - **Package name & version**
   - **Where it's used** (exact file(s))
   - **Why it was chosen** (its specific purpose in this feature — e.g. "input validation for the registration DTO", "password hashing for stored credentials", "date handling for roadmap phase calculations")
   - **What it replaces or avoids**, if relevant (e.g. "avoids hand-rolled JWT parsing")

If a package already existed in the project and was simply used in a new way for this step, note that too, but separate it clearly from newly introduced packages.

If no new packages were added for this step, state that explicitly rather than omitting the section.

---

# Step 6 — Document the data/request flow

For the implemented feature, describe the end-to-end flow in plain language, e.g.:

```text
User submits CV text on the frontend Profile page
    → POST /api/profile/cv (careerforge-backend)
    → cvController validates payload (zod/joi schema)
    → cvService stores raw text on the Profile model
    → response returns updated profile
    → frontend updates local profile state and shows confirmation
```

Include:
- HTTP method + route
- Request/response shape (only what's real, from the code)
- Any state transitions (for stateful entities, mirror the roadmap's state-machine style if applicable)
- Auth/authorization checks enforced along the way

---

# Step 7 — Document how to test the API in Postman

This is a required, non-optional section for any step that touches the backend. If the step is frontend-only (no new/changed endpoints), state that explicitly and skip to Step 8.

For every backend endpoint that is new or changed in this step, work out — from the actual route/controller/validator code, not assumption — everything someone needs to hit it successfully in Postman on the first try:

1. **Base URL** — read it from the backend's actual config/env (e.g. `http://localhost:<PORT>`), not a guess. State which env var controls the port.
2. **Method + full path** — exactly as registered (e.g. `POST /api/auth/register`), including any API prefix/version actually used in the router setup.
3. **Auth requirement** — is it public or protected? If protected, exactly how the token must be sent (e.g. `Authorization: Bearer <token>` header, or an httpOnly cookie — check the actual auth middleware to be sure which one), and where to obtain that token first (i.e. which endpoint to call before this one).
4. **Headers required** — e.g. `Content-Type: application/json`.
5. **Request body** — a realistic, complete example JSON payload matching the actual validation schema (every required field, correct types/formats). Pull field names directly from the validator/DTO, don't approximate.
6. **Successful response** — actual status code and an example response body shape as returned by the controller.
7. **Known error responses** — the realistic validation/auth error cases the code actually handles (e.g. 400 on missing field, 401 on missing/invalid token, 409 on duplicate email), with status code and example error body for each.
8. **Suggested test order** — if this endpoint depends on calling another one first (e.g. register → login → use token), spell out that exact call sequence.

Present this as one clearly separated block per endpoint so it can be copy-pasted straight into Postman requests. Prefer a format like:

```text
### POST /api/auth/register
Auth: none

Headers:
  Content-Type: application/json

Body:
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "educationLevel": "Bachelor's",
  "experienceLevel": "Fresher",
  "preferredTrack": "Web Development"
}

Success response (201):
{
  "id": "...",
  "email": "jane@example.com",
  ...
}

Error responses:
  400 - missing/invalid field (e.g. invalid email format)
  409 - email already registered
```

If a Postman collection (`.postman_collection.json`) or an existing Postman/Insomnia export already exists in the repo, mention its path and note whether it's up to date with what you found — do not silently duplicate it, and offer to update it only if the user asks.

---

# Step 8 — Note deviations, shortcuts, and known gaps

Be honest and specific:

- Anything implemented differently from how it may have been originally planned/specced, and why
- Any TODOs, temporary workarounds, or hardcoded values left in the code
- Any validation, error handling, or edge cases that are NOT yet covered
- Any tests written (and what they cover) or the absence of tests

Do not soften or omit real gaps — this section is meant to be useful to a reviewer or teammate picking up the work later.

---

# Step 9 — Write the documentation file

Create the file at:

`.opencode/implementation-notes/<step_number>-<feature_slug>.md`

(Create the `implementation-notes` directory if it doesn't exist.)

Use this structure:

```markdown
# Step <step_number> — <feature_title>

## Summary
2-4 sentences: what this step delivers, in plain language.

## Scope Documented
Branch / commit range this document covers, and how it was determined.

## Backend Changes
Files touched, and what each does now.

## Frontend Changes
Files touched, and what each does now.

## Third-Party Packages Used
One entry per package, following the Step 5 format.

## Request/Data Flow
The Step 6 walkthrough(s).

## API Testing (Postman)
The Step 7 per-endpoint blocks — base URL, auth, headers, body, success/error responses, and call order.

## Environment Variables Added
Name, purpose, required/optional.

## Known Gaps / TODOs
The Step 8 findings.

## Testing
What automated tests exist, what doesn't.
```

Do not overwrite an existing file for the same step without asking the user to confirm.

---

# Step 10 — Report back

After writing the file, give the user a short summary in chat:

- Confirm the file path written
- List the packages found (name only, one line each)
- List the endpoints documented for Postman testing (method + path only, one line each)
- Flag the single most important known gap, if any

Do not create a branch, do not commit, do not push. This command only documents.
