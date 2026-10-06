# Team integration check

## Repeat local checks

Run `npm run lint`, `npm test`, and `npm run build`.

The automated service tests simulate Supabase. They verify profile and skill saves, password recovery, discovery filtering, request validation, teacher/status guards, and the confirmation function's arguments and error handling. They do not prove that the deployed database has the expected schema, policies, or function.

## Confirm Supabase setup

Inspect the existing database before applying SQL:

- `exchanges` must support the app statuses: pending, declined, accepted, session_completed, awaiting_confirmation, completed, issue_reported.
- `confirm_skill_exchange` must accept `p_exchange_id uuid`, validate the signed-in learner, and atomically subtract one credit from the learner, add one to the teacher, and set the exchange to completed.
- The exchange status migration is in `supabase/disputes_and_verification.sql`; the app confirmation RPC is in `supabase/confirm_skill_exchange.sql`. The older base `supabase/exchanges.sql` has fewer statuses; applying only that base file is insufficient.
- The profile avatar and public text privacy SQL are separate migrations.

Apply `supabase/confirm_skill_exchange.sql` in the Supabase SQL Editor before testing the updated app. It adds a uniquely named RPC, preserves both legacy complete_exchange overloads, grants authenticated users execution, and requests a schema reload.

Confirmation now calls the uniquely named one-argument function in the repo. A missing or failing function must produce an error, rather than marking an exchange complete without transferring credits.

## Live check with two authorized test accounts

1. Sign in as a teacher. Save a profile and create a Teacher skill listing.
2. Sign in as a learner with at least one credit. Confirm the listing appears on Search and the dashboard, and their own listings do not.
3. Filter by a matching title or tag; try a nonmatching query and Clear search. Choose a popular tag using both the mouse and Tab/Enter.
4. Select Request Exchange. Confirm the matching skill's form opens. Cancel, reopen, and send a message.
5. Sign in as the teacher. Confirm the request appears on the dashboard and inbox. Accept it, then mark it complete from the inbox.
6. Sign in as the learner. Confirm the exchange, then verify the learner lost exactly one credit and the teacher gained exactly one. Refresh both dashboards and check the ledger and exchange status.
7. Try a separate declined request. Confirm it disappears from both pending requests and active exchanges on the teacher's dashboard.
8. Test empty messages and zero-credit requests. Confirm an error appears and no request is created.


The security suite uses the same confirmation RPC as the app and performs live database writes. Run it with test accounts after applying the required migrations.
