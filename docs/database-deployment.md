# Database setup and deployment

Last updated: November 3, 2026.

## Fresh Supabase project

The [README](../README.md#step-3--configure-the-database) specifies the SQL setup order. `base_schema.sql` defines the MVP schema for an empty project; it is not a complete export of an existing hosted environment. Auth URL settings, email confirmation and Storage configuration require environment-specific verification.

`npm run test:database` executes the documented setup order in disposable PostgreSQL with fixture Auth/Storage schemas. It does not connect to hosted Supabase.

## Existing project upgrade

[supabase/mvp_security_hardening.sql](../supabase/mvp_security_hardening.sql) requires profiles, skills, exchanges, disputes, dispute actions and the avatar column. Do not replay the fresh-project base script into an existing database.

The migration runs in one transaction and:

- Uses trusted `app_metadata.is_admin` for administrator authorization and initializes new profiles as non-admin.
- Makes the retained-video bucket private and replaces known legacy policies with uploader/administrator read access without deleting objects.
- Replaces policies and client grants on profiles, skills, exchanges, disputes and dispute actions. `public_profiles` exposes approved display fields; private profile reads remain owner-only.
- Restricts direct exchange changes to authorized teacher transitions and preserves skill references in exchange history.
- Implements fixed one-credit settlement with exchange/profile locks and delegates legacy settlement functions to the same guarded function.
- Creates atomic dispute submission and administrator review/closure functions with required explanations and audit entries.

The frontend requires `public_profiles`, `submit_skill_dispute` and `review_skill_dispute`. Apply and verify the migration before deploying the paired frontend.

## Preflight

Export schema, functions, grants, policies and trigger definitions. Confirm a recoverable backup and validate the upgrade in a dedicated environment. Inspect administrator metadata and session-refresh requirements.

Run these read-only integrity checks before migration:

```sql
select id, public from storage.buckets where id = 'verification-videos';
select policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects';
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
  and tablename in ('profiles','skills','exchanges','disputes','dispute_actions');
select count(*) as orphan_skill_references
from public.exchanges e left join public.skills s on s.id=e.skill_id
where e.skill_id is not null and s.id is null;
select count(*) as duplicate_active_dispute_groups
from (select exchange_id from public.disputes
      where status in ('open','under_review')
      group by exchange_id having count(*) > 1) duplicates;
select count(*) as missing_participant_profiles
from public.exchanges e
left join public.profiles l on l.id=e.learner_id
left join public.profiles t on t.id=e.teacher_id
where l.id is null or t.id is null;
```

Resolve nonzero counts before deployment. Do not delete history or modify balances to bypass migration failures. Review unrecognized permissive storage policies applying to the video bucket; this migration removes only known legacy policies and does not alter unrelated buckets.

Inspect existing views, function ownership/execution grants, role memberships and sensitive-profile triggers. A passing local test does not establish hosted parity.

## Post-deployment verification

1. Verify users cannot assign administrator authority, modify balances or access another member's private profile.
2. Confirm public profiles, search teacher names, owned profile edits and skill management work through the application.
3. Complete an exchange and verify exact balance changes after dashboard reload.
4. Verify disputes block confirmation, closure records an explanation, balances remain unchanged and reopening is rejected.
5. Test simultaneous confirmation, competing last-credit settlements and dispute-versus-confirmation races using separate sessions.
6. Verify old public video URLs are denied, authorized private reads succeed and unrelated reads are denied over HTTP.
7. Record migration hashes, environment, expected/actual results and sanitized evidence.

The migration has been executed in disposable PostgreSQL tests and applied to Docker-backed local Supabase. [Real local API/browser checks](verification/local-supabase-2026-11-03.json) passed, including concurrent settlements and Storage HTTP access. Hosted application, storage HTTP, email and concurrent-session acceptance have not been completed in the recorded November 3 results. Read-only inspection found trusted admin/signup definitions and the confirmation RPC installed, while the retained-video bucket was public. These observations describe configuration rather than hosted runtime certification.

## Recovery

A failure before commit rolls back the migration. After commit, use a reviewed forward correction or the environment's verified recovery process. Restoring editable-metadata administrator checks or public video access would reintroduce known security weaknesses.
