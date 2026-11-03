# Milestone 3 requirement and submission checklist

Due: November 3, 2026. Final presentations: December 1, 2026. Status reflects reviewed implementation and recorded evidence, not a completed class presentation.

## Required deliverables

| Deliverable | Prepared evidence | Status / remaining dependency |
| --- | --- | --- |
| Mostly functional system with major features implemented | [Functional coverage below](#functional-coverage), [shared walkthrough](hosted-acceptance.md) and [test results](testing.md) | Core exchange workflow implemented and verified; public email-dependent acceptance remains open |
| Updated GitHub repository and active contributions | Implementation PRs #33/#34 and acceptance commit dcc4b8f; [change inventory](milestone-3-change-inventory.md) and [six successful CI jobs](verification/milestone-3-ci-2026-11-03.json) | Published implementation is current; all-member contribution reconciliation requires team review |
| Draft project documentation including security | [README](../README.md), [architecture/security](architecture-and-security.md), [scope](MVP_SCOPE.md), [deployment](database-deployment.md), [testing](testing.md) | Draft prepared; team review and full hosted recovery verification remain |
| Team retrospective | [Retrospective draft](milestone-3-retrospective.md) | Evidence-based draft prepared; actual discussion/approval pending |
| Class presentation and technical discussion | [Presentation script](milestone-3-presentation.md) and locally prepared editable slide deck | Materials prepared for a 35-minute session; speaking order, rehearsal and actual presentation remain team responsibilities |

Individual peer evaluations and execution of the classroom live demo are excluded from this preparation task. They remain course obligations for the appropriate participants.

### Contribution evidence to reconcile

Reviewed mainline author identities represent four team members. A fifth member has six authored commits visible on the [remote dashboard branch](https://github.com/A-perez2265/BAAMM/tree/feature/SCRUM-23-24-dashboard-activity), including [the latest reviewed branch commit](https://github.com/A-perez2265/BAAMM/commit/da567d9) dated October 5, 2026. This establishes actual branch work, not its inclusion in `main` or a participation grade. Each member should link the relevant authored commit/PR, describe its contribution and confirm whether it is included in the submitted version. Review branch changes before merging; existing authorship must remain intact.

## Functional coverage

The professor's approximate 70% threshold concerns meaningful implemented functionality. No agreed weighted progress model exists in the repository, so this report does not invent a project-wide percentage. The major feature areas below have application/backend implementations; evidence identifies the environment and what still needs acceptance. The remaining work is chiefly testing, documentation, contribution reconciliation and refinement rather than creating the core exchange process.

| Major feature area | Implementation evidence | Verification and limits |
| --- | --- | --- |
| Account access and recovery | Registration without video, sign-in/out, protected routes, session-aware messaging and recovery/reset pages | Actual local signup/login tested; shared administrator and ordinary learner logins/sign-out passed. Shared public signup/confirmation/recovery email delivery not executed |
| Profiles and skill management | Owned profile editing, preset avatars, Teacher/Learner listing CRUD, profile portfolios and history-safe deletion | 15 real local profile/skill API cases and browser regression passed; shared owned profile/listing reads and new listing persistence passed |
| Search and discovery | Teacher listings, text search, tags, combined facets and listing-specific request links | Service/offline browser tests passed; shared discovery found the exact test listing with public teacher data |
| Exchange request and response | Learner request, teacher accept/decline, actor/state restrictions and immutable participants | Local guards/SQL tests passed; shared request and acceptance persisted |
| Lesson completion and credits | Teacher completion, learner confirmation, one-credit transaction, replay/funds/row-lock protections and legacy wrappers | Local API races/last-credit checks passed; shared one-time confirmation completed with exact balance changes |
| Dashboard | Available balance, incoming/active exchanges, activity and earned/spent aggregates | Shared independent dashboard reloads reflected learner 3 → 2 and teacher 1 → 2; corresponding ledger totals persisted |
| Disputes and administration | Either-participant reporting, atomic blocking, trusted administrator gate, explanation/audit and terminal no-payment closure | Local SQL/API rollback and review cases passed; shared administrator page and ordinary-user denial passed. Hosted administrator write workflow not exercised |
| Privacy and authorization | Owner RLS, safe public projection, column grants, guarded functions, history constraints and private video bucket | 23 shared catalog checks passed plus local direct API/Storage checks. Hosted private-video HTTP and hostile concurrent-session acceptance remain separate |

Refer to [MVP requirements](MVP_SCOPE.md) for FR-01 through FR-25 and acceptance criteria. A successful simulated browser check does not establish a successful shared API request. A catalog check verifies configuration, not every runtime behavior.

## Completed evidence and future refinement

The core exchange workflow is already tested: shared listing creation, discovery, request, acceptance, simulated teacher completion, learner confirmation, exact one-credit settlement and persisted dashboards passed. Shared database/security configuration checks passed. Actual local tests additionally cover API ownership, dispute transactions, concurrency, last-credit handling and private Storage HTTP.

The unexecuted shared email, private-video HTTP, concurrency, administrator-write and recovery cases are additional final-release coverage. They do not change the PASS status of completed scenarios or require another core walkthrough to prepare these Milestone 3 materials. Keep them in the December 1 refinement plan with their current NOT RUN scope labels.

## Final checks the team must perform

- [ ] Every member links a real contribution and confirms what will be included in the submission; review branch changes before merging them.
- [ ] Confirm the selected no-video, fixed-credit, no-payment-dispute scope.
- [ ] Hold the retrospective and replace pending entries with actual feedback and agreed owners.
- [ ] Assign speakers and confirm a total session duration of 30–40 minutes, including demo and questioning.
- [ ] Select and rehearse the demo environment without spending credits on an already-settled exchange.
- [ ] Record any additional runtime checks actually performed; keep unexecuted cases marked NOT RUN.
- [ ] Review the final submitted commit and its GitHub Actions status.
- [ ] Submit the documentation, retrospective and presentation using the course's submission channel.

These unchecked items are not represented as completed merely because the supporting drafts exist.
