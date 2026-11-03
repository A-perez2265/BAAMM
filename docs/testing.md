# Testing

## Commands

```sh
npm ci
npm run lint
npm test
npm run test:database
npm run test:e2e:install  # One-time Chromium installation
npm run test:e2e
npm run build
npm audit --audit-level=high
```

`npm test` runs all five service/utility modules. Database tests run repository SQL in disposable PostgreSQL without remote credentials or Docker. Browser regression starts an isolated local server and simulates backend responses. See [Browser testing](browser-testing.md) for configuration and live-test prerequisites.

## Recorded results — November 3, 2026

The table below records the initial implementation verification. Later Docker, CI and shared-database results are recorded in the sections that follow and in [Shared Supabase acceptance](hosted-acceptance.md). Historical NOT RUN entries do not override those later results.

The source baseline is `8084334` with uncommitted implementation changes. Machine-readable verification records include the tested input hashes; the baseline commit alone does not identify those changes.

| Check | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- |
| Static analysis | No ESLint errors | Completed without errors | PASS | `npm run lint` |
| Service/utility regression | All five modules pass | Profiles/skills, recovery, discovery/exchanges, filters and suggestions passed | PASS | [Executable assertions](../tests/discovery-and-exchanges.mjs) and other `npm test` modules |
| Browser regression | Existing UI checks and account/discovery integration pass | 24/24 checks passed with simulated backend | PASS | [Browser verification record](verification/browser-2026-11-03.json) |
| SQL setup, authorization and integrity | Documented SQL order and role/state rules succeed | 15/15 cases passed in disposable PostgreSQL | PASS | [Database verification record](verification/database-2026-11-03.json) |
| Production compilation | Application bundle generated | Build succeeded; bundle exceeds the default size-warning threshold | PASS with warning | `npm run build` |
| Dependency audit | No high/critical findings at CI threshold | Compatible updates removed three high findings; six moderate lint-toolchain findings remain | REVIEW | Registry-backed audit recorded November 3 |
| Workflow configuration | Valid YAML and build dependencies | Parsed locally; references valid lint/test/browser/database jobs | PASS, static only | [CI configuration](../.github/workflows/ci.yml) |
| Hosted end-to-end workflow | Real signup through confirmation and persisted dashboard updates | Not executed in this verification cycle | NOT RUN | [Deployment acceptance](database-deployment.md#post-deployment-verification) |
| Concurrent transactions | Correct simultaneous confirmation/dispute/last-credit outcomes | Separate-session races not executed | NOT RUN | [Database test scope](../tests/database-security.mjs) |
| Hosted email and Storage HTTP | Correct recovery redirects and private object delivery | Not executed in this verification cycle | NOT RUN | [Deployment acceptance](database-deployment.md#post-deployment-verification) |
| GitHub Actions execution for these changes | Required jobs pass on the reviewed PR | Changes have not been pushed; no hosted run is claimed | NOT RUN | [CI configuration](../.github/workflows/ci.yml) |

## Docker-backed Supabase verification

After synchronization to merged `main` at `7e994b9`, the local Supabase upgrade and integration checks passed with the recorded Storage compatibility fix:

| Check | Actual result | Evidence |
| --- | --- | --- |
| Real Auth/Data API profiles and skills | 15/15 passed; generated account cleanup verified | [Local verification record](verification/local-supabase-2026-11-03.json) |
| Exchange/dispute/concurrency/Storage APIs | 7/7 passed, including independent concurrent requests and private HTTP downloads | [Local verification record](verification/local-supabase-2026-11-03.json) |
| Real two-user browser workflow | Listing → discovery → request → acceptance → completion → confirmation → refreshed balances/ledger passed | [Local verification record](verification/local-supabase-2026-11-03.json) |

See [Local Supabase testing](local-supabase-testing.md) for reproducible commands, fixture retention and verification limits. These local results do not change the NOT RUN status of hosted acceptance above.

## Shared Supabase deployment verification

PR #34 merged after six automated CI checks passed; its optional manual live job was skipped. The shared migration completed on November 3, 2026, and all 23 read-only configuration checks passed. Aggregate record counts and the digest of every profile's credit balance matched the pre-upgrade snapshot. The video bucket is private.

The manual two-session shared-backend browser walkthrough also passed all eleven recorded checkpoints. An administrator acted as teacher and a dedicated ordinary learner was denied administrator access. Listing creation, discovery, request, acceptance, simulated completion, learner confirmation, dashboard reloads and sign-out protection succeeded. SQL confirmed one completed exchange, exact one-credit settlement and unchanged balances for other existing profiles.

See [Shared Supabase acceptance](hosted-acceptance.md) for procedures, the expected/actual result matrix and remaining acceptance cases. [Machine-readable evidence](verification/hosted-supabase-2026-11-03.json) records the migration hash and before/after values. Public signup/email, hosted private-video HTTP, hosted concurrency, administrator dispute writes and externally deployed frontend behavior remain outside this run.

## Evidence boundaries

Browser checks run real React components with synthetic sessions and intercepted requests. They establish UI behavior and simulated reload persistence, not real login, RLS, database persistence, credit settlement or production accessibility compliance.

The database suite executes PostgreSQL statements, grants, RLS, triggers and functions. Fixture Auth/Storage schemas and injected claims isolate the test from hosted infrastructure. Failure-injection cases verify rollback of dispute creation and administrator resolution. The runtime uses one connection; it does not establish concurrent-session behavior or real JWT issuance.

Machine records contain scenario expectations, actual assertion outcomes, execution timestamps and input hashes. Raw screenshots, traces, console output and authentication state remain ignored local artifacts. Reports must be inspected and sanitized before publication.

Historical [test-matrix entries](TEST_MATRIX.md) and October reports retain their original execution scope. Code-inspection or inferred rows must not be represented as fresh hosted tests.

## Continuous integration

The workflow runs lint, all service modules, offline browser regression, database security tests, dependency scanning and a production build. Browser and database jobs upload execution evidence. The optional live-security job requires a manual dispatch, a dedicated `supabase-test` environment and test-specific secrets. It creates records and must not target the shared environment as a routine check.
