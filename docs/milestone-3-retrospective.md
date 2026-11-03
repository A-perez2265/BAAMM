# Milestone 3 team retrospective

Date: November 3, 2026. Status: evidence-based draft awaiting team discussion and approval.

This draft summarizes repository and test observations. It does not claim that a meeting occurred, that every member attended, or that members agreed with these observations. Record actual feedback and accepted actions before submitting it as the team's completed retrospective.

## What is working

- The existing components now support a coherent business process: discovery, request, acceptance, teacher completion, learner confirmation and persisted credit/dashboard updates. The shared-backend walkthrough completed that process with exactly one credit transferred.
- Backend rules enforce profile ownership, permitted exchange actors, protected columns and trusted administrator authority. Security work is part of the implementation and test suite.
- Dispute submission and administrator review now use transactions, so related state and audit records cannot be independently committed by the interface.
- Repeatable checks cover five service modules, 24 simulated browser cases, 15 SQL cases and actual local Supabase API/concurrency/Storage behavior. Shared acceptance results are recorded separately.
- Reviewed changes are in the shared repository, and CI runs lint, tests, dependency scanning and production compilation.

## Current challenges

| Observation | Effect | Lesson |
| --- | --- | --- |
| Hosted configuration and repository SQL had drifted | Replaying old setup could undo security behavior or fail on managed Storage ownership | Keep reviewed migrations and dated deployment evidence alongside application changes |
| Selected scope and registration behavior disagreed about videos | A deferred feature remained an onboarding dependency | Update implementation, business rules and presentation together when scope is settled |
| Related dispute changes were separate browser writes | A failure could leave inconsistent exchange/report state or missing audit history | Place multi-record business operations in guarded database transactions |
| Historical reports mixed execution, simulation and inspection | A PASS label could imply stronger evidence than the underlying test supplied | Record environment, expected result, actual result, status and limitations explicitly |
| The original slide deck predates deployment and later tests | Presentation claims could contradict the current repository | Regenerate submission materials from the final evidence, not from an earlier draft |
| The shared walkthrough used an existing administrator as teacher | Ordinary learner denial was verified, but this was not a two-ordinary-account shared run | Name the tested roles precisely and use dedicated ordinary accounts for repeatable rehearsals |
| Reviewed mainline author history does not represent all five members | The active-contributor requirement needs reconciliation | Link real authored commits/PRs, including relevant branch work; do not manufacture activity |

## What still needs to be completed

Implementation and the recorded local/shared core tests are already complete. The actions below separate team submission coordination from additional final-release acceptance; they are not a request to repeat the passed core workflow.

| Action | Proposed responsibility | Completion evidence |
| --- | --- | --- |
| Validate this retrospective and record actual team feedback | Whole team | Agreed observations and action decisions below |
| Reconcile every member's GitHub contribution and included work | Each member; integration reviewer coordinates | Real commit/PR links and review of unmerged branch changes |
| Complete additional shared signup/email/recovery delivery coverage before final release | Authentication reviewer | Dated expected/actual results using an owned test inbox |
| Finish hosted private-video HTTP and administrator dispute-write acceptance if required for release | Backend/security reviewer | Authorized role-specific results without exposing private media or changing unrelated cases |
| Verify full hosted backup/recovery procedure | Backend/deployment reviewer | Recorded restore exercise in an approved environment |
| Review setup/security documentation and remaining test limits | Documentation reviewer and whole team | Reviewed README/guides, accurate submission claims |
| Assign speakers and rehearse the 30–40-minute presentation session | Whole team | Speaking order, timed rehearsal and a prepared demo environment |

Responsibilities are proposed by role, not assertions that a named person has accepted an assignment. No new product feature is required by these actions.

## Team discussion and decision record

Allow approximately ten minutes before final submission. Each member should describe one successful contribution, one current obstacle and one concrete action they can complete. Confirm whether the observations above match the team's experience.

| Record | Current status |
| --- | --- |
| Discussion date and participants | Not yet supplied |
| Member feedback or corrections | Not yet supplied |
| Accepted action owners and due dates | Not yet supplied |
| Final speaking order and rehearsal result | Not yet supplied |
| Team approval of this retrospective | Pending |

Keep individual peer evaluations outside this document and out of public repository evidence. Commit counts alone do not establish communication, attendance, collaboration or overall contribution.

## Proposed refinement plan through December 1

| Period | Focus | Exit evidence |
| --- | --- | --- |
| November 3–10 | Resolve contribution records, runtime acceptance gaps and documentation inconsistencies | Reviewed assignments, updated acceptance matrix and reproducible setup |
| November 11–17 | Fix demonstrated defects and improve error handling/usability within the selected scope | Reviewed fixes with affected regression checks |
| November 18–24 | Repeat release regression and finalize technical/security documentation | Dated results for the intended release version |
| November 25–30 | Freeze presentation version, rehearse and prepare a tested fallback environment | Final deck, timed rehearsal and known starting test data |
| December 1 | Final project presentation | Actual delivery and technical discussion |

This is a proposed schedule for team approval, not a record of completed future work.
