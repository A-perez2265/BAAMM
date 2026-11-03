# Profile and skill security

Last updated: November 3, 2026.

## Data boundaries

| Operation | Data | Backend boundary |
| --- | --- | --- |
| Public profile read | ID, display name, username, bio, broad location, avatar | Authenticated `public_profiles` view with a safe projection |
| Private profile read | Owner row, including balance | Owner-only profile SELECT policy |
| Profile edit | Display name, username, bio, location, avatar | Owner RLS and column-scoped UPDATE grant |
| Skill read | Listing fields and owner ID | Authenticated portfolio/discovery access |
| Skill create/edit/delete | Owned listing fields | Owner RLS, restricted columns and history-preserving deletion guard/FK |

Email, balances, administrator flags and video links are excluded from the public profile view. Explicit service projections supplement database policies and grants. See [the migration](../supabase/mvp_security_hardening.sql).

`saveProfile` builds an explicit payload and excludes supplied protected fields. Skill mutations filter by listing ID and owner ID. Browser filters alone do not establish authorization: database permissions, RLS and triggers enforce the boundary independently.

## Public text and location

Profile validation checks required fields, username syntax, text lengths, preset avatars and city/state syntax. Skill location is optional but uses the same format when supplied. Validation checks syntax rather than whether a location exists.

Forms, save services and database triggers reject recognizable contact details in public fields, including tags. Pattern detection has false positives and bypasses; it does not guarantee that users cannot share private information. See [public-text privacy](public-text-privacy.md).

## Administrator authority

Administrator authorization reads trusted app metadata. New profiles initialize the legacy administrator flag to false; ordinary clients cannot write protected columns. Editable user metadata does not grant administrator authority. Trusted role changes require session refresh.

## Verification

[Testing](testing.md) separates service assertions, browser simulation and actual local SQL execution. Database cases cover cross-user changes, protected-column writes, safe public reads, ownership reassignment and direct contact-detail writes. Browser checks cover forms, simulated persistence, error recovery and UI ownership boundaries.

Hosted schema/grant parity, real authentication and direct API authorization require environment-specific verification. Historical reports retain their original dates and do not certify the current deployment.

Sources: [profile service](../src/services/profileService.js), [skill service](../src/services/skillService.js), [service assertions](../tests/profile-and-skills.mjs), [database tests](../tests/database-security.mjs).
