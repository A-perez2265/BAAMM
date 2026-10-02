# Mallory's Milestone 2: profiles and skill portfolio

Scope: SCRUM-11 / SCRUM-25–27 and SCRUM-15 / SCRUM-28–30.

## Implemented

- Editable display name, username, bio, and city/state, saved to `profiles` in Supabase. The page displays the returned database row only after the save succeeds.
- Signed-in member profiles at `/profile/:profileId`; own profile at `/profile`. Other members do not see editing controls. Discovery can link to this route using the member's profile ID.
- Public profile queries select only id, display name, username, bio, and location. Private account fields are excluded.
- Skill cards, forms, add/edit/remove feedback, and confirmation before removal. Skill reads, updates, and deletes are filtered by account ID. A zero-row delete is reported as a failure.
- Muted maroon accent, warm background, white cards, and mobile layouts. The shared accent is `--accent` in `src/index.css`; coordinate these tokens with Mario.
- Keyboard skip link, visible focus indicators, labeled native forms, required-field indicators, screen-reader status/error announcements, form focus on opening, focus return on closing, and reduced-motion support. These are accessibility improvements, not a claim of ADA certification.

## Automated verification

Run `node tests/profile-and-skills.mjs`, `npx eslint src`, and `npm run build`.

Service tests use a mocked database client. They verify update payloads, excluded sensitive fields, validation, error propagation, account filters, and zero-row delete failures. They do not prove live database policy enforcement.

The isolated browser check verified profile save/reload, skill add/edit, the updated skill appearing on the profile, skill removal with confirmation, and responsive layouts using sample data. No live account was modified.

## Live demo checklist — still required

Use two team-approved test accounts, A and B, in the team's test environment.

1. Sign in as A. Edit profile, save, refresh, and confirm the saved values remain. Cancel another edit and confirm saved values remain unchanged.
2. Add a skill, open the profile, and confirm it appears. Edit the description, refresh, and confirm the database retained it. Remove a disposable test skill and confirm it disappears from the profile.
3. Open `/profile/<B's profile id>` as A. Confirm B's public profile and listings display, with no editing controls or account contact details.
4. Verify in Supabase that RLS is enabled for `profiles` and `skills`, profile updates require `auth.uid() = id`, and skill writes require `auth.uid() = user_id`. Test forged cross-account writes with an ordinary user token; hiding buttons and filtering queries are not a security boundary.
5. Coordinate with Augustine/Amber on existing sensitive-column protections. An ordinary profile editor must not be able to change credits or admin status through a direct API request. This checkout does not include the profile/skills policy definitions, so those protections remain unverified.
6. Check keyboard-only editing, error focus, cancel/save focus return, and VoiceOver announcements. Test a narrow screen and zoomed text. Public bio and listing text are user-entered: guidance does not detect every possible disclosure of personal details.

Do not mark SCRUM-27 or SCRUM-30 done until the live persistence, ownership, and privacy checks pass. SCRUM-26 has a database-backed implementation; verify it against the live schema before marking it done.
