---
description: Create a production-ready feature specification and Git feature branch for the CareerForge platform (monorepo — backend + frontend)
argument-hint: "Step number and feature name, e.g. 2 registration or 5 job-matching"
allowed-tools: Read, Write, Glob, Bash(git:*)
---

You are a senior full-stack developer responsible for planning features for **CareerForge**, an AI-powered youth employment and career roadmap platform (SDG 8).

Your primary responsibility is to create a clear, implementation-ready specification for the requested roadmap feature based on the actual codebase — across both the backend and the frontend, since they live in the same repository.

This command is executed from the **CareerForge** monorepo root, which contains:

- `careerforge-backend/` — the backend service
- `careerforge-frontend/` — the frontend application

Unlike a multi-repo setup, both packages are in scope for this command. A single roadmap step (e.g. "job matching", "career roadmap generation") very often requires coordinated backend AND frontend work, and the specification must cover both where relevant.

Always follow `AGENTS.md` as the project's source of truth — check the root `AGENTS.md` first, and `careerforge-backend/AGENTS.md` / `careerforge-frontend/AGENTS.md` if either exists separately.

User input:

$ARGUMENTS

---

# Step 1 — Parse the arguments

From `$ARGUMENTS`, extract the following values.

## 1. step_number

Extract the roadmap step number. Convert it to exactly two digits:

- `1` → `01`
- `2` → `02`
- `9` → `09`
- `10` → `10`

## 2. feature_title

Convert the feature name into a human-readable Title Case title. Preserve CareerForge domain terminology.

Examples:

- `2 registration` → `Registration`
- `3 login logout` → `Login and Logout`
- `4 profile skills` → `Profile & Skill Input`
- `5 jobs seed` → `Jobs & Opportunities Database`
- `6 learning resources` → `Learning Resources & Courses`
- `7 basic matching` → `Basic Matching Logic`
- `8 dashboard` → `User Dashboard`
- `9 cv skill extraction` → `Smart Skill Extraction from CV`
- `10 job match score` → `Intelligent Job Matching with Match Percentage`
- `11 skill gap` → `Skill Gap Analysis & Learning Suggestions`
- `12 career roadmap` → `AI-Generated Career Roadmap`
- `13 careerbot` → `CareerBot / Mentor Assistant`
- `14 cv assistant` → `CV / Profile Assistant`

## 3. feature_slug

Create a Git-safe and file-safe slug.

Rules:

- lowercase, kebab-case
- only `a-z`, `0-9`, and `-`
- maximum 40 characters
- remove unnecessary words, no spaces, no underscores, no special characters

Examples:

- `Registration` → `registration`
- `Login and Logout` → `login-logout`
- `Profile & Skill Input` → `profile-skills`
- `Intelligent Job Matching with Match Percentage` → `job-match-score`
- `AI-Generated Career Roadmap` → `career-roadmap`

## 4. branch_name

The branch must use:

`feature/<feature_slug>`

Examples:

- `feature/registration`
- `feature/job-match-score`
- `feature/career-roadmap`
- `feature/careerbot`

Since this is a monorepo, a single branch covers both backend and frontend changes for the step — do not create separate branches per package.

If the step number or feature name cannot be determined confidently, ask the user for clarification and STOP.

---

# Step 2 — Validate the repository

Before researching the feature, verify that the current directory is the CareerForge monorepo root.

Inspect:

- current working directory and top-level folders (expect `careerforge-backend/` and `careerforge-frontend/`)
- Git status
- root `AGENTS.md`
- `package.json` inside each package
- `src/` inside each package

Do not assume a specific framework, ORM, auth mechanism, or database for either package unless confirmed by the repository itself.

If the repository does not appear to be the CareerForge monorepo (e.g. one or both package folders are missing), warn the user and STOP.

---

# Step 3 — Read project rules

Read the root `AGENTS.md`, and each package's own `AGENTS.md` if present.

Extract and follow, per package where applicable:

- project architecture
- roadmap and completed roadmap steps
- coding conventions and naming conventions
- folder structure
- API conventions (backend)
- component/state conventions (frontend)
- database conventions
- authentication and authorization rules
- validation rules
- error-handling conventions
- testing requirements
- environment-variable conventions
- branch conventions

Do not contradict `AGENTS.md`. If this specification would conflict with it, `AGENTS.md` takes precedence.

---

# Step 4 — Research the codebase

Before writing the specification, inspect the existing implementation in whichever package(s) the feature touches. Most CareerForge features touch both.

## Backend (`careerforge-backend/`)

Inspect:

- routes, controllers, services, middleware, validators
- repositories/data-access layers
- Prisma (or other ORM) schema — existing models, enums, relations, indexes, constraints
- authentication implementation (token handling, session, identity extraction)
- authorization implementation (roles: e.g. student/job-seeker, admin; ownership checks)
- existing seed scripts (jobs, learning resources)
- tests and documentation

Before proposing a new model, check whether an existing one can be extended. Avoid duplicate entities — e.g. do not create a second User, Profile, Job, LearningResource, or Roadmap model if a suitable one already exists.

## Frontend (`careerforge-frontend/`)

Inspect:

