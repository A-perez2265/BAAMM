# Main-branch review supporting the MVP scope

**Reviewed:** October 20, 2026. **Source:** [`A-perez2265/BAAMM`, main at `fcf3312`](https://github.com/A-perez2265/BAAMM/tree/fcf331290ec6c347a244ed2910cabf58081a7512). Git fetch found no newer main commit. A temporary archive of that exact commit was used so local uncommitted additions were not mistaken for team functionality.

**Purpose:** Establish a defensible scope and completion backlog for [MVP_SCOPE.md](MVP_SCOPE.md). This is a repository-level functional review, not a certification of the running Supabase environment, a penetration test or a new execution of the historical test suite. No remote SQL or configuration was changed.

## Review coverage

All tracked areas were inventoried: application source, styles/assets, SQL, tests/reports, documentation, package/build/lint configuration, CI, scanner artifacts and root discovery prototypes. Functional conclusions use routes, component/service behavior, SQL definitions and test assertions. Images/styles and scanner history were reviewed as supporting inventory rather than evidence of a working business rule. Binary assets are not functionality tests.

| Area on reviewed main | Inventory / evidence | MVP interpretation |
| --- | --- | --- |
| App entry and routing | [App.jsx](../src/App.jsx), [main.jsx](../src/main.jsx), [ErrorBoundary](../src/components/ErrorBoundary.jsx) | Auth-wrapped Dashboard, Profile, Skills, Search, Request, Incoming, Confirm and Admin; separate password-recovery routes; no routed review, chat, calendar or video-review page |
| Pages | 9 JSX files under `src/pages/`; Profile and PasswordRecovery serve multiple routes/modes | Existing user journey is integrated enough to retain; presence of a page is not proof of deployed permission enforcement |
| Components | 16 JSX files, including Auth, Register, DisputeModal, ActivityFeed, Alerts, shared search/skill/avatar components | Existing forms/cards/alerts are in scope; no new design system is needed to finish the MVP |
| Services | 5 modules under `src/services/` | Public profile operations, skill CRUD, discovery, exchange lifecycle, password recovery |
| Utilities/constants | 9 files under `src/utils/` and `src/constants/` | Public-text/location validation, preset avatars, listing refresh, statuses/options and Supabase initialization |
| Database | 8 SQL files under `supabase/` | Important business logic exists, but the files do not recreate the whole deployed project from scratch |
| Tests | 5 mocked offline `.mjs` modules and 2 live `.js` scripts | Existing coverage must be extended and accurately classified, not presented as newly invented testing infrastructure |
| Documentation | README and 4 documents under `docs/` | Setup, integration checklist, password recovery, public-text limitations and test matrix already exist |
| CI | [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Lint, five offline modules, audit/secret guard, build/artifact and a live-security job are defined; actual GitHub run status/secrets were not inspected |
| Historical evidence | `tests/results/`, `.ship-safe/`, `.ship-safeignore` | Prior reports and remediation notes, not current guarantees or proof that every matrix row was executed |
| Legacy discovery | [useDiscoveryEngine.js](../useDiscoveryEngine.js), [useDiscoveryState.js](../useDiscoveryState.js), [mockData.json](../mockData.json) | Root prototypes contain barter/distance/sorting ideas but are not imported by current `src/` routes; exclude those ideas from current capability claims |
| Styles/assets/build files | Page/component CSS, global styles, logo/avatar assets, `index.html`, Vite/ESLint config, package files and `.env.example` | Supports current presentation/tooling; no themes, native app or production hosting configuration established by these assets |

## Current behavior by product area

| Area | What is actually present | Important boundary |
| --- | --- | --- |
| Accounts | [Auth](../src/components/Auth.jsx) handles login/session/logout; [Register](../src/components/Register.jsx) signs up, requires a video, uploads it and stores a public URL | UI announces 3 starter credits. Video upload can fail after account creation. Profile does not supply the advertised re-upload setting |
| Recovery | [PasswordRecoveryPage](../src/pages/PasswordRecoveryPage.jsx), [service](../src/services/passwordRecoveryService.js), [notes](password-recovery.md) | UI/mocked behavior exists; real delivery, allowed redirect origins and expired-link behavior depend on deployed Auth settings |
| Profiles and skills | [ProfilePage](../src/pages/ProfilePage.jsx), [SkillManagementPage](../src/pages/SkillManagementPage.jsx), [profile service](../src/services/profileService.js), [skill service](../src/services/skillService.js) | Owner controls, explicit profile fields, public-text validation, teacher/learner portfolios and preset avatars exist. Service query filters are not independent backend authorization |
| Discovery | [SearchPage](../src/pages/SearchPage.jsx), [discovery service](../src/services/discoveryService.js) | Queries real Teacher listings, excludes caller's listings, filters in memory and derives suggestions from tags; no live barter/distance/rating engine |
| Requests | [RequestExchangePage](../src/pages/RequestExchangePage.jsx), [exchange service](../src/services/exchangeService.js) | Verifies message, balance, self-request and matching teacher listing before insertion; uses the selected skill ID |
| Exchange completion | [Incoming](../src/pages/IncomingRequestsPage.jsx), [Confirm](../src/pages/ConfirmExchangesPage.jsx), [confirmation SQL](../supabase/confirm_skill_exchange.sql) | Teacher completion does not itself transfer credits; learner confirmation invokes `confirm_skill_exchange`. SQL locks the exchange and learner, transfers 1 and marks completed |
| Dashboard | [DashboardPage](../src/pages/DashboardPage.jsx), [ActivityFeed](../src/components/ActivityFeed.jsx), [Alerts](../src/components/Alerts.jsx) | Shows balances, aggregate earned/spent counts and exchange-derived alerts/activity. Does not implement a notifications-table inbox or realtime subscription; reload/navigation consistency is the practical baseline |
| Disputes/admin | [DisputeModal](../src/components/DisputeModal.jsx), [AdminDashboard](../src/pages/AdminDashboard.jsx), [dispute actions SQL](../supabase/dispute_actions.sql), [credit grant SQL](../supabase/admin_grant_credits.sql) | Can report a problem, change dispute status, grant reporter credits and record separate actions. Those actions are not an atomic exchange-resolution policy |
| Reviews | `reviews` is described in README and covered by live security tests | No routed ratings/review submission experience was found. Table existence alone does not make review UI a completed feature |

## Completion findings that affect scope

| ID | Repository finding | Why it matters / required follow-up |
| --- | --- | --- |
| GAP-01 | [Signup and `is_admin()` SQL](../supabase/disputes_and_verification.sql) consult editable user metadata; AdminDashboard does too | Separate ordinary member/admin authority before final acceptance. This review did not exploit or modify a live account |
| GAP-02 | Video bucket is declared public; registration requires a video and calls `getPublicUrl` | Required/optional and read access are product decisions with real implementation consequences; section 7.1 of the MVP specification supplies a proposed baseline |
| GAP-03 | Dispute insertion and exchange blocking are separate writes; blocking failure is logged as a warning and success is still displayed | Reporting can leave inconsistent state. Resolve submission atomically and verify the actual deployed behavior |
| GAP-04 | Resolve Dispute only changes dispute status. Grant credits creates a credit for the reporter via a different call; history writes can fail independently | Decide outcome semantics and settle exchange/credits/audit together. section 7.2 of the MVP specification distinguishes payment from compensation |
| GAP-05 | `confirm_skill_exchange` permits `accepted` as well as post-lesson statuses | The database currently permits a route that skips teacher completion if this definition is deployed; align it with the agreed lifecycle and check legacy RPC overloads too |
| GAP-06 | Base definitions/policies for profiles, skills, notifications and reviews are absent from tracked SQL; README orders `profile_credit_transfers.sql` before the confirmation function it alters | A clean clone alone cannot reproduce the database as documented. Obtain missing definitions and correct the dependency order |
| GAP-07 | `protect_profile_sensitive_columns` is defined in the credit SQL but not attached there as a trigger | Defining a guard is not evidence that it executes. Inspect deployed trigger attachments and protect direct writes |
| GAP-08 | Starter credits are described as both 1 and 3 across docs/matrix, while registration/signup SQL use 3 | BR-01 specifies 3; align the UI, trigger, documentation and expectations |
| GAP-09 | Source comments promise optional live CI skips when secrets are missing, but the job condition checks event/repository identity, not secret availability | Verify current runs and fix missing-secret behavior. Do not equate a workflow file with confirmed green CI or a configured live environment |
| GAP-10 | `npm test` invokes 3 modules; CI invokes all 5. The audit threshold is `critical`, despite a general comment mentioning high/critical | Make local/CI commands and documented thresholds consistent; review exceptions without inventing a new vulnerability finding |
| GAP-11 | Dispute UI promises email within 24–48 hours; admin UI has a `mailto:` link, without an automatic resolution-email implementation | Choose manual follow-up and accurate wording or explicitly commit to a delivery process; do not treat the promise as implemented automation |
| GAP-12 | Historical matrix includes source inspection/inferred positive admin cases alongside live results, all marked PASS | Use the right evidence category and execute required positive admin cases before final release; extend the existing matrix without replacing historical evidence |
| GAP-13 | Skills are directly deleted; the deployed schema and all dependent record behavior are not reproducible from main alone | Verify foreign keys/history behavior and either preserve completed exchanges safely or block unsupported removal |

## Existing evidence versus unmerged local work

- The tracked security report is from October 6, 2026; its timestamp is `2026-10-06T23:09:26.334Z`. It reports 12 security/concurrency checks, including cross-user mutations and at-most-once credit transfer. It is not a new current deployment run.
- The October 14 [test matrix](TEST_MATRIX.md) catalogs 65 scenarios. Its rows reuse evidence across scenarios and include code inspection; that is not 65 independent browser executions.
- A prior successful workflow demonstration was reported. Its date, tested version and execution artifacts were not supplied for this review.
- Main has no Playwright dependency, browser config or browser scenarios. The local branch's 20 browser checks, generated reports and privacy notes are uncommitted additions and are not included in the main capability inventory. Their backend is simulated.
- The README, test matrix and CI workflow already exist on main. The MVP specification supplements these artifacts.

## Limits and next use

No live security/auth tests were run for this scope review: they create records and make database writes. No changes were made to the team's database, storage, Auth configuration, GitHub, Jira or account roles. No claim is made that the deployed database exactly matches these SQL scripts. Unpublished teammate work, the full BRD and the final course rubric were not available.

Use the companion specification to establish the release baseline, approve video/dispute policies, reconcile exclusions with binding requirements and record acceptance evidence. Specification approval, implementation completion and deployment are separate release states.
