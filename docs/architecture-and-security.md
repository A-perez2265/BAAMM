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
| Retained media | Supabase Storage | Existing videos retained in a private bucket with uploader/administrator reads |
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

Either participant can report an accepted, unsettled exchange. The guarded SQL function locks the exchange, creates one report and sets `issue_reported` in the same transaction. An administrator supplies an explanation to review or resolve it. Resolution records the audit action transactionally without changing either balance; resolved cases cannot reopen through the MVP.

## Security features

| Control | Implemented protection | Evidence / limit |
| --- | --- | --- |
| Trusted admin authority | `is_admin()` reads only `app_metadata.is_admin`; signup ignores editable admin metadata | Local API metadata-escalation denial passed; shared administrator access and ordinary-learner denial passed |
| Private profile data | Owner-only profile RLS; public projection excludes balance/admin/video/email | Local SQL/API isolation tests passed; shared view/grants verified and public display reads succeeded |
| Restricted writes | Column grants plus owned-profile/skill RLS; clients cannot insert profiles or edit balances/admin authority | Local PostgreSQL/API tests and shared catalog assertions passed |
| Request integrity | DB validates learner, funds, teacher listing and pending initial state | Local request and invalid-listing tests |
| State authorization | Only designated teacher accepts/declines/marks complete; settlement/dispute states require guarded definer functions | Local SQL/API tests passed; shared request-to-confirmation browser flow succeeded |
| Credit integrity | Exchange row lock; deterministic participant lock order; fixed one-credit transfer; replay/state/funds checks | Actual local API races passed; shared single settlement and balance conservation verified. Hosted concurrency not run |
| Dispute integrity | Transactional submission and audited resolution; required explanation; direct table mutations denied | Injected update/audit failures prove local rollback |
| History preservation | Skill FK and deletion guard preserve existing exchange references | Local deletion rejection test |
| Public text privacy | Client validation and database trigger reject recognizable contact details | Existing service cases plus direct SQL bypass attempt; pattern detection is best effort |
| Retained videos | Bucket private; uploader/admin SELECT only; known legacy upload/public-read policies removed | Actual local Storage HTTP authorization passed; shared private bucket/policies verified. Hosted Storage HTTP not run |
| Error handling | Auth failure retains form input; no status-only settlement fallback; RPC failures are surfaced | Simulated service/browser tests |

Security-definer functions are owned by `postgres`, have an explicit search path and enforce session identity before effects. Ordinary users cannot choose administrator authority at signup. Existing administrative accounts must use trusted app metadata and refresh their sessions after a trusted role change.

## Reproduce and operate

Use Node 22.12+ and `npm ci`. Copy `.env.example` to `.env.local`, supply the public Supabase URL/key and run `npm run dev`. The [root README](../README.md) specifies fresh-project SQL order. For an existing project use the [deployment procedure](database-deployment.md), rather than replaying all setup scripts.

Run `npm run lint`, `npm test`, `npm run test:database`, `npm run test:e2e` and `npm run build`. Install the browser once with `npm run test:e2e:install`. The SQL suite is ephemeral and requires no remote credentials or Docker. Browser regression uses a simulated backend and blocks external requests. The generated evidence describes the tested source and limitations.

Keep environment files, local CLI state, browser auth state and raw traces out of commits. Review screenshots/reports before sharing. The live tests create fixture records and may transfer credits; use dedicated accounts and explicit authorization.

## Deployment and remaining limitations

The frontend depends on the public-profile view and dispute RPCs. The reviewed upgrade was applied to shared Supabase on November 3, 2026; all 23 catalog checks and eleven subsequent browser checkpoints passed. The shared walkthrough used an existing administrator as teacher and a dedicated ordinary learner. Existing sessions may need refresh after trusted metadata changes. Private storage restricts old public video delivery without deleting stored media.

A local export of the affected hosted definitions was captured before migration; it is not a full database backup. A verified hosted restore drill remains necessary to establish recovery capability. The fresh-project schema is an MVP baseline, not an assertion of exact hosted parity. Public signup/email delivery, recovery redirects, hosted private-video HTTP, hosted concurrency, administrator dispute writes, external frontend deployment and full accessibility compliance remain outside shared acceptance. See [current evidence](testing.md) and [shared acceptance](hosted-acceptance.md).

## Risks and residual work

| Risk | Implemented safeguard | Remaining limitation / test |
| --- | --- | --- |
| A caller forges another user's identifiers or bypasses the interface | Owner/participant RLS, restricted grants, server-derived identity and state guards | Keep direct API regression; a hidden button alone is never authorization evidence |
| An ordinary user promotes themselves to administrator | Trusted app metadata, non-admin signup and server-side RPC authorization | Trusted administrator provisioning remains an operational responsibility; refresh sessions after role changes |
| Repeated or competing confirmations spend the same credit | Exchange/profile locks, deterministic lock order, settlement-time funds check and transaction rollback | Separate-session local tests passed; repeat in an approved hosted acceptance environment before claiming hosted concurrency |
| A report blocks the wrong exchange or closure loses its audit history | Guarded atomic submit/review functions, required explanation and active-dispute uniqueness | Local rollback tests passed; shared administrator-write acceptance remains open |
| Private videos are accessed through an old public URL | Private bucket and uploader/administrator read policies | Shared configuration passed; shared HTTP denial and authorized delivery still need verification |
| Public text contains contact details | Client validation and database privacy triggers | Pattern matching is best effort and does not establish comprehensive data-loss prevention |
| Secrets or personal test data enter GitHub | Public-key-only frontend configuration, ignore rules, synthetic fixtures and reviewed sanitized evidence | Review staged content and raw artifacts before each publication; ignore rules do not remove already-tracked files |
| Environment drift breaks setup or recovery | Versioned SQL, separate fresh/upgrade procedures, input hashes and deployment records | A full hosted backup/restore drill and another developer's setup review remain outstanding |
