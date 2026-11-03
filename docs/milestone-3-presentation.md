# Milestone 3 presentation and technical discussion

Date: November 3, 2026. Target: 35 minutes within the required 30–40-minute class session. Individual peer evaluations and execution of the live demonstration are outside this preparation task.

The editable slide deck is prepared separately as a local submission artifact. This script uses the deck's ten-slide sequence. Speaker assignments are proposals by responsibility; the team must confirm its actual speaking order.

## Session timing

| Segment | Time | Suggested responsibility |
| --- | --- | --- |
| Slides 1–2: purpose and selected MVP | 3 minutes | Introduction/scope presenter |
| Slide 3: team-operated live demonstration | 12 minutes reserved | Exchange and dashboard presenters |
| Slides 4–5: account behavior and profile privacy | 4 minutes | Authentication and profile presenters |
| Slides 6–7: architecture and transaction security | 6 minutes | Backend/security presenter |
| Slide 8: evidence and limitations | 3 minutes | Testing presenter |
| Slide 9: retrospective | 2 minutes | Team representative |
| Slide 10: remaining work through December 1 | 2 minutes | Closing presenter |
| Questions | 3 minutes | Whole team |
| Total | 35 minutes | |

The twelve-minute demo block is reserved for the team. This document does not claim that the classroom demonstration or a rehearsal has occurred. Do not stretch slide narration to fill the demo block. Allow up to five additional minutes of questioning if the instructor uses the full forty-minute slot.

## Slide 1 — SkillSwap

One minute. Explain that SkillSwap lets members earn application credits by teaching and spend them learning. Milestone 3 focuses on a functioning integrated application, security controls and evidence rather than additional feature plans.

Suggested opening: “Our implementation now connects the complete exchange process with protected database operations. The latest work aligned registration with our selected MVP, strengthened authorization and disputes, tested the real local backend and verified the shared database and exchange workflow.”

Reference: [team overview](milestone-3-overview.md), implementation through `dcc4b8f`.

## Slide 2 — MVP scope

Two minutes. Explain the fixed rules: three starting credits, one credit per settled lesson, no credit movement at request/acceptance, and learner confirmation after teacher completion. Teaching and learning are exchange roles; administrator authority is separate and trusted.

Video verification is deferred. Existing stored files are retained privately. The only MVP dispute outcome is closure without payment and with a recorded explanation. Since credits are not charged in advance, no-payment closure is not a refund. Scheduling, chat, payments, variable prices and expanded adjudication remain outside this scope.

Reference: [selected MVP](MVP_SCOPE.md).

## Slide 3 — End-to-end exchange workflow

Twelve minutes reserved for the team's demonstration. The slide identifies the order of the learner/teacher actions and the recorded shared result. The live demo itself is not performed as part of this preparation task.

Before handing over, state the environment. A local frontend can use either Docker-backed or shared Supabase; it is not evidence of external frontend hosting. Use fresh labeled records and known initial balances. Already completed exchanges cannot be reused for another legitimate confirmation.

Recorded evidence available for discussion: the shared learner moved from three to two credits, the teacher from one to two, exactly one matching exchange was completed, and other existing balances were unchanged. The teacher in that run used an existing administrator account; the learner was a dedicated ordinary account. A separate local browser run used two ordinary accounts. Do not claim that the shared run tested public signup/email delivery or two ordinary shared users.

Reference: [shared acceptance](hosted-acceptance.md), [local results](verification/local-supabase-2026-11-03.json).

## Slide 4 — Registration without video

Two minutes. Explain what changed: registration no longer requires a video or starts a Storage upload before the account has an authenticated session. Success instructions reflect whether email confirmation is required; a failed registration retains the editable input.

The slide image is a simulated-backend browser regression checkpoint. It proves the interface/message behavior, not email delivery. Real local Auth signup provisioned non-admin profiles with three credits. The dedicated shared learner was created through Supabase Authentication with auto-confirmation, so shared public signup and confirmation email remain unverified.

Reference: [browser procedures](browser-testing.md), [local verification](verification/local-supabase-2026-11-03.json).

## Slide 5 — Profiles and privacy

Two minutes. Explain the distinction between the private profile table and approved public display fields. The safe view exposes the member identifier, display name, username, bio, broad location and preset avatar to authenticated users. It excludes balances, administrator flags, authentication email and retained-video links.

Owned profile/listing operations remain available. Skills with exchange history cannot be removed because doing so would damage historical references. Discovery and exchange screens were updated to read the safe view so tightening private-table access does not break displayed names.

The screenshot illustrates a simulated UI regression case. Real local API checks establish ownership and protected-column behavior; shared browser checks establish actual profile/listing reads and saved listing persistence in that environment.

Reference: [profile security](profile-skill-security.md), [architecture](architecture-and-security.md).

## Slide 6 — System architecture

Three minutes. Trace a request from React route/form through the service layer to Supabase Auth or the PostgreSQL API. The frontend has a public project URL and public API key. It must not contain a service-role secret. Authentication establishes identity; database grants, RLS, triggers and guarded functions decide what that identity may do.

Explain the responsibilities: profiles/skills store member-controlled content, exchanges retain participant/state/history, disputes represent reports and dispute actions represent administrator explanations/audit. Dashboard earned/spent values are aggregates derived from completed exchanges, not a separate banking ledger.

For setup, distinguish the fresh-project base schema from the existing-project upgrade. The shared deployment applied only the reviewed upgrade. Platform-owned Storage RLS is checked rather than altered using unsupported ownership privileges.

