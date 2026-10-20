# SkillSwap Minimum Viable Product Specification

**Last Updated:** 2026-10-20<br>
**Version:** 1.2<br>
**Status:** Selected MVP scope baseline. Implementation gaps and release acceptance remain open.

> **Source Baseline:** Requirements are based on `main` at commit `fcf331290ec6c347a244ed2910cabf58081a7512`. Required release behavior is distinguished from existing implementation behavior. Scope decisions were selected on 2026-10-20 and may be revised through change control.

---

## 1. System objective

SkillSwap is a web application for exchanging instruction through platform credits. A user earns credits by teaching and spends credits to learn from another user. The MVP supports account access, profile and skill management, teacher discovery, exchange requests, lesson completion, credit settlement, dispute handling, and dashboard summaries.

The release objective is to complete and harden the existing workflow. New functionality outside this specification is deferred. The specification describes required release behavior; it does not imply that every requirement is satisfied by the current implementation.

## 2. System architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Presentation | React and React Router | Forms, navigation, validation feedback, profiles, listings, dashboards and administrative views |
| Application services | JavaScript service modules | Supabase queries, request validation and database function calls |
| Authentication | Supabase Auth | Account creation, password authentication, sessions and password recovery |
| Persistence | PostgreSQL through Supabase | Profiles, skills, exchanges, disputes and related records |
| Authorization | PostgreSQL grants, Row Level Security and guarded functions | Ownership, participant access, administrative permissions and protected field updates |
| File storage | Supabase Storage | Existing storage infrastructure; video verification is deferred from the MVP |
| Quality assurance | Node-based tests, ESLint, Vite and GitHub Actions | Automated checks, production compilation and test evidence |

Authorization and credit integrity must be enforced by the backend. Frontend validation, hidden controls and client query filters are supplementary controls.

## 3. Actors

| Actor | Permitted operations |
| --- | --- |
| Visitor | Register, authenticate and request password recovery |
| Authenticated user | Manage an owned profile and skill listings; view permitted public member information |
| Learner | Request another user's teacher listing; confirm a completed lesson or submit a dispute |
| Teacher | Accept or decline incoming requests; mark accepted lessons complete; submit a dispute for an eligible exchange |
| Administrator | Review disputes and execute authorized, audited resolution operations |

Teacher and learner roles are determined per exchange. A user may perform both roles across different exchanges. Administrative authority is granted through a trusted administrative process and cannot be selected during registration or assigned through editable user metadata.

## 4. Functional requirements

### 4.1 Account management

- **FR-01:** The system shall support email/password registration, sign-in and sign-out.
- **FR-02:** The system shall provide password recovery using a valid recovery session and configured redirect URL.
- **FR-03:** Protected application routes shall require an authenticated session. Backend access shall independently enforce authorization.
- **FR-04:** Account creation shall provision a profile and grant the initial credit allocation exactly once.

### 4.2 Profiles and skill management

- **FR-05:** Users shall be able to edit their own display name, username, bio, broad location and preset avatar.
- **FR-06:** Public member profiles shall expose only approved profile fields and the member's skill portfolio.
- **FR-07:** Users shall be able to create, edit and remove their own Teacher or Learner skill listings.
- **FR-08:** Skill listings shall support a title, description, category, tags, experience level, delivery format, language and optional broad location.
- **FR-09:** Profile and skill changes shall persist and appear consistently after navigation or reload.
- **FR-10:** Listing removal shall preserve exchange and credit-history integrity. Removal shall be rejected with an explanatory error if dependent records prevent safe deletion.

### 4.3 Skill discovery

- **FR-11:** Discovery shall retrieve current Teacher listings and exclude listings owned by the requesting user.
- **FR-12:** Users shall be able to search listing text and apply category, format, experience-level and language filters together.
- **FR-13:** Tag suggestions shall be derived from stored listing tags.
- **FR-14:** Selecting a listing shall open an exchange request for that listing's identifier and teacher.

### 4.4 Exchange management

- **FR-15:** A learner shall be able to submit a request with a nonblank message for an available teacher listing.
- **FR-16:** The designated teacher shall be able to accept or decline a pending request.
- **FR-17:** The designated teacher shall be able to mark an accepted lesson complete.
- **FR-18:** The designated learner shall be able to confirm a teacher-marked-complete lesson. Either designated participant shall be able to report a problem before settlement.
- **FR-19:** Successful confirmation shall atomically transfer one credit from the learner to the teacher and mark the exchange completed.
- **FR-20:** The backend shall reject unauthorized actors, invalid state transitions and duplicate settlement attempts.

### 4.5 Dashboard and dispute management

