# SkillSwap - Local Supabase Integration Testing

**Last Updated:** 2026-10-20  
**Scope:** Profiles and skill management.  
**Outcome:** 14 PASSED; 1 AUTHORIZATION FAILURE

---

## Section 1 — Environment

The suite uses Node.js assertions and `@supabase/supabase-js` against Docker-hosted PostgreSQL, Auth, and Data API services. Tests authenticate as ordinary users; the service-role client is restricted to fixture cleanup.

The snapshot includes two tables, constraints, seven RLS policies, avatar selections, signup provisioning, public-text validation, and sensitive-field protection. Definitions were inspected through read-only dashboard access. No hosted records were copied or modified.

Hosted grants, function permissions, configuration, and ownership were not fully exported. Local grants are explicit; function configuration follows repository SQL. Exchanges, disputes, reviews, notifications, and storage are excluded. Results do not establish full parity with the hosted project.

---

## Section 2 — Execution

Requires Docker Desktop, the installed Supabase CLI, and the existing local schema installation. From the repository root:

```bash
./node_modules/.bin/supabase start --workdir .local-supabase -x logflare,vector,edge-runtime,imgproxy,supavisor
node tests/profile-and-skills.live.mjs
```

The script accepts only `http://127.0.0.1:54321` and reads credentials from the ignored `.local-supabase/runtime.json`. To refresh those credentials:

```bash
umask 077
./node_modules/.bin/supabase status --workdir .local-supabase -o json > .local-supabase/runtime.json
```

Outputs: `test-results/profile-skills-live/latest.md` and `latest.json`. Failed assertions, incomplete execution, and cleanup errors produce a nonzero exit status. Three generated accounts are removed after execution; profile and skill deletion is verified.

Studio: `http://127.0.0.1:54323`. Stop services while retaining local data:

```bash
./node_modules/.bin/supabase stop --workdir .local-supabase
```

The schema and provenance files remain in ignored `.local-supabase/`. A fresh checkout requires that snapshot separately; the suite is not configured for CI. Application environment files retain their existing connection settings.

---

## Section 3 — Authorization Finding

`LIVE-PRF-08` reproduced an administrator-classification defect: after setting editable Auth metadata to `is_admin: true` and refreshing the session, `public.is_admin()` returned `true`. Signup correctly initializes the profile admin flag to `false`, but the inspected admin-check function also trusts user metadata.

Privilege decisions should use administrator-controlled data. A fix and hosted verification remain pending; neither application authorization nor shared database policies were changed.

Evidence: [local integration results](profile-skill-live-results.md) and [mocked regression results](profile-skill-regression-results.md).