Reference: [architecture/security](architecture-and-security.md), [deployment procedure](database-deployment.md).

## Slide 7 — Database authorization and integrity

Three minutes. Explain the concrete threats and safeguards:

- An attacker edits a payload: owner/participant rules and protected-column grants still apply.
- A user changes editable account metadata: administrator access still requires trusted app metadata and server-side checks.
- A learner repeats confirmation or spends the last credit concurrently: the function locks the exchange and participant profiles in a stable order, checks the current state/funds and commits the single credit movement atomically.
- A dispute operation fails partway: report/blocking or review/audit writes roll back together; direct client dispute writes are denied.
- A public video link bypasses row checks: the private bucket removes public object delivery; authorized reads are limited to uploader or administrator.

An existing administrator passed the shared gate and an ordinary learner was redirected from `/admin`. Actual local race, rollback and Storage HTTP tests passed. Shared administrator writes, hosted races and hosted private-video HTTP remain separate acceptance cases.

Reference: [migration](../supabase/mvp_security_hardening.sql), [security risk register](architecture-and-security.md#risks-and-residual-work), [test evidence](testing.md).

## Slide 8 — Test evidence and limits

Three minutes. Present the environment beside every number:

- Five service/utility modules and 24 browser checks passed; the offline browser backend was simulated.
- Fifteen disposable PostgreSQL cases passed with fixture Auth/Storage schemas.
- Real Docker-backed Supabase passed 15 profile/skill API cases, seven workflow/API cases and the two-user browser exchange. The workflow cases include concurrent requests and private Storage HTTP.
- The shared migration passed 23 catalog assertions, and the manual shared walkthrough passed eleven checkpoints.
- PR #34 passed six automated CI jobs; its optional manual live-security job was skipped.

Do not add these counts into a single total: the scenarios and environments overlap. Distinguish installed configuration from actual runtime tests. CI builds a bundle but does not automatically migrate Supabase or deploy an external frontend.

Open areas include shared public signup/email/recovery, private-video HTTP, concurrency, administrator dispute writes, full restore recovery and externally deployed frontend acceptance. The latest evidence explains each boundary.

Reference: [testing summary](testing.md), [shared results](verification/hosted-supabase-2026-11-03.json).

## Slide 9 — Team retrospective

Two minutes. Present the documented observations as a discussion draft until the team validates them. Strengths: integrated workflow, reusable services, backend safeguards and repeatable tests. Challenges: earlier hosted/repository drift, scope mismatches and historical evidence that mixed simulation with execution.

Current submission needs: actual team feedback, contribution reconciliation, documentation review and rehearsal. Additional shared email/security/recovery coverage belongs in the final-release refinement plan; the core walkthrough and recorded local/shared tests are already complete. Reviewed mainline authors represent four members; a fifth has real authored work on a remote dashboard branch. Check the relevant PR/included changes rather than equating a branch count with merged work. Do not use commit counts to infer attendance, communication or peer-evaluation scores.

Reference: [retrospective draft](milestone-3-retrospective.md), [submission checklist](milestone-3-readiness.md).

## Slide 10 — Remaining work and technical discussion

Two minutes. Explain that core integration and the shared upgrade are complete. Work through December 1 should focus on the remaining acceptance cases, genuine defects, documentation, recovery procedures and presentation rehearsal. Defer unrelated feature additions.

Close with the concrete state: one-credit settlement and the core exchange flow are demonstrated; independent quality checks and expected/actual evidence are available; scope limits are disclosed; contribution reconciliation and retrospective approval require actual team participation.

Reference: [readiness checklist](milestone-3-readiness.md), [proposed refinement schedule](milestone-3-retrospective.md#proposed-refinement-plan-through-december-1).

## Technical questions and concise answers

| Question | Answer |
| --- | --- |
| Why are hidden administrator buttons insufficient? | A caller can bypass React and send API requests. The database uses trusted metadata and guarded operations independently of the interface. |
| Why does the public view use the owner's access? | It intentionally projects only approved display fields while owner-only table RLS protects private rows. Authenticated-only access and the explicit session predicate restrict the projection. It is not an unrestricted copy of the profile table. |
| Why check the balance again at confirmation? | Requests reserve no credits, so other exchanges may have changed the balance. Settlement uses the locked current balance. |
| How is a duplicate transfer prevented? | The exchange is locked and must still be teacher-completed. After the first successful settlement its state is completed, so later attempts fail. |
| Why lock both participant profiles in a deterministic order? | Competing exchanges can share users. A stable ordering coordinates balance writes and reduces conflicting lock order. |
| What if audit insertion fails? | Administrator status and audit writes are in one transaction; an error rolls them both back. Local failure-injection tests establish that behavior. |
| Why does dispute closure transfer zero credits? | The MVP charges only at learner confirmation. A disputed unsettled lesson has not yet been charged, so no payment is transferred or refunded. |
| Why is Storage privacy separate from row policies? | Public bucket URLs can deliver objects outside authenticated row-policy checks. Both private bucket configuration and narrow policies are required. |
| What do the tests not establish? | Evidence is scoped by environment. Local concurrency/Storage tests and shared catalog checks do not certify every shared runtime path. Email delivery and external frontend hosting need separate acceptance. |
| Is the system exactly 70% complete? | No agreed project-wide weighting exists. Show the implemented major features, recorded end-to-end behavior and specific remaining work instead of inventing a percentage. |

Use the final three minutes for the instructor's questions, with additional time available up to the forty-minute limit. Keep individual peer-evaluation discussion out of the public presentation package.
