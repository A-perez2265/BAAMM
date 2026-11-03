# Local Supabase integration testing

## Environment

These tests target Docker-backed Supabase at `http://127.0.0.1:54321`. The runners reject hosted URLs and read credentials only from ignored local runtime configuration. The ordinary clients exercise Auth, Data API and Storage through actual local services. The service-role client is limited to fixture provisioning, test-administrator metadata, readback and maintenance operations.

Docker Desktop and the repository's Supabase CLI dependency are required. For an existing configured workspace:

```sh
./node_modules/.bin/supabase start --workdir .local-supabase -x logflare,vector,edge-runtime,imgproxy,supavisor
umask 077
./node_modules/.bin/supabase status --workdir .local-supabase -o json > .local-supabase/runtime.json
```

For a new workspace, initialize `.local-supabase` with the CLI and follow the [fresh database setup](../README.md#step-3--configure-the-database). An existing instance requires schema inspection before applying setup SQL. Do not reset a database or delete its volumes to bypass migration failures.

Storage's `storage.objects` table is managed by Supabase. Setup verifies that its RLS is already enabled instead of attempting to alter the managed table. Fixture PostgreSQL tests explicitly model that platform default.

## Profile and skill checks

```sh
node tests/profile-and-skills.live.mjs
```

The suite signs up three synthetic ordinary accounts, signs in through local Auth and verifies profile ownership, protected fields, skill ownership, validation and metadata-based administrator denial. It removes its generated accounts and verifies cleanup. No exchange history is created by this suite.

Reports are generated in `test-results/profile-skills-live/` and remain ignored. [The recorded November 3 run](verification/local-supabase-2026-11-03.json) passed all 15 cases with verified cleanup.

## Exchange, dispute, concurrency and Storage checks

```sh
node tests/local-supabase-workflow.mjs
npm run test:e2e:live
```

The API runner creates separate synthetic fixtures for teacher, learner, reporting participant, trusted administrator and the browser workflow. It verifies:

- Real signup/login and denial of editable-metadata administrator escalation.
- Safe public profiles and isolation of private balances.
- Fixed one-credit settlement and sequential replay denial.
- Five independent concurrent confirmation requests with one successful settlement.
- Competing exchanges spending the final learner credit with one settlement and no negative balance.
- Participant reporting, administrator authorization, required audit history and closure without payment.
- A concurrent confirmation/reporting race with one valid outcome.
- Denial of public Storage delivery, permitted uploader/admin downloads and unrelated-user denial.

The runner writes local browser credentials to ignored `.env.e2e.local` and refuses to replace unrelated existing configuration. The browser test then uses independent teacher and learner contexts to create/discover a listing, request/accept/mark completion, confirm and verify exact persisted dashboard/ledger changes.

Fixture accounts, exchange/dispute history and the retained test object remain in the local environment. Private credential files and raw reports are stored under ignored `.local-deliverables/supabase-tests/`. Do not commit them. Resetting or deleting retained fixtures requires a separate cleanup decision.

## Recorded results and limits

The [November 3 record](verification/local-supabase-2026-11-03.json) reports 15/15 profile/skill API cases, 7/7 workflow API cases and one complete browser workflow. It includes source hashes, environment, expected/actual results and before/after browser balances. These results apply to merged commit `7e994b9` plus the recorded uncommitted compatibility/test changes.

The test environment was upgraded from an existing local profile/skill snapshot. It is not a complete export of hosted configuration. Results do not certify hosted grants, actual email delivery, production deployment or exhaustive stress/load behavior. Browser signup is not part of the exchange scenario; signup is exercised separately through the real local Auth API.

The [October snapshot report](profile-skill-live-results.md) remains historical evidence of the earlier metadata defect. Its failure is superseded for the tested local configuration by the November 3 regression result; hosted acceptance remains separate.
