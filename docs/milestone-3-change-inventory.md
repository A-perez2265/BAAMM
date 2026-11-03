# Milestone 3 file change inventory

Date: November 3, 2026. Comparison: `8084334` → `dcc4b8f`. These 50 files cover the implementation, local integration follow-up and shared acceptance evidence. The later milestone submission documents are outside this comparison. See [the overview](milestone-3-overview.md) for the behavior-level explanation.

| File | What changed and why |
| --- | --- |
| [.env.e2e.example](../.env.e2e.example) | Empty dedicated-account settings and explicit live-write opt-in support intentional live tests without publishing credentials. |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Adds browser/database jobs and evidence artifacts, runs all five service modules, gates build on regressions and confines live writes to a manual test environment. |
| [.gitignore](../.gitignore) | Excludes environment secrets, raw reports/auth state, local database state and personal submission artifacts. |
| [README.md](../README.md) | Documents prerequisites, environment setup, fresh-project SQL order and application/test commands for new developers. |
| [docs/MVP_SCOPE.md](MVP_SCOPE.md) | Reconciles the selected credit, no-video and no-payment-dispute rules; distinguishes requirements from implementation acceptance. |
| [docs/TEST_MATRIX.md](TEST_MATRIX.md) | Labels historical/inferred results so older evidence is not mistaken for a fresh hosted test. |
| [docs/admin-auth-security-fix.md](admin-auth-security-fix.md) | Identifies the administrator-authentication report as historical and links current security guidance. |
| [docs/architecture-and-security.md](architecture-and-security.md) | Explains components, data boundaries, transactions, implemented safeguards and test limits. |
| [docs/browser-testing.md](browser-testing.md) | Documents isolated offline/live procedures, fixture retention and separate shared manual acceptance. |
| [docs/database-deployment.md](database-deployment.md) | Separates fresh setup from existing-project migration and records preflight, postchecks and deployment limits. |
| [docs/hosted-acceptance.md](hosted-acceptance.md) | Records the actual shared migration/browser procedures, expected/actual outcomes, retained fixtures and remaining cases. |
| [docs/local-supabase-testing.md](local-supabase-testing.md) | Supplies Docker-backed reproduction commands, fixture handling and observed real API/browser results. |
| [docs/profile-skill-live-results.md](profile-skill-live-results.md) | Adds the successful local rerun while preserving the dated scope of older results. |
| [docs/profile-skill-security.md](profile-skill-security.md) | Explains safe profile reads, ownership, restricted columns, history protection and corresponding tests. |
| [docs/public-text-privacy.md](public-text-privacy.md) | Updates current scope/security references without overstating contact-pattern detection. |
| [docs/testing.md](testing.md) | Consolidates commands, dated results, CI coverage and simulated/local/shared evidence distinctions. |
| [docs/verification/browser-2026-11-03.json](verification/browser-2026-11-03.json) | Publishes sanitized per-scenario offline browser expectations, results and source hashes. |
| [docs/verification/database-2026-11-03.json](verification/database-2026-11-03.json) | Records SQL authorization/transaction results and updated input hashes after the Storage setup correction. |
| [docs/verification/hosted-learner-ledger-2026-11-03.jpg](verification/hosted-learner-ledger-2026-11-03.jpg) | Supplies a visually reviewed learner ledger crop without account names, credentials or private records. |
| [docs/verification/hosted-settlement-2026-11-03.sql](verification/hosted-settlement-2026-11-03.sql) | Reproduces read-only settlement/count/balance-conservation checks for the retained shared fixture. |
| [docs/verification/hosted-supabase-2026-11-03.json](verification/hosted-supabase-2026-11-03.json) | Records 23 catalog checks, eleven shared browser checkpoints, before/after balances and explicit limits. |
| [docs/verification/local-supabase-2026-11-03.json](verification/local-supabase-2026-11-03.json) | Records real local Auth/API, concurrent settlement, Storage HTTP and browser outcomes with source hashes. |
| [eslint.config.js](../eslint.config.js) | Excludes generated browser binaries and reports from source linting. |
| [package-lock.json](../package-lock.json) | Locks compatible dependency updates and added test/runtime tools for reproducible installs. |
| [package.json](../package.json) | Adds browser/database commands and tools; expands the default service regression to five modules. |
| [playwright.config.js](../playwright.config.js) | Separates smoke/regression from explicitly configured live runs with isolated servers and evidence reporting. |
| [src/components/Auth.jsx](../src/components/Auth.jsx) | Displays the registration callback's accurate session/email-confirmation message. |
| [src/components/DisputeModal.jsx](../src/components/DisputeModal.jsx) | Uses transactional submission, lets the server derive identities and removes unsupported email-response promises. |
| [src/components/Register.jsx](../src/components/Register.jsx) | Removes verification-video selection/upload and handles signup session/confirmation behavior without clearing failed input. |
| [src/pages/AdminDashboard.css](../src/pages/AdminDashboard.css) | Styles the required review/closure explanation field. |
| [src/pages/AdminDashboard.jsx](../src/pages/AdminDashboard.jsx) | Uses atomic review, requires an explanation, prevents repeated in-flight actions and reports saved audit outcomes. |
| [src/pages/DashboardPage.jsx](../src/pages/DashboardPage.jsx) | Retrieves display names through the safe view under stricter private-profile RLS. |
| [src/services/discoveryService.js](../src/services/discoveryService.js) | Uses the safe view for teacher names instead of cross-user reads from private profiles. |
| [src/services/exchangeService.js](../src/services/exchangeService.js) | Uses safe participant names and propagates lookup failures instead of silently hiding missing data. |
| [src/services/profileService.js](../src/services/profileService.js) | Uses the public profile projection while retaining avatar-column compatibility handling. |
| [supabase/base_schema.sql](../supabase/base_schema.sql) | Provides a minimal fresh-project schema so the documented setup has a reproducible starting point. |
| [supabase/disputes_and_verification.sql](../supabase/disputes_and_verification.sql) | Makes fresh-setup video storage private, removes deferred writes, initializes non-admin/no-video profiles and checks platform-owned Storage RLS without unsupported ALTER. |
| [supabase/mvp_security_hardening.sql](../supabase/mvp_security_hardening.sql) | Adds the transactional upgrade for trusted admin authority, safe profiles/grants, state guards, settlement, atomic disputes, private retained videos and history preservation. |
| [tests/database-security.mjs](../tests/database-security.mjs) | Adds disposable PostgreSQL assertions for setup, authorization, state rules, replay and injected-failure rollback; fixtures enable platform-equivalent Storage RLS. |
| [tests/discovery-and-exchanges.mjs](../tests/discovery-and-exchanges.mjs) | Updates mocks/assertions for safe profile reads and service error propagation. |
| [tests/e2e/account-and-discovery.spec.js](../tests/e2e/account-and-discovery.spec.js) | Checks account messaging/input recovery, ordinary-user administrator denial and discovery controls with simulated responses. |
| [tests/e2e/evidence-reporter.js](../tests/e2e/evidence-reporter.js) | Generates result artifacts and correctly identifies live versus simulated runs. |
| [tests/e2e/exchange.live.spec.js](../tests/e2e/exchange.live.spec.js) | Adds the real two-session listing-to-confirmation workflow with persisted balance/ledger assertions and fixture retention. |
| [tests/e2e/fixtures/mock-supabase.js](../tests/e2e/fixtures/mock-supabase.js) | Supplies deterministic synthetic Auth/API state and blocks external requests for offline regression. |
| [tests/e2e/profile-skills.spec.js](../tests/e2e/profile-skills.spec.js) | Checks profile/skill forms, simulated persistence, validation, ownership and error recovery in the UI. |
| [tests/e2e/smoke.spec.js](../tests/e2e/smoke.spec.js) | Checks signed-out routing, login labels, browser validation and mobile overflow. |
| [tests/hosted-deployment-checks.sql](../tests/hosted-deployment-checks.sql) | Reproduces read-only catalog/data-integrity checks for the shared migration. |
| [tests/local-supabase-workflow.mjs](../tests/local-supabase-workflow.mjs) | Adds actual local API races, last-credit protection, atomic dispute/audit checks and private Storage HTTP authorization. |
| [tests/profile-and-skills.live.mjs](../tests/profile-and-skills.live.mjs) | Corrects fixtures so protected-ID errors do not mask intended RLS/validation assertions; handles permitted errors and contact-filter-safe synthetic values. |
| [tests/profile-and-skills.mjs](../tests/profile-and-skills.mjs) | Aligns service mocks with the safe profile read boundary. |
