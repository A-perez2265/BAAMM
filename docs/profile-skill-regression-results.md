# SkillSwap - Profile and Skill Regression Test Matrix

**Last Updated:** 2026-10-20  
**Regression Suite Run:** 2026-10-20  
**Environment:** Node.js / Vite SSR; mocked Supabase client  
**Outcome:** ALL 10 SUPPLEMENTAL CASES PASSED

> [!NOTE]
> IDs correspond to executable cases in [profile-and-skills.mjs](../tests/profile-and-skills.mjs). Existing assertions also passed. Database responses are simulated; these results establish application behavior rather than database authorization.

---

## Section 1 — Schema Compatibility

| ID | Requirement / Scenario | Expected Result | Actual Result | Pass/Fail | Supporting Evidence |
|---|---|---|---|---|---|
| PRF-COMPAT-READ-42703 | Missing avatar column during profile read | Retry once using legacy public fields and the same profile ID | Returned the simulated legacy profile; both field projections and ID filters matched | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-COMPAT-READ-42703` |
| PRF-COMPAT-SAVE-42703 | Missing avatar column when no avatar is selected | Retry without `avatar_id`, retaining the other payload fields and owner filter | Returned the simulated saved profile; fallback payload, selection, and owner filters matched | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-COMPAT-SAVE-42703` |
| PRF-COMPAT-READ-PGRST204 | Missing avatar column in schema cache | Read through the same safe legacy fallback | Returned the simulated legacy profile with expected projections and ID filters | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-COMPAT-READ-PGRST204` |
| PRF-COMPAT-SAVE-PGRST204 | Schema-cache error when no avatar is selected | Save through the same legacy fallback | Fallback save payload, selection, and owner filters matched | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-COMPAT-SAVE-PGRST204` |
| PRF-COMPAT-FAILURE | Permission failure on fallback read or save | Propagate the fallback failure; make no further attempt | Both operations rejected with the original simulated permission error after two requests | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-COMPAT-FAILURE` |

---

## Section 2 — Validation Boundaries

| ID | Requirement / Scenario | Expected Result | Actual Result | Pass/Fail | Supporting Evidence |
|---|---|---|---|---|---|
| PRF-BOUNDARY-REQUIRED | Missing or whitespace-only required profile fields | Reject display name, username, and location after input preparation; allow an empty bio | All six invalid inputs rejected; optional empty bio accepted; no database calls | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-BOUNDARY-REQUIRED` |
| PRF-BOUNDARY-LENGTH | Profile length boundaries | Accept usernames of 3 and 30 characters; reject 2 and 31. Accept display name and bio at and immediately below 80/500; reject immediately above | All ten boundary inputs matched expectations; no database calls | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-BOUNDARY-LENGTH` |
| SKL-BOUNDARY-REQUIRED | Missing or whitespace-only required skill fields | Reject each of seven required fields after input preparation; allow empty tags and location | All fourteen invalid inputs rejected; optional empty fields accepted; no database calls | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `SKL-BOUNDARY-REQUIRED` |

---

## Section 3 — Error Handling

| ID | Requirement / Scenario | Expected Result | Actual Result | Pass/Fail | Supporting Evidence |
|---|---|---|---|---|---|
| PRF-ERROR-NO-FALLBACK | Permission error or missing unrelated column | Propagate the error without an avatar fallback | Read and save rejected each error after one request | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `PRF-ERROR-NO-FALLBACK` |
| SKL-ERROR-PROPAGATION | Permission errors during skill read/create/update | Reject with the original error without retrying or reporting success | All three operations rejected after one request each | PASS | [Regression suite](../tests/profile-and-skills.mjs) — `SKL-ERROR-PROPAGATION` |

---

## Summary

| Section | Total Cases | Pass | Fail |
|---|---|---|---|
| 1 — Schema Compatibility | 5 | 5 | 0 |
| 2 — Validation Boundaries | 3 | 3 | 0 |
| 3 — Error Handling | 2 | 2 | 0 |
| **Total** | **10** | **10** | **0** |

## Execution & Scope

```bash
node tests/profile-and-skills.mjs
```

A failed assertion produces a nonzero exit status. Required-field cases exercise preparation and validation functions, not direct service enforcement. Skill text has no defined maximum-length constraint. No database records were modified. See [local integration results](profile-skill-live-results.md) for database-backed checks.
