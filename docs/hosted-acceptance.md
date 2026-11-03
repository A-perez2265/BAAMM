# Shared Supabase deployment and browser acceptance

Date: November 3, 2026. Application baseline: `b97170d57a5ba63034211d40cd37a2aa785b6b59`.

## Completed deployment verification

[PR #34](https://github.com/A-perez2265/BAAMM/pull/34) merged after six automated checks passed; the optional manual live job was skipped. The existing shared database was upgraded using only `supabase/mvp_security_hardening.sql`. Fresh-project setup scripts were not replayed.

Migration SHA-256: `93b0953e27a75e3d8253cdfc0afd697bc0d19f32697f993e78d801eea1331748`.

### Procedure

1. Validate the migration against Docker-backed Supabase. Run the real API, concurrent-request, private Storage HTTP and two-user browser checks described in [Local Supabase testing](local-supabase-testing.md).
2. Export the affected hosted schema, function, grant, policy and trigger definitions to ignored local storage. This definition snapshot is not a full database backup or a verified point-in-time recovery service.
3. Run the existing-project [preflight](database-deployment.md#preflight). Check for orphan skill references, duplicate active disputes, missing participant profiles and invalid credit balances. Review existing Storage policies.
4. Record aggregate table counts, total credits and a deterministic digest of profile IDs and balances. Retain no member names, email addresses, tokens or passwords in repository evidence.
5. Paste the reviewed migration into the shared project's SQL Editor. Verify the editor text matches the file exactly, execute the transaction and confirm the success result.
6. Run [the read-only verification query](../tests/hosted-deployment-checks.sql) in SQL Editor. Compare its data-integrity output with the pre-upgrade snapshot and inspect profile and Storage policy predicates.
7. Record actual results in [the sanitized verification record](verification/hosted-supabase-2026-11-03.json). Keep raw screenshots and schema exports in ignored local storage.

### Results

| Scenario | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- |
| Existing-project preflight | No incompatible references, duplicate active disputes, missing participants or invalid balances | All four integrity counts were zero | PASS | Pre-upgrade read-only inspection |
| Migration transaction | Reviewed upgrade commits without errors | SQL Editor reported success | PASS | Migration hash and verification timestamp in the verification record |
| Security configuration | All 23 catalog assertions succeed | 23/23 passed | PASS | `checks` in the verification record; reproducible SQL query |
| Profile visibility | Owner-only private profile policies; authenticated safe display projection | Both owner predicates and the six-field projection verified | PASS, configuration | `profile_policies` and projection assertion |
| Privileged writes | Clients cannot directly change credits, administrator flags, exchange identities or dispute audit state | Corresponding column/table grants denied | PASS, configuration | Permission assertions |
| Settlement and dispute procedures | Reviewed RPCs are owned by `postgres`, use definer execution and deny anonymous execution | All three RPCs met the assertions | PASS, configuration | RPC owner and permission assertions |
| Video access | Bucket private; uploader/administrator reads only; legacy writes removed | Bucket private; two equivalent restrictive read policies remain; legacy insert/update/delete policies absent | PASS, configuration | `storage_policies` and Storage assertions |
| Data preservation | Counts and every profile balance unchanged by migration | 117 profiles, 120 skills, 121 exchanges, 18 disputes, 14 audit actions; 348 total credits; balance digest unchanged | PASS | `data_integrity` and `data_unchanged` in verification record |

Catalog checks establish installed configuration. They do not establish successful browser requests, email delivery, signed URL behavior or hosted concurrency under real sessions.

## Shared-backend browser walkthrough

The application at `http://127.0.0.1:5174` uses the shared Supabase backend. The preview at port `5173` uses Docker-backed local Supabase. Neither local origin proves that an externally hosted frontend has been deployed.

For a full ordinary-user acceptance run, use two confirmed ordinary test accounts, with at least one credit in the learner account. Enter passwords directly into the browser. Do not place credentials in documentation or screenshots. The test listing, exchange and one-credit transfer remain as shared audit history; do not reset balances or delete historical exchanges to conceal the test.

In this manual run, the first supplied account has administrator authority. It acts as the teacher for the exchange, and the administrator page loaded through the server-side gate. No existing dispute was modified. A dedicated learner account was created through Supabase Authentication with email auto-confirmed; its login succeeded, its profile received three credits, and it was denied administrator access. This administrative account setup does not verify public registration or email delivery. Credentials remain in ignored local storage.

The teacher uses `http://localhost:5174` and the learner uses `http://127.0.0.1:5174`. These distinct origins keep browser authentication storage separate while both application sessions use the same shared Supabase backend.

| ID | Procedure | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| HOST-01 | Sign in with the supplied teacher account; open and reload the dashboard | Authenticated dashboard loads with persisted balance and no data-loading error | Administrator account signed in; reload showed balance 1, earned 7 and spent 9 | PASS |
| HOST-02 | Open profile, My Skills and discovery; reload each | Owned profile and skills load; discovery shows teacher listings and public names | Owned profile and four skills persisted; 116 discoverable teacher listings and public names loaded | PASS |
| HOST-03 | Attempt `/admin` as an ordinary member | Access denied without granting administrator privileges | Dedicated learner redirected to the dashboard; administrator dispute content did not render | PASS |
| HOST-AUTH | Create a dedicated learner through Supabase Authentication and sign in | Confirmed account can authenticate and receives the standard initial profile balance | Real sign-in succeeded; three credits provisioned without a manual balance grant | PASS |
| HOST-ADMIN | Open `/admin` with the supplied administrator account | Server-side administrator gate permits the existing administrator | Dispute records loaded; no administrator write action performed | PASS |
| HOST-04 | As teacher, create a clearly labeled test skill and reload | Listing persists with the teacher as owner | `Acceptance Test Guitar QLNRFA` saved and survived reload | PASS |
| HOST-05 | As learner, find that listing and send a request | Request is created once and appears as pending | Success message shown; matching pending exchange survived dashboard reload; learner balance remained 3 | PASS |
| HOST-06 | As teacher, accept the request and mark the simulated lesson completed | Status moves through accepted to awaiting learner confirmation | Accepted state persisted after reload; Mark as Complete moved the lesson to Waiting on learner | PASS |
| HOST-07 | As learner, confirm completion once | Exchange becomes completed; learner loses one credit and teacher gains one | Confirmation succeeded; learner 3 → 2 and teacher 1 → 2; confirmation control remained absent after reload | PASS |
| HOST-08 | Reload both dashboards and inspect persisted exchange state | Final status, balances and corresponding ledger totals persist | Learner balance 2 / spent 1; teacher balance 2 / earned 8. SQL found one matching completed exchange; combined balance remained 4 | PASS |
| HOST-09 | Sign out and revisit a protected route | Login gate appears without protected account content | Protected `/profile` visits redirected to `/login` without profile content, including an ordinary-learner check after settlement | PASS |

All eleven recorded browser checkpoints passed, including the separately recorded administrator and account-setup checks. This run used an administrator acting as teacher and an ordinary learner; it does not establish a two-ordinary-account workflow.

### Settlement evidence and retained fixtures

The [read-only settlement query](verification/hosted-settlement-2026-11-03.sql) returned one matching exchange in `completed` status and balances of two credits for each participant. The query reconstructed the pretest balance digest by excluding the new learner and subtracting the single expected teacher credit. That digest matched the pre-upgrade snapshot, establishing that no other existing profile balance changed during this run.

The account trigger added three starting credits for the new learner, so the shared total increased from 348 to 351. Settlement transferred one existing credit and did not increase that total. The retained fixtures are one learner account, one labeled teacher listing and one completed exchange. The initial deployment data-preservation counts above describe the snapshot before these explicitly authorized test writes.

A visually verified [learner ledger screenshot](verification/hosted-learner-ledger-2026-11-03.jpg) is included as sanitized project evidence. It shows earned credits remaining zero and spent credits increasing to one after settlement and dashboard reload. Raw checkpoints and credentials remain in ignored local storage. The [verification record](verification/hosted-supabase-2026-11-03.json) contains numerical before/after values and actual checkpoint outcomes without personal account details.

Record each step's actual outcome and a sanitized checkpoint reference. Stop on a failed prerequisite and mark dependent steps blocked rather than passed. Do not reuse a completed exchange to simulate a fresh settlement. Signing in with existing accounts does not verify registration or email confirmation.

Administrator dispute writes, public signup/email delivery, private-video HTTP authorization and simultaneous hosted requests require separate acceptance cases. Local API/browser results are documented separately and must not be relabeled as shared-backend results. An externally hosted frontend deployment was not tested.
