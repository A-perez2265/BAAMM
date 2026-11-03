# Browser testing

## Offline regression

```sh
npm run test:e2e:install  # One-time Chromium installation
npm run test:e2e         # Five smoke checks and nineteen regression checks
npm run test:e2e:profiles # Regression project
npm run test:e2e:report  # Local HTML report
```

The runner starts an isolated application server at `http://127.0.0.1:4178` and refuses to reuse another server. Offline configuration uses placeholder credentials, synthetic sessions and intercepted backend requests. External requests are blocked. These tests do not create real accounts or modify hosted Supabase.

Smoke checks cover signed-out redirects, labelled login controls, HTML email validation and mobile overflow. Regression checks cover profile/skill forms, simulated persistence after reload/navigation, error recovery, duplicate submission controls, public-text validation, UI ownership, registration messaging, administrator denial and search behavior.

Simulated persistence does not establish real login, database persistence, RLS or credit integrity. [Database tests](testing.md) exercise SQL separately.

Sources: [profile/skill scenarios](../tests/e2e/profile-skills.spec.js), [account/discovery scenarios](../tests/e2e/account-and-discovery.spec.js), [network fixture](../tests/e2e/fixtures/mock-supabase.js).

## Generated reports

Each run generates ignored local artifacts:

- `playwright-report/`: HTML report, screenshots and failure traces.
- `test-results/browser-run/`: raw runner output.
- `test-results/browser-matrix.md` and `.json`: actual results, expectations, timestamps and base commit.
- `test-results/browser-evidence/`: synthetic request summaries and checkpoint screenshots.

The base commit alone does not identify uncommitted source. Recorded project results include source hashes where available. Traces can contain credentials or authentication state; inspect reports before sharing. Raw reports and screenshots are not repository source files.

## Live workflow

Use a dedicated Supabase test project and two confirmed ordinary accounts. The learner requires at least one credit. Install the schema and [hardening migration](database-deployment.md) first. Do not use service-role keys, administrator credentials or shared team accounts for browser tests.

```sh
cp .env.e2e.example .env.e2e.local
# Configure dedicated test-project URL/public key and ordinary accounts.
# Enable E2E_CONFIRM_DATA_WRITES=yes only for an authorized test workflow.
npm run test:e2e:live
```

Live execution requires explicit dedicated credentials and data-write opt-in. Missing configuration fails before the server starts; a skipped live test is not a pass. Normal application environment files are not used for live-test configuration.

The test creates a Teacher listing, discovers it as the learner, sends a request, accepts and marks completion as the teacher, confirms as the learner and checks persisted dashboard balance/ledger changes. It starts with existing accounts and does not verify signup, email delivery, real instruction, disputes or simultaneous requests.

Runs use one worker and no automatic retry because confirmation spends a credit. Listings, exchanges and credit changes remain as test-environment audit history. Listings referenced by exchanges cannot be removed through the MVP. Authorize fixture retention and any environment reset before execution.

The live workflow has not been executed against hosted Supabase in the recorded results. See [Testing](testing.md) for actual results and verification limits.
