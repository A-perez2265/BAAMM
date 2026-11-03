# Milestone 3 implementation overview

Date: November 3, 2026. Reviewed application baseline: `dcc4b8f`.

## Summary for the team

This implementation phase completed integration and hardened the existing SkillSwap workflow. The changes align registration with the selected no-video MVP, isolate private profile data, enforce exchange rules in PostgreSQL, make disputes transactional, restrict retained videos, expand automated checks and document actual deployment results. Existing authentication, profiles, discovery, exchange pages and dashboard functionality predate this phase; this report describes their integration and security changes rather than claiming they were all newly built.

The changes were merged through PRs [#33](https://github.com/A-perez2265/BAAMM/pull/33) and [#34](https://github.com/A-perez2265/BAAMM/pull/34). The shared Supabase migration was applied and verified. Commit [`dcc4b8f`](https://github.com/A-perez2265/BAAMM/commit/dcc4b8f) published the shared acceptance procedure and evidence.

## What changed and why

| Area | Change | Reason and resulting behavior |
| --- | --- | --- |
| MVP policy | Confirmed three starting credits, one credit per settled lesson, deferred video verification and no-payment dispute closure | Removes ambiguity from core business rules and keeps the implementation focused on the professor's requested MVP |
| Registration | Removed the required video input, upload/preview handling and video-link write; made success messaging depend on whether Auth returned a session | Accounts no longer depend on a deferred feature or an upload before email confirmation; users receive accurate next-step instructions |
| Administrator authority | Added the trusted `app_metadata.is_admin` rule to the reproducible upgrade, restricted function access and initialized new profiles as non-admin | Administrator authority comes from trusted backend configuration rather than editable user fields; teacher/learner roles do not confer administration |
| Profile privacy | Added the authenticated `public_profiles` view; kept private profile reads owner-only and limited editable columns | Discovery can show names and portfolios without exposing another member's balance, administrator flag or retained-video link |
| Frontend integration | Updated profile, discovery, exchange and dashboard name reads to use `public_profiles`; surfaced query errors | The application continues working under stricter RLS and reports missing dependencies instead of silently substituting incomplete data |
| Request validation | Database checks the learner, teacher-owned Teacher listing, nonblank message, starting state and available credit | A direct API caller cannot bypass business rules that previously depended on browser behavior |
| Exchange transitions | Restricted normal status changes to the designated teacher; made participants and request identity immutable | Requests cannot be reassigned or advanced directly to completed by changing client payloads |
| Settlement | Guarded fixed one-credit settlement locks the exchange and both profiles in deterministic order, rechecks funds and routes both legacy settlement signatures through the same function | Prevents replay, arbitrary credit amounts, insufficient-funds settlement and conflicting writes from creating partial balance changes |
| Dispute submission | Replaced client-side insert plus exchange update with `submit_skill_dispute`; enforced one active dispute per exchange | Creating the report and blocking confirmation succeed or roll back together; reporter identity is derived by the database |
| Dispute review | Added `review_skill_dispute`, a required explanation and an atomic audit entry; removed independent status/logging writes | A case cannot close successfully without its explanation and history; MVP closure transfers zero credits and cannot reopen the case |
| Interface wording | Removed the unsupported 24–48-hour dispute email promise and explained no-payment closure | User-facing messages now describe implemented behavior without promising an unimplemented notification service |
| Exchange history | Added the skill-history foreign key and deletion guard | A referenced skill cannot be removed in a way that breaks historical exchanges |
| Retained videos | Made the bucket private, retained existing objects, limited reads to uploader/admin and removed known legacy client write policies | Old public delivery no longer bypasses access rules; disabling new uploads matches the deferred-video scope |
| Supabase setup compatibility | Replaced the attempted `ALTER` of platform-owned `storage.objects` with a check that platform RLS is enabled | Fresh setup works with Supabase's managed table ownership instead of relying on permissions the project database role does not hold |
| Automated regression | Added browser smoke/regression/live cases, disposable PostgreSQL checks and real local Supabase API/race/Storage checks | Tests now cover browser behavior, actual backend permissions, transaction rollback and concurrent requests with clearly separated evidence scopes |
| Test accuracy | Corrected fixtures that failed on disallowed ID columns before reaching the intended rule; distinguished live and simulated evidence | A passing or rejected request now supports the intended authorization scenario rather than an unrelated fixture error |
| Development configuration | Added explicit live-test environment templates, isolated Playwright settings, required write opt-in and report generation | Live writes are deliberate; simulated tests cannot accidentally target the shared project |
| Dependencies and CI | Added the testing tools, expanded the default service suite to five modules and automated lint, service, browser, database, audit and production-build checks | Reviewers receive repeatable quality checks; compatible dependency updates removed the high-severity findings observed during implementation |
| Repository hygiene | Ignored credentials, browser authentication state, raw reports, local database state and personal submission artifacts | Shared source and sanitized project evidence can be pushed without publishing private test material |
| Documentation and deployment | Added setup/architecture/security/deployment/testing guides, expected-versus-actual matrices and read-only verification queries | Another developer can understand the system, reproduce documented checks and distinguish deployment configuration from runtime acceptance |

The [file inventory](milestone-3-change-inventory.md) lists every changed file between `8084334` and `dcc4b8f` and explains its purpose. The migration itself groups multiple database changes in one reviewed transaction.

## What was verified

| Environment/check | Recorded result | What the result establishes |
| --- | --- | --- |
| Service/utility modules | Five modules passed | Service validation and query behavior under the documented fixtures |
| Offline browser regression | 24/24 passed | Real UI behavior with simulated backend responses |
| Disposable PostgreSQL | 15/15 passed | SQL setup, grants, RLS, state rules and failure rollback under fixture Auth/Storage schemas |
| Docker-backed Supabase profile/skill API | 15/15 passed | Real local Auth/Data API behavior, owned writes and protected data boundaries |
| Docker-backed Supabase workflow API | 7/7 passed | Actual concurrent settlement, last-credit protection, dispute atomicity and private Storage HTTP behavior |
| Docker-backed browser exchange | Passed | Two ordinary users completed the application workflow and persisted one-credit settlement |
| Shared Supabase deployment | 23/23 catalog checks passed | Reviewed migration installed; expected grants, policies, functions, guards and private bucket present |
| Shared Supabase manual browser | 11/11 checkpoints passed | Existing administrator acting as teacher and dedicated ordinary learner completed listing → discovery → request → acceptance → simulated completion → confirmation → refreshed balances; ordinary learner denied administrator access |
| PR #34 GitHub Actions | Six checks passed; optional manual live job skipped | Reviewed follow-up passed automated CI before merge; a skipped live job is not a runtime pass |
| Published acceptance commit dcc4b8f | Six checks passed; optional manual live job skipped | [Dated CI record](verification/milestone-3-ci-2026-11-03.json) verifies the later published documentation/evidence commit |

In the shared browser test, learner credits changed **3 → 2**, teacher credits changed **1 → 2**, and exactly one matching exchange was `completed`. The reconstructed pretest digest confirmed no other existing member's balance changed. The new learner's normal three-credit allocation increased the shared total from 348 to 351; settlement did not create additional credits.

Sources: [Testing](testing.md), [local verification record](verification/local-supabase-2026-11-03.json), [shared acceptance procedure/results](hosted-acceptance.md) and [shared verification record](verification/hosted-supabase-2026-11-03.json).

## Professor requirements and deliverables

| Requirement | Current evidence | Remaining action |
| --- | --- | --- |
| Functional system with major features | Integrated application and recorded local/shared exchange demonstrations | Rehearse against a chosen environment; public signup/email and recovery delivery still need shared acceptance |
| Updated GitHub repository; every member active | Implementation and acceptance evidence pushed; author history reviewed | Reconcile the fifth member's branch/PR evidence with the submission. Four member identities are represented in reviewed `main`; another member has authored work on a remote dashboard branch. Branch activity is evidence of work, but is not proof of merged contribution |
| Draft documentation including security | README plus architecture/security, scope, deployment and testing documents | Team reviews the instructions and selected business rules; a full hosted restore drill remains unverified |
| Team retrospective | [Evidence-based retrospective draft](milestone-3-retrospective.md) | Hold the discussion, record actual feedback and agree on actions/owners |
| Class presentation: demo and technical discussion | [Demo and technical script](milestone-3-presentation.md), existing slide deck and recorded test evidence | Finalize presentation length/speakers, rehearse and deliver; prepared materials are not evidence of a completed presentation |
| Final MVP scope | Videos deferred; disputes close without payment; three starting credits; fixed one-credit settlement | Team confirms this selected baseline; defer unrelated new features |
| Full workflow | Shared walkthrough reached confirmed settlement and refreshed dashboards | Demonstrate public registration/email separately; the shared teacher was an existing administrator, so do not describe this as two ordinary users |
| Strong authorization | Trusted admin source, private profiles, restricted grants, guarded functions and private bucket | Hosted private-video HTTP and administrator dispute-write checks remain separate; local equivalent cases already passed |
| Documented testing | Matrices include procedures, expected outcomes, actual outcomes, statuses and evidence | Keep future results dated; preserve NOT RUN labels for unexecuted cases |
| Automated quality checks | CI includes lint, service/browser/database tests, dependency audit and production build | Capture the final submission commit's check status; CI does not automatically migrate Supabase or deploy a frontend |

## Submission actions and final-release follow-up

1. Each member links a real commit or PR and confirms the contribution included in the submission. Review unmerged branch work before any merge; do not manufacture activity or alter attribution.
2. Review the selected scope and this report together. Record the retrospective discussion using the separate draft; assign final owners and speakers.
3. Carry public registration/email confirmation, password-recovery delivery and the other unexecuted hosted cases into the final-release refinement plan. Existing local/shared PASS results remain valid within their recorded scope; additional coverage does not require repeating the completed core walkthrough for this documentation package.
4. Rehearse the demo with fresh labeled test records and known starting balances. Prefer Docker-backed test accounts for repeatable classroom rehearsal; a shared run retains real history and transfers a real application credit.
5. Confirm final CI results and collect the report, retrospective, current deck and demo script for submission. Outstanding hosted Storage/concurrency/admin-write/restore checks must remain disclosed unless separately executed.

The implemented core workflow and its recorded tests are complete for this evidence package. Remaining runtime cases are disclosed final-release follow-up. Retrospective validation, contribution reconciliation, rehearsal and classroom delivery require actual team participation before the whole submission/presentation process is complete.
