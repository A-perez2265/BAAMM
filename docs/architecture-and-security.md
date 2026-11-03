# Architecture and security

Last updated: November 3, 2026.

## Purpose and scope

SkillSwap lets members earn platform credits by teaching and spend them learning from other members. Each new profile receives three credits; each settled lesson costs one credit. Teacher and Learner describe a member's role in an exchange, rather than separate account classes. Administrative authority is assigned through a trusted backend process.

The [selected MVP](MVP_SCOPE.md) includes account access/recovery, profiles, owned skill listings, discovery, requests, teacher acceptance/completion, learner confirmation, dashboard summaries and no-payment dispute closure. Lessons occur outside the application. Video verification, public video playback, chat, scheduling, payments, variable pricing and expanded adjudication are deferred.

## Architecture

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Browser | React 19, React Router, Vite | Forms, routes, validation, profile portfolios and exchange/dashboard views |
| Services | `src/services/` | Supabase queries and guarded database RPC calls |
| Identity | Supabase Auth | Registration, email/password login, sessions and recovery |
| Database | Supabase PostgreSQL | Persistent records, constraints, grants, RLS, state rules and atomic transactions |
| Retained media | Supabase Storage | Existing videos; candidate policy makes bucket private and limits reads |
| Quality checks | ESLint, Node assertions, Playwright, disposable PostgreSQL, GitHub Actions | Local behavior and database regression evidence; production compilation |

The frontend uses only the public project URL and public API key. Backend service-role credentials never belong in browser environment variables. Database functions, rather than the browser, enforce authorization and settlement.

## Data model

`profiles` stores owned account display data and a protected balance/admin flag. `public_profiles` exposes only id, display name, username, bio, broad location and preset avatar to signed-in members. `skills` contains owned Teacher/Learner listings. `exchanges` links participants and skills and retains state/history. `disputes` records participant reports; `dispute_actions` records administrator explanations and timestamps. Notifications and reviews are retained schema entities; current dashboard activity derives from exchanges, and a new reviews interface is outside the MVP.

## Business process

1. Registration creates a non-admin profile with three credits through an Auth trigger. Email confirmation may be required before login; no video upload occurs.
2. A teacher creates a listing. Another user discovers it and requests instruction with a nonblank message and at least one available credit.
3. The designated teacher accepts or declines. Acceptance neither reserves nor transfers credits.
4. After the lesson, the teacher marks it `session_completed`.
5. The designated learner confirms. A guarded database transaction locks the exchange and both profiles, checks funds, subtracts one credit, adds one credit and marks the exchange `completed`.
6. Reloaded dashboards derive balances and earned/spent counts from persisted data.

Either participant can report an accepted, unsettled exchange. Candidate SQL locks the exchange, creates one report and sets `issue_reported` in the same transaction. An administrator supplies an explanation to review or resolve it. Resolution records the audit action transactionally without changing either balance; resolved cases cannot reopen through the MVP.

## Security features

| Control | Candidate implementation | Evidence / limit |
| --- | --- | --- |
| Trusted admin authority | `is_admin()` reads only `app_metadata.is_admin`; signup ignores editable admin metadata | Local SQL and browser denial tests; hosted function source inspected, no fresh hosted exploit test |
| Private profile data | Owner-only profile RLS; public projection excludes balance/admin/video/email | Local SQL queries under separate role claims; hosted view is not yet deployed |
| Restricted writes | Column grants plus owned-profile/skill RLS; clients cannot insert profiles or edit balances/admin authority | Local PostgreSQL permission tests |
| Request integrity | DB validates learner, funds, teacher listing and pending initial state | Local request and invalid-listing tests |
| State authorization | Only designated teacher accepts/declines/marks complete; settlement/dispute states require guarded definer functions | Local direct-API-equivalent SQL tests; hosted application still pending |
| Credit integrity | Exchange row lock; deterministic participant lock order; fixed one-credit transfer; replay/state/funds checks | Sequential replay/transfer tested; separate-session races not yet tested |
| Dispute integrity | Transactional submission and audited resolution; required explanation; direct table mutations denied | Injected update/audit failures prove local rollback |
| History preservation | Skill FK and deletion guard preserve existing exchange references | Local deletion rejection test |
| Public text privacy | Client validation and database trigger reject recognizable contact details | Existing service cases plus direct SQL bypass attempt; pattern detection is best effort |
| Retained videos | Candidate bucket private; uploader/admin SELECT only; known legacy upload/public-read policies removed | Local policy tests; real storage HTTP behavior remains unverified |
| Error handling | Auth failure retains form input; no status-only settlement fallback; RPC failures are surfaced | Simulated service/browser tests |

Security-definer functions are owned by `postgres`, have an explicit search path and enforce session identity before effects. Ordinary users cannot choose administrator authority at signup. Existing administrative accounts must use trusted app metadata and refresh their sessions after a trusted role change.

## Reproduce and operate

Use Node 22.12+ and `npm ci`. Copy `.env.example` to `.env.local`, supply the public Supabase URL/key and run `npm run dev`. The [root README](../README.md) specifies fresh-project SQL order. For an existing project use the [deployment procedure](database-deployment.md), rather than replaying all setup scripts.

Run `npm run lint`, `npm test`, `npm run test:database`, `npm run test:e2e` and `npm run build`. Install the browser once with `npm run test:e2e:install`. The SQL suite is ephemeral and requires no remote credentials or Docker. Browser regression uses a simulated backend and blocks external requests. The generated evidence describes the tested source and limitations.

Keep environment files, local CLI state, browser auth state and raw traces out of commits. Review screenshots/reports before sharing. The live tests create fixture records and may transfer credits; use dedicated accounts and explicit authorization.

## Deployment and remaining limitations

The local frontend depends on the new public-profile view and dispute RPCs. Review/apply the candidate migration before publishing this frontend. Existing user sessions may need refresh after trusted metadata changes. Private storage breaks old public video URLs by design without deleting stored media.

A hosted schema/configuration export and restore drill are still required to establish full reproducibility of the shared environment. The fresh-project schema is an MVP baseline, not an assertion of exact hosted parity. Automated local checks do not certify email delivery, password-reset redirect configuration, storage HTTP access, real login, simultaneous transactions, production deployment or all accessibility requirements. See [current evidence](testing.md) for the exact acceptance boundary.