- **FR-21:** The dashboard shall display the user's balance, incoming requests, active exchanges, teacher listings and exchange-related activity.
- **FR-22:** Earned and spent summaries shall agree with completed exchanges after navigation or reload. Continuous realtime updates are not required.
- **FR-23:** Either the designated learner or teacher shall be able to submit a reason and explanation for an accepted, unsettled exchange. Only one active dispute per exchange is permitted.
- **FR-24:** Administrators shall be able to review disputes, record an explanation and close the disputed exchange without transferring credits, as defined in section 7.
- **FR-25:** Dispute creation and exchange blocking shall execute atomically. Dispute closure and audit recording shall execute atomically, without changing either balance.

## 5. Exchange state model

| Current state | Action | Authorized actor | Resulting state | Credit effect |
| --- | --- | --- | --- | --- |
| No exchange | Submit valid request | Learner | `pending` | None |
| `pending` | Accept | Designated teacher | `accepted` | None |
| `pending` | Decline | Designated teacher | `declined` | None |
| `accepted` | Mark lesson complete | Designated teacher | `session_completed` | None |
| `session_completed` or legacy `awaiting_confirmation` | Confirm lesson | Designated learner | `completed` | Learner −1; teacher +1 |
| `accepted`, `session_completed` or legacy `awaiting_confirmation` | Submit dispute | Either designated participant | `issue_reported`; case `open` | None; ordinary confirmation blocked |
| `issue_reported` with an open case | Review case | Authorized administrator | Exchange remains `issue_reported`; case `under_review` | None |
| `issue_reported` with an open or under-review case | Close without payment | Authorized administrator | Exchange remains `issue_reported`; case `resolved` | None; exchange is terminal |

A disputed exchange is logically closed without payment when its exchange status is `issue_reported` and its dispute case is `resolved`. This uses existing status values rather than introducing a new exchange enum. Closed disputed exchanges shall remain excluded from active exchanges and ordinary confirmation; their records are retained for audit. Dispute case statuses remain distinct from exchange statuses: `open`, `under_review` and `resolved`. Resolved cases cannot be reopened or settled through the MVP interface.

Direct transition from `pending` or `accepted` to `completed` is prohibited by this specification. The current confirmation SQL accepts `accepted`; that behavior requires correction before release.

## 6. Business rules and data constraints

| ID | Rule |
| --- | --- |
| BR-01 | Each new account receives **3 starting credits**, matching the current registration interface and signup SQL. Conflicting references to 1 credit must be reconciled. |
| BR-02 | Each completed lesson costs **1 credit**. Lesson duration does not change the price. |
| BR-03 | A learner must have at least 1 credit when submitting a request. Available funds must be rechecked during settlement. |
| BR-04 | Requests, acceptance and teacher completion do not transfer or reserve credits. |
| BR-05 | A user cannot request an exchange with themselves. The selected listing must belong to the designated teacher and be a Teacher listing. |
| BR-06 | Credit balances cannot become negative. A single exchange can be settled at most once, including concurrent requests. |
| BR-07 | Failed settlement must leave both balances and the exchange state unchanged. |
| BR-08 | Users cannot directly modify their balance, administrative authority or another user's protected records. |
| BR-09 | Public profile fields are display name, username, bio, broad location and preset avatar; the public portfolio contains permitted skill fields. Authentication email, exact addresses, balances, administrator flags and video links are excluded from that projection. |
| BR-10 | Public profile and skill text shall reject recognizable email addresses, telephone numbers and street addresses. Pattern detection remains a best-effort control. |
| BR-11 | Location fields use city and state/region rather than precise addresses or live coordinates. |
| BR-12 | Administrative authorization shall use a trusted source and be enforced by database operations, independently of frontend state. |

The application data model includes profiles, skills, exchanges, notifications, reviews, disputes and dispute actions. A table's existence does not imply that every possible user interface for that entity is included in the MVP. Dashboard activity currently derives from exchange records, and its credit ledger presents aggregate earned/spent counts rather than an independent transaction ledger.

## 7. Selected release policies

### 7.1 Verification videos — deferred

Video verification is not required for the MVP. Registration, learning, teacher listings and exchange requests shall work without a video. The MVP shall not offer new verification-video uploads, public playback, verification badges or a video approval workflow.

This decision removes a nonessential dependency from account creation. It does not certify identity or skill quality through another mechanism. Existing stored videos shall not be automatically deleted. Their read access must be restricted to the uploader and authorized administrators through a separately reviewed storage change before release.

**Implementation gap:** Current registration requires a video, uploads it and stores a public URL. The required completion work is to remove the video gate/upload path and related promises from registration, and restrict access to existing videos. No replacement verification feature is required.

