# SkillSwap - Profile and Skill Integration Test Matrix

**Last Updated:** 2026-10-20  
**Integration Suite Run:** 2026-10-20 at 20:04:34 UTC  
**Environment:** Local Supabase (`http://127.0.0.1:54321`)  
**Outcome:** 14 PASSED; 1 FAILED

> [!NOTE]
> Evidence comes from authenticated API requests in [profile-and-skills.live.mjs](../tests/profile-and-skills.live.mjs). IDs identify executable cases. Generated reports are stored locally in `test-results/profile-skills-live/`. This scoped database reproduction does not certify hosted permissions.

---

## Section 1 — Profile Persistence & Protection

| ID | Requirement / Scenario | Expected Result | Actual Result | Pass/Fail | Supporting Evidence |
|---|---|---|---|---|---|
| LIVE-PRF-01 | Signup provisions distinct non-admin profiles with three credits | Distinct profiles; 3 starting credits; administrator flag false | Three distinct profiles; balance = 3; is_admin = false. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-01` |
| LIVE-PRF-02 | Own profile changes persist on a separate read | Saved display name and bio persist on reread | Updated display name and bio returned on reread. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-02` |
| LIVE-PRF-03 | Cross-user profile update is denied and preserves the target row | Unauthorized update denied; target row unchanged | No unauthorized rows updated; target profile unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-03` |
| LIVE-PRF-04 | Ordinary user cannot change own credits_balance | Balance update rejected; original balance preserved | Update rejected by sensitive-field trigger; profile unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-04` |
| LIVE-PRF-05 | Ordinary user cannot change own is_admin | Admin flag update rejected; original flag preserved | Update rejected by sensitive-field trigger; profile unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-05` |
| LIVE-PRF-06 | Duplicate username is rejected without modifying the profile | Unique constraint rejects duplicate; original profile preserved | Unique constraint returned 23505; profile unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-06` |
| LIVE-PRF-07 | Direct profile API write cannot bypass email privacy validation | Privacy trigger rejects email; original profile preserved | Privacy trigger returned 23514; profile unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-07` |

---

## Section 2 — Skill Management & Ownership

| ID | Requirement / Scenario | Expected Result | Actual Result | Pass/Fail | Supporting Evidence |
|---|---|---|---|---|---|
| LIVE-SKL-01 | Own skill creation, editing, and deletion persist on separate reads | Owner CRUD succeeds; each change persists on reread | Creation and edit persisted; deletion returned the fixture ID; subsequent read found no row. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-01` |
| LIVE-SKL-02 | Skill insertion cannot spoof another owner | RLS rejects forged owner; no row inserted | RLS returned 42501; spoofed row absent. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-02` |
| LIVE-SKL-03 | Cross-user skill update is denied and preserves the record | Unauthorized update denied; original record preserved | No unauthorized rows updated; original record unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-03` |
| LIVE-SKL-04 | Cross-user skill delete is denied and preserves the record | Unauthorized delete denied; original record preserved | No unauthorized rows deleted; original record unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-04` |
| LIVE-SKL-05 | Own skill cannot be reassigned to another user | RLS rejects ownership transfer; original owner preserved | RLS returned 42501; original record unchanged. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-05` |
| LIVE-SKL-06 | Database rejects unsupported listing types | Check constraint rejects unsupported listing type; no row inserted | Check constraint returned 23514; invalid row absent. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-06` |
| LIVE-SKL-07 | Direct skill API write cannot bypass email privacy validation | Privacy trigger rejects email; no row inserted | Privacy trigger returned 23514; invalid row absent. | PASS | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-SKL-07` |

---

## Section 3 — Administrator Authorization

| ID | Requirement / Scenario | Expected Result | Actual Result | Pass/Fail | Supporting Evidence |
|---|---|---|---|---|---|
| LIVE-PRF-08 | User-editable metadata cannot grant administrator privileges | Admin check remains false after user metadata update and session refresh | Expected false; is_admin() returned true after metadata update and session refresh. | FAIL | [API suite](../tests/profile-and-skills.live.mjs) — `LIVE-PRF-08` |

---

## Summary

| Section | Total Cases | Pass | Fail |
|---|---|---|---|
| 1 — Profile Persistence & Protection | 7 | 7 | 0 |
| 2 — Skill Management & Ownership | 7 | 7 | 0 |
| 3 — Administrator Authorization | 1 | 0 | 1 |
| **Total** | **15** | **14** | **1** |

**Cleanup:** All three generated accounts removed; profile and skill deletion verified. No setup errors.

## Open Finding & Evidence Scope

`LIVE-PRF-08` reproduced a metadata-based administrator-classification defect: `is_admin()` returned true after editable Auth metadata was changed. No fix has been applied; hosted verification remains pending.

The snapshot was reconstructed from dashboard definitions and repository SQL. Hosted grants and function configuration were not fully exported. [Execution and scope](local-supabase-testing.md).

**Run ID:** `7c133cdd-9dae-4486-9980-924c8e84e661`  
**Migration SHA-256:** `8356a30e8dd92786f41dd42e7deffffac95c8d4f7745ccb3a63619182a674eb1`
