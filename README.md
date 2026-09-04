# CareerForge

AI-powered youth employment & career roadmap platform aligned with **SDG 8** (full and productive employment for all).

## What It Does

CareerForge helps young job seekers build career roadmaps, match with opportunities, and identify skill gaps:

- **Profile & skills** — users build a profile with education, experience, and skills
- **Smart job matching** — rule-based engine scores job opportunities against user skills, shows matched/missing skills
- **Learning resources** — recommended courses mapped to skill gaps
- **Dashboard** — profile summary, top recommendations, and visual analytics (charts)
- **Phase 2 (AI)** — career roadmap generation, CV assistant, chatbot (not yet implemented)

## Tech Stack

| Layer | |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Backend | Express v5 + TypeScript + MongoDB (Mongoose) |
| Auth | JWT (access + refresh) in httpOnly cookies |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Notifications | Sonner (toast) |

## Monorepo Layout

```
CareerForge/
├── careerforge-backend/       # Express API server
├── careerforge-frontend/      # Next.js client
├── docs/                      # Implementation plans & project plan
├── CAREER_FORGE.md            # Full build spec
├── AGENTS.md                  # Agent working rules (opencode)
└── README.md                  # You are here
```

## Quick Start

**Prerequisites:** Node.js 20+, MongoDB running locally

```bash
# 1. Clone and install
git clone <repo-url>
cd CareerForge

# 2. Backend
cd careerforge-backend
npm install
cp .env.example .env          # edit vars as needed
npm run seed                   # seeds 21 jobs + 20 resources
npm run dev                    # http://localhost:5000

# 3. Frontend (new terminal)
cd ../careerforge-frontend
npm install
cp .env.local.example .env.local
npm run dev                    # http://localhost:3000
```

Open `http://localhost:3000`, register, build your profile, and explore jobs & resources.

## Key Commands

| Command | Where | Description |
|---------|-------|-------------|
| `npm run dev` | `careerforge-backend` | Start API server (hot reload) |
| `npm run seed` | `careerforge-backend` | Seed jobs + resources (idempotent) |
| `npm run build` | `careerforge-backend` | Compile TypeScript |
| `npm run lint` | `careerforge-backend` | ESLint |
| `npm run dev` | `careerforge-frontend` | Start Next.js dev server |
| `npm run build` | `careerforge-frontend` | Production build |
| `npm run lint` | `careerforge-frontend` | ESLint |

## API Endpoints

All backend routes are prefixed with `/api`:

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/profile` | Get profile |
| PUT | `/api/profile` | Update profile |
| GET | `/api/jobs` | List jobs (filters: `track`, `type`, `location`) |
| GET | `/api/jobs/:id` | Job detail |
| GET | `/api/jobs/recommended` | Skill-based recommendations |
| GET | `/api/resources` | List resources (filter: `skill`) |
| GET | `/api/resources/recommended` | Gap-based recommendations |
| GET | `/api/dashboard` | Aggregated dashboard data |

## Documentation

- **`CAREER_FORGE.md`** — full build spec (stack, data models, API contract, folder structure, design system)
- **`AGENTS.md`** — architecture rules and agent working conventions
- **`docs/project_plan_v1.md`** — step-by-step implementation plan with acceptance criteria
- **`docs/step*_plan.md`** — detailed plan for each step (02–07)
- **`.opencode/implementation-notes/`** — post-implementation notes for steps 01–07

## License

ISC