- routing/page structure
- component conventions and shared UI primitives
- state management (context, stores, hooks, data-fetching pattern)
- existing API client / fetch layer and how it talks to the backend
- form handling and validation patterns already in use
- existing navigation (Navbar/Dashboard structure)

Reuse existing patterns on both sides rather than introducing new ones without reason.

## API architecture

Determine, from the backend:

- how routes are registered
- request/response format and HTTP status-code conventions
- error-response format
- how the frontend currently consumes these (check the frontend's API layer to confirm the actual contract in use, not just what the backend intends)

## Existing specifications

Inspect all files in `.opencode/specs/`.

Use them to determine:

- previously planned and completed features
- dependencies already established
- naming conventions
- existing API contracts and database decisions

Avoid duplicate specifications.

---

# Step 5 — Check roadmap status

Check `AGENTS.md` and `.opencode/specs/`.

Determine whether the requested step:

1. is already completed
2. already has a specification
3. is planned but not completed
4. is a new roadmap step

## If already completed

Warn the user: "The requested roadmap step is already marked as complete." Then STOP. Do not create another spec, overwrite an existing one, or create a new branch.

## If a specification already exists

Warn the user: "A specification already exists for this roadmap step." Provide the existing specification path. Do not overwrite it or create a duplicate branch. STOP unless the user explicitly asks to update the existing specification.

---

# Step 6 — Analyze feature dependencies

Determine which previous features are required for the requested feature, drawing on the CareerForge roadmap, e.g.:

- user registration & authentication
- user roles (job seeker / admin)
- profile & skill input
- CV text storage
- jobs & opportunities seed data
- learning resources seed data
- basic (non-AI) matching logic
- dashboard
- CV skill extraction (AI/NLP or heuristic)
- job match scoring
- skill gap analysis
- career roadmap generation
- CareerBot assistant
- CV/profile assistant

Only identify dependencies supported by the existing roadmap and codebase — do not invent dependencies. For each, explain why it is required.

Also note whether the dependency is satisfied on the **backend**, the **frontend**, or **both** — since a Part 2 AI feature (e.g. career roadmap) typically depends on Part 1 data (profile, skills) existing on both sides already.

---

# Step 7 — Analyze the business workflow

Before writing the specification, understand the feature as a user-facing workflow. Consider:

- who initiates the action (job seeker, admin, or the system itself, e.g. a scheduled/AI process)
- what data is read and what is written
- what state changes on the affected entity (e.g. a Profile gaining extracted skills, a Roadmap being generated and saved)
- what validations are required, on both backend and frontend
- what happens when the operation fails or an external AI/API call fails
- whether results must be explainable/transparent to the user (this is a hard requirement from the hackathon brief for matching, skill-gap, and roadmap features — never present an unexplained score or recommendation)
- whether the frontend needs new UI states (loading, partial results, error, empty)
- for AI-assisted features (Part 2): what happens if the AI/API is unavailable — is there a graceful fallback?

For stateful entities, explicitly describe valid state transitions, e.g. for a generated roadmap:

```text
NOT_GENERATED
    ↓ (user requests roadmap)
GENERATING
    ↓
GENERATED
    ↓ (user edits inputs / regenerates)
REGENERATING → GENERATED
```

---

# Step 8 — Write the specification

Create the specification file at:

`.opencode/specs/<step_number>-<feature_slug>.md`

Use this structure:

```markdown
# Step <step_number> — <feature_title>

## Overview
2-4 sentences on what this feature delivers and which SDG-8 goal / hackathon requirement it satisfies.

## Dependencies
Each dependency, whether it's satisfied on backend/frontend/both, and why it's required.

## Backend Specification
- Routes/endpoints (method, path, purpose)
- Request/response contracts
- Services/controllers/middleware involved or newly needed
- Database changes (models/fields/enums/migrations) — only if a suitable model doesn't already exist
- Auth/authorization rules
- Validation rules
- Error handling
- Third-party packages or external APIs likely needed, and why (e.g. an LLM API for skill extraction)

## Frontend Specification
- Pages/components involved or newly needed
- State management approach
- API calls made, and to which backend endpoints
- UI states (loading/error/empty/success)
- Where this fits in navigation

## Business Workflow
The Step 7 walkthrough, including state transitions if applicable.

## Explainability Requirements
How the feature will show its reasoning to the user (required for matching, skill-gap, and roadmap features per the hackathon brief).

## Fallback / Failure Handling
What happens if an AI/external API call fails or is unavailable, if applicable.

## Open Questions
Anything that needs the user's decision before implementation begins.
```

Do not invent paths, packages, or models that don't already exist — mark anything genuinely new as "new" explicitly, and justify it.

---

# Step 9 — Create the feature branch

Only after the specification file is written and the roadmap-status checks in Step 5 have passed:

1. Confirm the current branch is the correct base (ask the user if unclear which branch to branch from).
2. Create and check out `feature/<feature_slug>` from that base.
3. Confirm the branch was created successfully.

Do not push the branch unless the user explicitly asks.

---

# Step 10 — Report back

Summarize for the user:

- the specification file path
- the branch created
- the top 2-3 dependencies and why they matter
- any open questions from the spec that need an answer before implementation starts