**Decision:** Selected for MVP on 2026-10-20. Video functionality may be reconsidered after the MVP.

### 7.2 Disputes — close without credit transfer

Either exchange participant may report a problem after acceptance and before settlement. Pending requests can be declined; already completed exchanges are outside the dispute workflow. Submission requires a reason and explanation and places the exchange in `issue_reported`, preventing ordinary confirmation.

The administrator reviews the report, records an explanation and resolves the case. The only MVP resolution is **close without payment**:

- Neither user's credit balance changes.
- The exchange remains `issue_reported` and the case becomes `resolved`.
- The exchange is no longer active and cannot later be confirmed or paid through the MVP workflow.
- The original records, reporting participant, administrator identity, explanation and timestamps are retained.
- Repeated closure attempts cannot create additional actions or credit effects.

This is cancellation without settlement, not a refund: no credits were charged before the dispute. The MVP does not determine financial fault, force payment, mint compensation credits, reverse completed transfers or support appeals/reopening. A disputed lesson therefore earns no credit, regardless of which participant reported it. That limitation is explicit and may be revised in a later scope version.

**Implementation gap:** The current interface exposes reporting from learner confirmation, offers a separate credit grant and allows case reopening. Complete participant access, atomic case/closure history and terminal-state handling; remove grant/reopen actions from the MVP dispute interface. Existing data and SQL functions are not automatically deleted by this decision.

Resolution follow-up is manual through the existing administrative email link. Automatic email delivery and guaranteed response times are excluded. Interface messages must describe the supported process accurately.

**Decision:** Selected for MVP on 2026-10-20. Administrator-directed payments and more detailed adjudication are deferred.

### 7.3 Sorting and notification filters — deferred

Retain current text search, tag suggestions and category/format/experience/language filters. User-selectable result sorting, notification filtering/sorting and the teacher-facing learner-discovery toggle are deferred. Existing exchange-related dashboard alerts and activity links remain in scope. This is an explicit reduction of the milestone's planned work, not a claim that those features were completed.

**Decision:** Selected for MVP on 2026-10-20 to prioritize completion and hardening of the existing workflow.

## 8. Nonfunctional requirements

- **NFR-01 — Security:** Database permissions, RLS and function guards shall enforce record ownership, exchange participation, administrator privileges and restricted access to any retained videos.
- **NFR-02 — Integrity:** Credit settlement and dispute resolution shall be atomic and protected against replay and concurrent double settlement.
- **NFR-03 — Reliability:** Failed requests shall display an actionable error, retain editable input where appropriate and avoid false success states.
- **NFR-04 — Usability:** Core forms shall provide loading states, disable repeated submission while pending and support keyboard operation and usable desktop/mobile layouts.
- **NFR-05 — Reproducibility:** Repository instructions shall identify dependencies, environment variables, database setup order, Auth/storage configuration and commands for running the application and tests.
- **NFR-06 — Verification:** Test evidence shall identify the requirement, expected result, actual result, status, tested version/environment and supporting artifacts. Mocked, browser, manual and live-database evidence shall remain distinguishable.
- **NFR-07 — Continuous integration:** Pull-request checks shall execute linting, the intended offline tests and a production build. Optional live checks shall explicitly skip when required configuration is unavailable.

No numerical performance target or claim of accessibility compliance is established by this specification without corresponding requirements and measurement evidence.

## 9. Implementation baseline and remaining work

| Subsystem | Existing implementation | Required release work |
| --- | --- | --- |
| Accounts | Registration, authentication, sessions and recovery | Verify real recovery/redirect behavior and remove the verification-video dependency |
| Profiles and skills | Profile editing, public profiles, preset avatars and listing CRUD | Verify backend privacy/ownership and safe deletion with dependent exchanges |
| Discovery | Database listings, text search, tag suggestions and facet filters | Preserve filter composition, listing freshness and request-link correctness |
| Exchanges and credits | Request/response pages, teacher completion, learner confirmation and transactional settlement SQL | Enforce actor/state rules and verify replay, concurrency and insufficient-credit behavior |
| Dashboard | Balance, pending/active exchanges, activity and aggregate credit summaries | Verify consistency after operations and exclude resolved disputed exchanges from active counts |
| Administration | Dispute records, status changes, action history and credit grants | Remove editable-metadata trust; support reporting by either participant and audited no-transfer closure without grant/reopen controls |
| Storage | Video upload and public-read storage configuration | Disable MVP verification uploads and restrict retained-video access without deleting existing files |
| Repository and CI | README, test matrix, service/security tests and workflow configuration | Supply missing base database definitions/policies, correct setup dependencies, reconcile credit documentation and verify workflow execution |

