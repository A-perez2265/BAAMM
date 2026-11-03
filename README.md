# SkillSwap - Team BAAMM

A social skill-sharing platform where users learn new skills and teach others using a **time-credit system**. Instead of exchanging money or relying on a direct one-to-one skill trade, users earn credits by teaching someone and can spend those credits to learn from any other user on the platform.

**Team:** BAAMM &nbsp;|&nbsp; **Institution:** Texas A&M University–San Antonio &nbsp;|&nbsp; **Project Management:** Jira

**MVP specification:** [Functional requirements, business rules and acceptance criteria](docs/MVP_SCOPE.md). The selected baseline defers video verification and uses no-transfer dispute closure; implementation status is documented separately.

---

## Table of Contents

1. [Problem & Solution](#1-problem--solution)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Cloning the Repository](#4-cloning-the-repository)
5. [Configuring the Local Environment](#5-configuring-the-local-environment)
6. [Running the Application Locally](#6-running-the-application-locally)
7. [Executing the Test Suite](#7-executing-the-test-suite)
8. [Project Structure](#8-project-structure)
9. [Database Schema Overview](#9-database-schema-overview)
10. [Contributing](#10-contributing)

---

## 1. Problem & Solution

**Problem:** People have valuable skills to share, but there's no easy way to trade them fairly without paying for lessons or needing a perfect one-to-one skill swap.

**Solution:** A web app where users earn time credits by teaching skills, then spend those credits to learn different skills from anyone else on the platform.

**Impact:** Saves people money and opens up alternate, fairer ways of "paying" for knowledge and mentorship within the community.

---

## 2. High-Level Architecture

SkillSwap is a **React single-page application (SPA)** backed entirely by **Supabase** (PostgreSQL + Auth + Storage). There is no separate custom backend server — all business logic runs either in the React frontend (via service modules) or inside PostgreSQL as stored procedures / RPCs.

```
┌─────────────────────────────────────────────────────-┐
│                   Browser (React SPA)                │
│                                                      │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  Pages   │  │ Components │  │    Services      │  │
│  │ (routes) │◄─│  (UI)      │◄─│ (Supabase calls) │  │
│  └──────────┘  └────────────┘  └────────┬─────────┘  │
└────────────────────────────────────────-│────────────┘
                                          │ HTTPS / WebSocket
                            ┌─────────────▼──────────────┐
                            │         Supabase           │
                            │  ┌───────────────────────┐ │
                            │  │  PostgreSQL Database  │ │
                            │  │  + RLS Policies       │ │
                            │  │  + Stored Procedures  │ │
                            │  └───────────────────────┘ │
                            │  ┌───────────────────────┐ │
                            │  │  Supabase Auth        │ │
                            │  │  (email/password)     │ │
                            │  └───────────────────────┘ │
                            │  ┌───────────────────────┐ │
                            │  │  Supabase Storage     │ │
                            │  │  (verification-videos)│ │
                            │  └───────────────────────┘ │
                            └────────────────────────────┘
```

### Key Technology Choices

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| Routing | React Router v7 |
| Build tool | Vite 8 |
| Backend-as-a-Service | Supabase |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (email/password) |
| Client library | `@supabase/supabase-js` v2 |
| Security model | PostgreSQL Row Level Security (RLS) tied to `auth.uid()` |
| Atomic transactions | PostgreSQL RPCs / Stored Procedures (`SECURITY DEFINER`) |
| Linting | ESLint 10 |

### Application Routes

| Path | Page | Description |
|---|---|---|
| `/` | `DashboardPage` | Main hub — activity feed, credit balance, notifications |
| `/search` | `SearchPage` | Browse and filter skill listings |
| `/profile` | `ProfilePage` | View/edit your own profile |
| `/profile/:id` | `ProfilePage` | View another user's public profile |
| `/skills` | `SkillManagementPage` | Add, edit, or remove your skill listings |
| `/request` | `RequestExchangePage` | Send a skill exchange request |
| `/incoming` | `IncomingRequestsPage` | Review requests sent to you |
| `/confirm` | `ConfirmExchangesPage` | Confirm completed sessions & release credits |
| `/admin` | `AdminDashboard` | Trusted administrators review disputes and close without payment |
| `/forgot-password` | `PasswordRecoveryPage` | Request a password-reset link |
| `/reset-password` | `PasswordRecoveryPage` | Set a new password via emailed token |

---

## 3. Prerequisites

Before cloning, make sure the following are installed on your machine:

| Tool | Minimum Version | Check command |
|---|---|---|
| **Node.js** | 22.12+ recommended (Vite requires 20.19+ or 22.12+) | `node --version` |
| **npm** | 9.x or higher | `npm --version` |
| **Git** | Any recent version | `git --version` |

You will also need a **Supabase project** (free tier is sufficient). Create one at [supabase.com](https://supabase.com) if you do not already have access to the team's project.

---

## 4. Cloning the Repository

```bash
# 1. Clone the repo
git clone https://github.com/A-perez2265/BAAMM.git BAAMM

# 2. Enter the project directory
cd BAAMM

# 3. Install all dependencies
npm ci
```

> Use a feature branch for reviewed changes; never commit local credentials.

---

## 5. Configuring the Local Environment

The application requires two Supabase credentials to connect to the database. These are **never committed to the repository** — they live in a local environment file.

### Step 1 — Create your `.env.local` file

```bash
# Copy the example template
cp .env.example .env.local
```

### Step 2 — Fill in your credentials

Open `.env.local` in your editor and set the two required variables:

```dotenv
# .env.local

# Your Supabase project URL
# Found in: Supabase Dashboard → Project Settings → API → Project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anonymous/public API key (either name is accepted)
# Found in: Supabase Dashboard → Project Settings → API → Project API keys → anon / public
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
# Alternatively: VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Why `VITE_` prefix?** Vite only exposes environment variables to the browser bundle when they are prefixed with `VITE_`. Never put secret keys (service role key) in a `VITE_` variable.

### Step 3 — Configure the database

**Existing team project:** do not reapply all setup scripts. Review [the proposed Supabase upgrade](docs/database-deployment.md) first. The November 3 frontend requires `public_profiles`, `submit_skill_dispute` and `review_skill_dispute` from `mvp_security_hardening.sql`. Deploy the reviewed SQL before publishing that frontend. The frontend depends on this migration; deployment has not been verified against the hosted environment.

**Fresh Supabase test project:** execute these SQL files in order, using the SQL Editor. `base_schema.sql` defines a reproducible MVP schema; it is not a full export of the hosted project. Run the base script once in an empty project.

```text
supabase/base_schema.sql
supabase/exchanges.sql
supabase/profile_avatars.sql
supabase/disputes_and_verification.sql
supabase/dispute_actions.sql
supabase/confirm_skill_exchange.sql
supabase/profile_credit_transfers.sql
supabase/public_text_privacy.sql
supabase/admin_grant_credits.sql
supabase/mvp_security_hardening.sql
```

Configure Auth → URL Configuration for the app origin and `/reset-password` redirect. Keep email confirmation enabled unless a dedicated test project deliberately uses a different setting. Registration explains confirmation when no session is returned. The MVP has no video upload or approval workflow.

This order is executed by `npm run test:database` in disposable PostgreSQL. That test uses fixture Auth/Storage schemas; actual Supabase Auth, email delivery, API grants, storage delivery and concurrent sessions still require separate environment verification.

---

## 6. Running the Application Locally

```bash
# Start the Vite development server (hot-reload enabled)
npm run dev
```

Vite will print the local URL — typically **http://localhost:5173** — open it in your browser.

### Other useful commands

```bash
# Build an optimised production bundle into /dist
npm run build

# Preview the production build locally (runs from /dist)
npm run preview

# Run the ESLint linter
npm run lint
```

> The first time you open the app in a fresh browser you will be redirected to the **Login / Sign-up** page. Creating an account through the app's UI is the recommended starting point; Supabase Auth will trigger a database hook that automatically creates your `public.profiles` row and grants **3 starting credits**. No video is required.

---

## 7. Executing the Test Suite

For profile/skill privacy controls, dated evidence, and checks that still require a live database or browser, see [Profile and skill security](docs/profile-skill-security.md).

For Playwright regression checks and the opt-in live exchange workflow, see [Browser testing](docs/browser-testing.md). The live workflow requires a dedicated test environment and has not been executed against hosted Supabase.

The project uses Node.js-based integration test scripts that spin up an isolated Vite SSR context and mock the Supabase client. No additional test framework installation is required.

```bash
# Run all integration tests
npm test
```

This runs all five test modules below in sequence:

| File | What it covers |
|---|---|
| `tests/profile-and-skills.mjs` | Profile CRUD, skill listing create/read/update/delete |
| `tests/password-recovery.mjs` | Password reset request & confirmation flows |
| `tests/discovery-and-exchanges.mjs` | Skill discovery search logic, exchange request validation, credit guard-rails |
| `tests/discovery-filters.mjs` | Search filter combinations |
| `tests/discovery-suggestions.mjs` | Tag prefix-matching and autocomplete suggestions |

### Running a single test file

```bash
node tests/profile-and-skills.mjs
node tests/discovery-and-exchanges.mjs
```

### Database and browser checks

```bash
npm run test:database  # Disposable PostgreSQL: SQL, RLS, permissions, state rules and rollback
npm run test:e2e:install
npm run test:e2e       # Local browser UI with simulated backend; no live writes
```

See [recorded test results](docs/testing.md) for actual results and limits. `test-results/database-matrix.*` and `test-results/browser-matrix.*` contain execution-specific results; browser screenshots and traces remain local unless reviewed for sharing.

### Live security & auth tests — explicit test environment only

`tests/test-auth.js`, `tests/test-security-suite.js` and the opt-in browser live workflow create records and can transfer credits. Do not run them against the shared team project as a routine check. Use the [live-test prerequisites](docs/browser-testing.md#live-workflow).

GitHub Actions runs lint, all five offline service tests, local database tests, browser regression, dependency scanning and production compilation. A separate manual workflow can run the historical live suites with dedicated `supabase-test` environment secrets. Those historical suites need review against the tightened permissions before being treated as current acceptance evidence.

---

## 8. Project Structure

```
BAAMM/
├── index.html                  # Vite HTML entry point
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint rules
├── package.json                # Scripts and dependencies
├── .env.example                # Template for required environment variables
│
├── src/
│   ├── main.jsx                # React app bootstrap (mounts <App />)
│   ├── App.jsx                 # Root router — all route definitions live here
│   ├── App.css / index.css     # Global styles
│   │
│   ├── pages/                  # One file per route/page
│   │   ├── DashboardPage.jsx
│   │   ├── SearchPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SkillManagementPage.jsx
│   │   ├── RequestExchangePage.jsx
│   │   ├── IncomingRequestsPage.jsx
│   │   ├── ConfirmExchangesPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── PasswordRecoveryPage.jsx
│   │
│   ├── components/             # Reusable UI components
│   │   ├── Auth.jsx            # Auth gate wrapper (redirects unauthenticated users)
│   │   ├── Register.jsx        # Sign-up form
│   │   ├── ActivityFeed.jsx    # Notification/activity list
│   │   ├── Alerts.jsx          # In-app alert banners
│   │   ├── AvatarPicker.jsx    # Avatar selection UI
│   │   ├── ProfileAvatar.jsx   # Renders a user's chosen avatar
│   │   ├── DisputeModal.jsx    # Dispute submission dialog
│   │   ├── ErrorBoundary.jsx   # React error boundary wrapper
│   │   ├── Footer.jsx
│   │   ├── BrandLogo.jsx
│   │   ├── CommunityIcon.jsx
│   │   ├── search/             # Search-specific components
│   │   │   ├── SearchBar.jsx
│   │   │   ├── SearchFilters.jsx
│   │   │   └── SkillFilters.jsx
│   │   └── skills/             # Skill-listing components
│   │       ├── SkillCard.jsx
│   │       └── SkillForm.jsx
│   │
│   ├── services/               # All Supabase API calls (no UI logic here)
│   │   ├── discoveryService.js   # Browse/filter skill listings
│   │   ├── exchangeService.js    # Create, accept, decline, complete exchanges
│   │   ├── profileService.js     # Read/update profiles
│   │   ├── skillService.js       # Skill listing CRUD
│   │   └── passwordRecoveryService.js
│   │
│   ├── constants/              # Shared lookup tables / enums
│   │   ├── avatarOptions.js
│   │   ├── exchangeStatus.js
│   │   ├── skillIcons.js
│   │   └── skillOptions.js
│   │
│   └── utils/                  # Pure helper functions
│       ├── supabaseClient.js     # Initialises the Supabase client (reads .env.local)
│       ├── profileUtils.js
│       ├── skillUtils.js
│       ├── publicTextPrivacy.js
│       └── useListingRefresh.js  # Custom hook for re-fetching skill data
│
├── supabase/                   # SQL migration/setup files (run once per environment)
│   ├── exchanges.sql
│   ├── profile_avatars.sql
│   ├── profile_credit_transfers.sql
│   ├── disputes_and_verification.sql
│   ├── dispute_actions.sql
│   ├── confirm_skill_exchange.sql
│   ├── public_text_privacy.sql
│   └── admin_grant_credits.sql
│
├── tests/                      # Integration test scripts (Node.js / Vite SSR)
│   ├── profile-and-skills.mjs
│   ├── password-recovery.mjs
│   ├── discovery-and-exchanges.mjs
│   ├── discovery-filters.mjs
│   ├── discovery-suggestions.mjs
│   ├── test-auth.js
│   ├── test-security-suite.js
│   └── results/                # Auto-generated security & test reports
│
├── docs/                       # Feature-level design documentation
│   ├── integration-check.md
│   ├── password-recovery.md
│   └── public-text-privacy.md
│
└── dist/                       # Production build output (git-ignored)
```

---

## 9. Database Schema Overview

All tables live in the Supabase `public` schema and are protected by **Row Level Security (RLS)** policies keyed to `auth.uid()`.

| Table | Purpose |
|---|---|
| `profiles` | Private owner row; stores display info and protected `credits_balance` |
| `public_profiles` (view) | Authenticated safe profile projection; excludes balance, email, video links and admin flag |
| `skills` | Skill listings (type: `Teacher` or `Learner`) owned by a profile |
| `exchanges` | Tracks the full lifecycle of a skill exchange (`pending → accepted → session_completed → completed`) |
| `notifications` | In-app notifications generated by exchange state changes |
| `reviews` | Post-exchange ratings (1–5 stars) and comments |

### Credit system rules

- New accounts receive **3 starting credits** via a PostgreSQL trigger (`on_auth_user_created`).
- Learners must hold **at least 1 credit** to send an exchange request.
- Credit transfer (learner → teacher) happens atomically inside the `confirm_skill_exchange` RPC to prevent race conditions or double-spending.

---

## 10. Contributing

Use a feature branch and submit changes through a pull request. Include relevant tests, document database changes, and keep setup instructions consistent with the implementation. Never commit credentials, generated browser authentication state, or local review material.

Run the checks in [Testing](docs/testing.md) before requesting review. Changes that depend on database views or functions must document their deployment order in [Database deployment](docs/database-deployment.md).

## Technical documentation

- [Architecture and security](docs/architecture-and-security.md)
- [Database deployment](docs/database-deployment.md)
- [Testing and recorded results](docs/testing.md)
- [Browser testing](docs/browser-testing.md)
- [Profile and skill security](docs/profile-skill-security.md)
- [MVP requirements and business rules](docs/MVP_SCOPE.md)
