# SkillSwap Minimum Viable Product Specification

**Last Updated:** 2026-10-20  
**Version:** 1.1  
**Status:** Proposed MVP specification; video and dispute policies are pending approval.

> **Source Baseline:** Requirements are based on `main` at commit `fcf331290ec6c347a244ed2910cabf58081a7512`. Proposed requirements are distinguished from existing implementation behavior.

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
| File storage | Supabase Storage | Video storage and authorized retrieval under the selected video policy |
| Quality assurance | Node-based tests, ESLint, Vite and GitHub Actions | Automated checks, production compilation and test evidence |

Authorization and credit integrity must be enforced by the backend. Frontend validation, hidden controls and client query filters are supplementary controls.

## 3. Actors

| Actor | Permitted operations |
| --- | --- |
| Visitor | Register, authenticate and request password recovery |
| Authenticated user | Manage an owned profile and skill listings; view permitted public member information |
| Learner | Request another user's teacher listing; confirm a completed lesson or submit a dispute |
| Teacher | Accept or decline incoming requests; mark accepted lessons complete |
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
- **FR-18:** The designated learner shall be able to confirm a teacher-marked-complete lesson or report a problem before settlement.
- **FR-19:** Successful confirmation shall atomically transfer one credit from the learner to the teacher and mark the exchange completed.
- **FR-20:** The backend shall reject unauthorized actors, invalid state transitions and duplicate settlement attempts.

### 4.5 Dashboard and dispute management

- **FR-21:** The dashboard shall display the user's balance, incoming requests, active exchanges, teacher listings and exchange-related activity.
- **FR-22:** Earned and spent summaries shall agree with completed exchanges after navigation or reload. Continuous realtime updates are not required.
- **FR-23:** A learner shall be able to submit a reason and explanation for a problem with an eligible exchange.
- **FR-24:** Administrators shall be able to review disputes and apply the approved resolution outcomes defined in section 7.
- **FR-25:** Dispute submission and exchange blocking shall be consistent. Resolution, settlement and audit recording shall execute atomically.

## 5. Exchange state model

| Current state | Action | Authorized actor | Resulting state | Credit effect |
| --- | --- | --- | --- | --- |
| No exchange | Submit valid request | Learner | `pending` | None |
| `pending` | Accept | Designated teacher | `accepted` | None |
| `pending` | Decline | Designated teacher | `declined` | None |
| `accepted` | Mark lesson complete | Designated teacher | `session_completed` | None |
| `session_completed` or legacy `awaiting_confirmation` | Confirm lesson | Designated learner | `completed` | Learner −1; teacher +1 |
| `session_completed` or legacy `awaiting_confirmation` | Submit dispute | Designated learner | `issue_reported` | None; ordinary confirmation blocked |
| `issue_reported` | Resolve without payment | Authorized administrator | Closed without payment | None |
| `issue_reported` | Resolve in favor of payment | Authorized administrator | `completed` | Learner −1; teacher +1, once |

“Closed without payment” is a proposed terminal outcome. Its database representation must be implemented; it is not an existing exchange status on the reviewed baseline. Dispute case statuses remain distinct from exchange statuses: `open`, `under_review` and `resolved`.

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

## 7. Configurable release policies

### 7.1 Verification videos — proposed policy

Videos are optional and shall not block registration, learning, skill publication or exchange requests. Access is restricted to the uploader and authorized administrators. Uploading a video does not establish verified identity or verified skill quality. Automated analysis, verification badges and a video approval queue are outside scope.

**Implementation gap:** Registration currently requires a video, and the SQL configures public storage. Adopting this policy requires removing the mandatory gate, restricting reads, handling authenticated upload timing and providing accurate upload-failure feedback. Existing stored files require a reviewed migration plan rather than automatic deletion.

**Decision status:** Pending approval; may be revised without changing the remaining MVP definition.

### 7.2 Dispute settlement — proposed policy

A learner may dispute an eligible lesson before credit settlement. An open dispute prevents ordinary confirmation. Each resolution requires an administrator identity, explanation, timestamp and recorded outcome.

| Outcome | Required behavior |
| --- | --- |
| Close without payment | Close the exchange without a credit transfer and preserve dispute history. No refund is issued because the learner was not previously charged. |
| Pay teacher | Transfer exactly one existing credit from the learner to the teacher, complete the exchange and record the resolution in one transaction. |

Insufficient funds shall reject payment resolution without marking the dispute resolved or changing balances. Repeated resolution attempts shall not duplicate settlement. Automatic compensation credits, debt, escrow, appeals and post-settlement reversals are excluded.