The implementation baseline above was established by reviewing application routes, service modules, SQL definitions, tests, CI configuration and repository documentation at the source commit identified in this specification. The listed release work remains necessary before acceptance. Local uncommitted browser tests are supplementary artifacts and are not part of the reviewed `main` baseline.

## 10. Excluded functionality

The MVP excludes verification-video uploads/playback; notification filtering/sorting; user-selectable search-result sorting; theme switching; new review/rating interfaces; direct chat; built-in video conferencing; calendar scheduling and rescheduling; payments or credit purchases; variable pricing and hourly accounting; escrow; direct barter matching; distance/rating sorting; automated recommendations; automated video verification; native mobile applications; and expanded administrative account-management tools.

Teacher and Learner listing types remain supported in portfolios, but discovery of learner requests by teachers is excluded. Lessons take place outside the application. Delivery-format fields describe those arrangements rather than providing conferencing or booking services.

Existing database tables and unused prototypes do not expand release scope. Exclusions must be reconciled with any binding project requirements before scope approval.

## 11. MVP acceptance criteria

| ID | Acceptance condition |
| --- | --- |
| AC-01 | Registration succeeds without a video, provisions one profile and exactly 3 credits; sign-in/out and a real password-recovery flow succeed. |
| AC-02 | Profile and listing changes persist and appear consistently across relevant screens. |
| AC-03 | An authenticated learner can discover a teacher, request a lesson, receive acceptance, observe teacher completion and confirm the lesson. |
| AC-04 | Confirmation transfers exactly one credit, completes the exchange and produces consistent dashboard balances and summaries. |
| AC-05 | Declined requests transfer no credits; insufficient funds, invalid actors/states and replayed/concurrent settlement preserve data integrity. |
| AC-06 | Either designated participant can report an eligible exchange; submission blocks settlement. Administrative closure resolves the case, leaves both balances unchanged, removes the exchange from active work and records an explanation exactly once. |
| AC-07 | Direct API checks reject unauthorized record mutation and administrator self-promotion; legitimate administrative operations succeed. |
| AC-08 | No MVP flow requires or accepts a verification-video upload; retained videos are inaccessible to anonymous and unrelated users. |
| AC-09 | An independent environment can be configured using the documented setup, and the required CI checks execute successfully or explicitly report permitted skips. |
| AC-10 | The test matrix links dated evidence for required behavior and accurately labels simulated versus live verification. |
| AC-11 | Core forms provide usable error recovery, keyboard interaction and tested desktop/mobile layouts. |

MVP acceptance requires these conditions to be demonstrated against the approved release environment. An existing demonstration may supply evidence when its tested version and results are recorded; affected scenarios require verification after relevant changes.

## 12. Configuration and scope control

The selected baseline is: no video-verification feature, no-transfer closure for disputes from either participant, 3 starter credits, 1 credit per normally confirmed lesson, and deferred sorting/notification-filter features. Implementation and shared-environment deployment remain separate activities. Subsequent scope revisions shall identify the decision, rationale and affected requirements/acceptance criteria. Administrator appointment procedures and release exceptions must be recorded before production acceptance.

## 13. Milestone-to-MVP change record

Baseline comparison: progress report dated October 6, 2026, sections “Updated Scope and Requirements,” “Features in Progress” and “Future Plans.”

| Area | Milestone baseline | Selected MVP treatment |
| --- | --- | --- |
| Core application | Accounts, profiles, skills, discovery, exchange lifecycle, disputes and dashboard | Retained; specified through functional requirements and acceptance criteria |
| Starting credits | 3 credits per account | Retained; conflicting secondary documentation must be corrected |
| Video verification | Implemented signup upload; final requirement unresolved | Deferred; signup no longer requires a video; existing content receives restricted access |
| Dispute eligibility | Both teachers and learners can report problems | Retained for accepted, unsettled exchanges; participant access must be completed in the interface |
| Dispute outcomes | Unresolved business decision | One outcome: close without transferring credits; no refunds, grants or forced payments |
| Suggested tags | In progress; migration from mock data planned | Retained; current main derives suggestions from real listing tags |
| Search sorting | In progress | Explicitly deferred |
| Notification/activity filters | In progress | Filtering/sorting deferred; existing activity links retained |
| Learner/teacher discovery toggle | Known limitation | Teacher-only discovery retained; alternate discovery mode deferred |
| Testing, security, documentation and CI | Existing work and continued validation planned | Retained and extended through release acceptance; not presented as newly implemented features |

**Revision history:** v1.0 — repository-derived scope. v1.1 — technical requirements format. v1.2 — selected video/dispute policies, preserved reporting by either participant, and recorded milestone scope deferrals.
