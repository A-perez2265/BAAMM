# Removing skills while preserving exchanges

## Behavior

Remove permanently deletes a skill with no exchange references. If any exchange
references the skill, Remove archives it instead. Archived skills disappear from
active portfolios, discovery and request listings. New exchange requests are
rejected by the database, including requests sent directly to the API.

Existing pending, accepted and completed exchanges retain their skill details.
Existing exchanges can continue through their normal lifecycle. Removing a skill
does not cancel an exchange or change either participant's credits. There is no
restore interface in this change.

## Apply in Supabase

1. Open the intended Supabase project and confirm it already has the November 3
   `mvp_security_hardening.sql` migration. Use the project's normal backup process
   before schema changes.
2. Open SQL Editor and create a new query.
3. Paste the entire contents of `supabase/skill_archiving.sql`, including `begin`
   and `commit`, and run it once. The file can also be reapplied safely.
4. Confirm the query succeeds. It adds `public.skills.archived_at`, the
   authenticated owner-only `public.remove_skill(uuid)` RPC and an insert trigger
   rejecting requests for archived skills. It preserves existing skill rows,
   exchange history, balances and deletion protections.
5. Restart the local frontend with `npm run dev` and refresh the browser. Apply
   this migration before serving the updated frontend: its active-list queries
   require the new column and Remove requires the new RPC.

Do not rerun the base schema or the old hardening migration on the shared project.
For a new project, follow the README setup order, with `skill_archiving.sql` last.
Do not remove the exchange foreign key or history-protection trigger.

## Verification

Run `npm test`, `npm run test:database`, `npm run test:e2e`, `npm run lint` and
`npm run build`. Database tests use disposable PostgreSQL; browser regression uses
simulated responses. These commands do not apply the migration to shared Supabase.

After migration, use your own labeled test listings to verify:

- Removing an unused skill deletes it.
- Removing a skill linked to an exchange reports that history is preserved.
  Reload My Skills, the profile, discovery and request listings: it stays hidden.
- Existing exchanges still display their skill details and support normal actions.
- A new request for the archived skill fails, even from an old page.
- Removal cannot target another user's skill.

Record actual outcomes separately from local automated results.

## Local results — November 17, 2026

| Check | Result |
| --- | --- |
| Service and utility tests (`npm test`) | PASS |
| Disposable PostgreSQL (`npm run test:database`) | 16/16 PASS |
| Offline browser regression (`npm run test:e2e`) | 25/25 PASS |
| ESLint (`npm run lint`) | PASS |
| Production build (`npm run build`) | PASS; existing bundle-size warning remains |

The archive database case checks ownership, direct archive-column protection,
repeat removal, rejection of new requests, retained historical details, completion
of an existing exchange after archiving, deletion of unused skills and anonymous
RPC denial. Browser coverage checks removal messages and persistence across reload,
profile, search and request pages. Concurrent removal/request races were not
executed by these single-connection database tests. These automated checks did
not modify or test the shared Supabase project.

## Manual follow-up — November 17, 2026

Mallory reported applying the migration in Supabase and successfully testing
skill removal through the local app. This confirms the reported removal check;
the other shared-environment verification cases above are not recorded as run.