**Implementation gap:** The current administrator interface changes case status and grants a separate credit to the reporter. Those operations do not implement the settlement outcomes above. Credit grants are excluded from the normal dispute-resolution path unless a separate compensation policy is approved.

Resolution communication uses manual administrative email follow-up through the existing email link. Automatic email delivery and guaranteed response times are not MVP requirements; interface text must accurately reflect the supported process.

**Decision status:** Pending approval; may be revised before implementation.

## 8. Nonfunctional requirements

- **NFR-01 — Security:** Database permissions, RLS and function guards shall enforce record ownership, exchange participation, administrator privileges and approved video access.
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
| Accounts | Registration, authentication, sessions and recovery | Verify real recovery/redirect behavior and align registration with the selected video policy |
| Profiles and skills | Profile editing, public profiles, preset avatars and listing CRUD | Verify backend privacy/ownership and safe deletion with dependent exchanges |
| Discovery | Database listings, text search, tag suggestions and facet filters | Preserve filter composition, listing freshness and request-link correctness |
| Exchanges and credits | Request/response pages, teacher completion, learner confirmation and transactional settlement SQL | Enforce actor/state rules and verify replay, concurrency and insufficient-credit behavior |
| Dashboard | Balance, pending/active exchanges, activity and aggregate credit summaries | Verify consistency after operations and incorporate final dispute outcomes |
| Administration | Dispute records, status changes, action history and credit grants | Remove editable-metadata trust and implement consistent dispute settlement/auditing |
| Storage | Video upload and storage policies | Apply the selected requirement and read-access policy |
| Repository and CI | README, test matrix, service/security tests and workflow configuration | Supply missing base database definitions/policies, correct setup dependencies, reconcile credit documentation and verify workflow execution |

Current source evidence and specific gaps are documented in [MVP_REPOSITORY_REVIEW.md](MVP_REPOSITORY_REVIEW.md). Local uncommitted browser tests are supplementary artifacts and are not part of the reviewed `main` baseline.

## 10. Excluded functionality

The MVP excludes theme switching; new review/rating interfaces; direct chat; built-in video conferencing; calendar scheduling and rescheduling; payments or credit purchases; variable pricing and hourly accounting; escrow; direct barter matching; distance/rating sorting; automated recommendations; automated video verification; native mobile applications; and expanded administrative account-management tools.

Teacher and Learner listing types remain supported in portfolios, but discovery of learner requests by teachers is excluded. Lessons take place outside the application. Delivery-format fields describe those arrangements rather than providing conferencing or booking services.

Existing database tables and unused prototypes do not expand release scope. Exclusions must be reconciled with any binding project requirements before scope approval.

## 11. MVP acceptance criteria

| ID | Acceptance condition |
| --- | --- |
| AC-01 | Registration provisions one profile and exactly 3 credits; sign-in/out and a real password-recovery flow succeed. |
| AC-02 | Profile and listing changes persist and appear consistently across relevant screens. |
| AC-03 | An authenticated learner can discover a teacher, request a lesson, receive acceptance, observe teacher completion and confirm the lesson. |
| AC-04 | Confirmation transfers exactly one credit, completes the exchange and produces consistent dashboard balances and summaries. |
| AC-05 | Declined requests transfer no credits; insufficient funds, invalid actors/states and replayed/concurrent settlement preserve data integrity. |
| AC-06 | Both approved dispute outcomes execute consistently and produce complete audit records without duplicate payment. |
| AC-07 | Direct API checks reject unauthorized record mutation and administrator self-promotion; legitimate administrative operations succeed. |
| AC-08 | Video requirements and read permissions match the approved policy, including denial of unauthorized access. |
| AC-09 | An independent environment can be configured using the documented setup, and the required CI checks execute successfully or explicitly report permitted skips. |
| AC-10 | The test matrix links dated evidence for required behavior and accurately labels simulated versus live verification. |
| AC-11 | Core forms provide usable error recovery, keyboard interaction and tested desktop/mobile layouts. |

MVP acceptance requires these conditions to be demonstrated against the approved release environment. An existing demonstration may supply evidence when its tested version and results are recorded; affected scenarios require verification after relevant changes.

## 12. Configuration and scope control

Before release, approve the video policy, dispute outcomes, starter-credit allocation, administrator appointment process and known exceptions. Subsequent scope changes shall identify affected requirements and acceptance criteria. Completion of this specification is separate from implementation completion and deployment approval.

**Revision history:** v1.0 — initial repository-derived scope. v1.1 — technical requirements format; removed individual assignments and conversational project commentary.
