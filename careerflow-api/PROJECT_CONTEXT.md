# Project Context

## Authentication Test Results

Based on running test-auth.js, the authentication system appears to be working correctly:

### Registration Flow
- Valid registration succeeds (returns access token)
- Duplicate email correctly returns 409 with message "Email is already in use"
- Invalid email correctly returns 422 with validation error "Invalid email address"
- Weak password correctly returns 422 with validation error "Password must be at least 8 characters"

### Login Flow
- Valid credentials login succeeds
- Wrong password correctly returns 401 with message "Invalid credentials"
- Non-existent email correctly returns 401 with message "Invalid credentials"

### Protected Routes
- GET /me with valid token works correctly
- GET /me without token correctly returns 401 with message "Not authenticated"
- GET /me with invalid token correctly returns 401 with message "Invalid or expired access token"

### Token Refresh & Logout
- Refresh token works via cookie-based authentication
- Logout works and clears refresh token cookie

### Summary
All 12 test cases passed. The authentication system is functional and properly handles:
- User registration with validation
- User login with credential verification
- Token-based authentication for protected routes
- Token refresh mechanism
- Session logout

The tests demonstrate that the JWT-based authentication system is working as expected, including proper error handling and security validations.

## Phase 17 — AI Interview Preparation Test Results

New endpoint: `POST /api/interviews/:id/preparation` (JWT required). Generates personalized
interview questions from the linked Job + Profile/Resume, persists them (dedicated
`InterviewPreparation` model, unique `{user, interview}`), and reuses the cached preparation
on subsequent requests (no second AI call). `AI_MOCK=true` returns a deterministic 6-question
mock; `AI_MOCK=false` uses Gemini. Malformed AI output is rejected with 502.

New suite: `test/test-interview-preparation.js` — 47/47 assertions passed (mock mode):
- Valid generation, response schema, missing/invalid JWT, malformed/nonexistent/cross-user
  interview IDs (404/400/401), neither-Profile-nor-Resume (400), profile-only and resume-only
  (200), persistence (countDocuments = 1), reuse (identical payload, no second creation),
  missing application/job (400), unit-level `normalizePreparation` rejection of malformed AI
  output (502), existing routes unaffected.

Full regression after Phase 17: 16/16 suites green. Counted suites: 344/344 explicit
assertions (297 existing Phases 8-16 + 47 new), plus the 6 status-based core suites
(auth/jobs/profile/resume/applications/interviews) all pass. No business-logic regressions;
`ai.service.js` was extended additively (`generateInterviewPreparationJSON` + mock), leaving
`generateStructuredJSON` behavior unchanged.

Test harness note: run suites with `AI_MOCK=true` set in the test process env too (not only
the server), otherwise `test-ai-analysis.js` fails its `AI_MOCK enabled in test env`
precondition check.

## Phase 18 - AI Interview Practice & Evaluation Test Results

New endpoints (all JWT protected, under `/api/interviews/:id`):
- `POST /:id/practice` (201) - create a practice session from the persisted
  InterviewPreparation. Questions are snapshotted (question/category/difficulty). No unique
  `{user, interview}` constraint: multiple sessions per interview are allowed.
- `GET /:id/practice` - list the user's sessions for that interview (newest-first).
- `GET /:id/practice/:pid` - get one session (cross-user -> 404).
- `POST /:id/practice/:pid/answers` (200) - submit/overwrite an answer. Same trimmed answer
  is short-circuited before any AI call (attemptCount unchanged); a changed answer is
  re-evaluated, replaces the slot, and increments attemptCount. Whitespace-only answer -> 400
  "Answer is required". Out-of-range questionIndex -> 400. Completed sessions reject new
  answers (400 "Practice already completed"). Auto-completes when all slots are evaluated.
- `POST /:id/practice/:pid/complete` - complete the session (idempotent); computes a
  deterministic Practice Summary from the persisted evaluations (no AI call).
- `DELETE /:id/practice/:pid` - delete the session.

Architecture: dedicated `PracticeSession` model with embedded `answers[]` (each holding
questionIndex/question/category/difficulty/answer/attemptCount/evaluation/answeredAt),
`status` (`not_started|in_progress|completed`), `summary`, `completedAt`. Evaluation schema:
score/technicalScore/communicationScore/behavioralScore (integers 0-100, clamped + rounded in
`normalizeEvaluation`), strengths[]/weaknesses[] (max 5, truncated), feedback (max 300),
suggestedAnswer (max 500). `AI_MOCK=true` returns a deterministic evaluation
(score = 70 + hash(questionText)%11, etc.); malformed AI output -> 502; provider failure
-> 503. AI layer extended additively (`generateAnswerEvaluationJSON` + mock) - existing
functions unchanged.

New suite: `test/test-interview-practice.js` - 108/108 assertions passed (mock mode):
session creation/schema, list/get/delete, no-preparation (400), 404s (missing prep, cross-user,
nonexistent session), malformed ids (400), JWT (401), Zod validation (422) and service
validation (400) of answer/body, answer evaluation + slot replacement, same-answer reuse
(cache, attemptCount unchanged), whitespace-only answer (400), out-of-range index (400),
auto-complete, explicit complete (idempotent, summary present, rejects new answers), summary
schema, cross-session isolation, and unit-level `normalizeEvaluation`/`computeSummary`.

Full regression after Phase 18: 16/16 suites green, 0 failures. Counted suites: 452/452
explicit assertions (344 Phases 8-17 + 108 new), plus the 6 status-based core suites
(auth/jobs/profile/resume/applications/interviews) all pass. No business-logic regressions.

## Phase 19 - Interview History + Analytics + Dashboard Test Results

New read-only analytics API (all JWT protected, mounted at `/api/analytics`, no AI calls):
- `GET /api/analytics/history` - paginated practice-session history, newest-first, with
  optional `status`, `interview`, `page`, `limit` filters. Lean items: `interview` (title/
  type/scheduledDate/status), `job` (title/company), `answeredCount`, `totalQuestions`
  (derived from answers.length), `summary`, `completedAt`. Raw answers/user/preparation
  fields are NOT returned.
- `GET /api/analytics/dashboard` - one-call payload: `totals` (session counts + answered/
  total questions), `averages` (over COMPLETED session summaries; null if none),
  `bestSession` (highest overall, tie-break latest completedAt then _id), `recentSessions`
  (latest 5 completed), `trend` (all completed ascending by completedAt), `strongAreas`/
  `weakAreas` (top 5 by frequency across all evaluations).
- `GET /api/analytics/trends` - `completedCount` + `trend` array (sessionId/completedAt/
  overallScore), ascending.
- `GET /api/analytics/areas?limit=N` - strong/weak area counts (`limit` default 5, clamped
  1-10).
- `GET /api/analytics/performance` - question/evaluation-level averages (NOT session
  summaries) + `byCategory` (technical/behavioral/situational counts + average score) +
  `averageAttemptsPerQuestion`.

Aggregation is deterministic in-JS (same strategy as `aiAnalysis.service.getSummary()`):
every query is scoped by `{ user: userId }`; no AI calls; `ai.service.js` untouched.
New additive indexes on `PracticeSession`: `{user, status, createdAt: -1}` and
`{user, status, completedAt: -1}`.

New suite: `test/test-analytics.js` - 157/157 assertions passed (mock mode): history list/
shape (no answers/user leak)/status+interview filters/pagination, cross-user isolation,
401 coverage on all 5 endpoints, dashboard totals/averages (predicted exactly from the
deterministic mock evaluation)/best/recent/trend/strong+weak, trends, areas (limit clamp),
performance averages + byCategory, empty-user behavior (zeros/null/empty arrays), unit-level
`aggregateAreas`/`computeScoreAverages`, existing routes still work.

Full regression after Phase 19: 17/17 suites green, 0 failures. Counted suites: 609/609
explicit assertions (452 Phases 8-18 + 157 new), plus the 6 status-based core suites
(auth/jobs/profile/resume/applications/interviews) all pass. No business-logic regressions;
`app.js` gained one additive mount (`/api/analytics`).

## Stage 7.4 - Career Direction Flow Verification Results

Scope: verify + harden the existing flow (Mode -> Input -> Validate -> Generate ->
AI Preview -> Edit -> Confirm -> Persist -> Detail -> AI Metadata) with frontend automated
tests, safe live behavioral runs, and a manual walkthrough. No backend feature/AI behavior,
API contracts, or routing changed.

### Production bug fixed (found by the new FE tests)
`careerflow-frontend/src/pages/CareerDirectionCreatePage.jsx`: `validateDraft` crashed on
mount because `draftFormState` initializes to `null` and the default parameter only guarded
`undefined`, so `draft.title` threw. Fix: `validateDraft(draft)` with `draft ??= {}`. No other
production logic changed; all validation behavior for real drafts is preserved.

### Frontend test infrastructure (new)
Vitest 4.1.11 + jsdom + @testing-library/react 16 + jest-dom + user-event 14 in
`careerflow-frontend` (dedicated `vitest.config.js`, `src/test/setup.js`, `src/test/fixtures.js`).
New `test` / `test:watch` scripts. No Playwright/Cypress/MSW.

### Frontend automated tests
`npm test` (careerflow-frontend): 5 test files, 50/50 PASS. Suites:
- `src/api/careerDirections.api.test.js` (7) - payload boundaries (generate/create with
  generationMetadata/list/get/update/delete), client mocked, no real HTTP.
- `src/components/careerDirections/CareerDirectionPreview.test.jsx` (12) - content, metadata
  block, edit/confirm/back/cancel dialogs, invalid-fields warning, confirm error.
- `src/components/careerDirections/CareerDirectionForm.test.jsx` (5) - AI-edit hydration,
  title edit, dirty-state gating, empty-title block, cancel.
- `src/components/careerDirections/CareerDirectionCreatePage.test.jsx` (17) - wizard state
  machine: manual redirect, all three AI modes, validation blocks, generate + preview,
  generation error, regenerate dialog, edit->save->preview (metadata intact), edit block,
  confirm -> createCareerDirectionApi with generationMetadata -> navigate to detail,
  persistence error.
- `src/pages/CareerDirectionDetailPage.test.jsx` (8) - loading, render, load error/retry,
  AI Details expand/collapse, metadata fields, metadata-absent, delete flow.

### Frontend lint
`npm run lint` (careerflow-frontend): exit 0. Only pre-existing warnings in untouched
production files (react/only-export-components); no errors, none from new test files.

### Backend regression
`npm test` (careerflow-api): 4 files, 63/63 PASS.

### Live behavioral tests (isolated)
Run with `AI_MOCK=true`, `DATABASE_NAME=careerflow_e2e_test`, dedicated server on port 5001.
`MONGODB_URI` untouched; primary `careerflow` DB not targeted.
- `test/test-career-direction-generation.js`: 33/33 PASS (valid generation for all 3 modes +
  deterministic mock metadata, Zod validation 422s, auth 401, no persistence boundary writes,
  cleanup).
- `test/test-career-directions.js`: 38/38 PASS (create/list/get/update/delete, cross-user
  security, migration, cleanup).
- Post-run verification: isolated DB had 0 leftover careerdirections/resumes for test users;
  primary `careerflow` DB had 0 test-user directions. Real Gemini provider NOT called
  (mock-only, deterministic outputs confirmed).

### Manual browser verification (walkthrough)
Frontend Vite dev server served at `/career-directions/create` (HTTP 200 SPA entry).
8 manual scenarios executed live against an AI_MOCK=true server on an isolated DB:
34/34 PASS covering AI from Idea (metadata ai_from_idea + deterministic title), AI from
Background (contextSources resume), From Role Template (template_based), validation (422 on
missing input), Preview/Edit -> Confirm/Persist (edited title saved, AI fields +
generationMetadata intact), Detail/AI Metadata (mode/model/requestId correct), Reload/
Regression (refetch + list retain all data). Note: an earlier walkthrough attempt hit a stale
pre-existing server still bound to port 5000 (created test data in the primary DB); that data
was located and fully deleted, then the walkthrough was re-run cleanly against a dedicated
port 5002 server with the isolated DB - 34/34 PASS with zero primary-DB footprint.

### Git
Stage 6.3/7.3/7.4 work committed together (frontend + backend). See commit for the full diff.

## Stage 8 - Jobs + AI Matching Frontend Verification Results

Scope: verify + harden the existing Jobs + AI Matching frontend flow with targeted Vitest/RTL
tests, and fix confirm-provided stale-state defects found during verification. No new features,
no Playwright/Cypress/MSW, no backend logic changes.

### Production bugs fixed (found + verified by the new FE tests)
1. `careerflow-frontend/src/pages/JobDetailPage.jsx` - per-job state (match, application,
   errors, loading) was NOT reset when navigating between job routes, leaking stale
   match/application/error state from a previously-viewed job. Fix: new `useEffect(() =>
   {...}, [id])` (first effects block) that resets `job`/`loadError`/`loading`/`match`/
   `matchError`/`analyzing`/`selectedCareerDirectionId`/`applicationId`/`applied`/`applying`/
   `applyError` whenever the route `id` changes. Covered by the `regression: does not leak
   stale match/application state when the route id changes` test (job_1 -> job_2 navigation
   via a real link).
2. `careerflow-frontend/src/pages/JobFormPage.jsx` + `src/components/jobs/JobForm.jsx` -
   navigating from edit mode (`/jobs/:id/edit`) to create mode (`/jobs/new`) leaked the
   previous job's hydrated values into the create form. Fix: JobFormPage gained a create-mode
   branch in its load effect (`setInitialValues(emptyJobForm()); setLoading(false);
   setLoadError(null)`), AND JobForm now syncs its internal form state when the
   `initialValues` prop changes (a `useEffect(() => setForm(initialValues), [initialValues])`),
   because JobForm's internal `useState(initialValues)` alone could not be reset after a
   key-remount with stale props. Covered by the `create mode does not retain stale
   initialValues after edit mode` test (edit -> /jobs/new via a real link).
3. `careerflow-frontend/src/components/Pagination.jsx` - rendered literal `` ` · {total}
   total` `` (missing `$` before `{total}`), so the total count displayed as literal
   `{total} total`. Fix: `` ` · ${total} total` ``. Covered by the `shows a pagination control`
   test (asserts exact `Page 1 of 2 · 2 total`).

### Frontend automated tests
`npm test` (careerflow-frontend): 13 files, 129/129 PASS. New/modified Stage 8 suites:
- `src/api/jobs.api.test.js` (11) - list/get/create/update/delete/match API wrappers,
  client mocked, no real HTTP.
- `src/utils/jobForm.test.js` (10) - `emptyJobForm` (fresh object per call, defaults kept),
  `hydrateJobForm` (skills array -> comma list, nested salary flattening), `buildJobPayload`
  (trim, empty-string stripping, skills list -> array, salary object incl. default currency).
- `src/utils/validators.test.js` (8) - required title/company, invalid source URL, valid
  payload passes, whitespace-only rejected.
- `src/components/jobs/JobForm.test.jsx` (10) - create/edit hydration, required-field
  validation, URL validation, payload build, initialValues re-sync reset.
- `src/components/jobs/JobFitAnalysis.test.jsx` (9) - score gauge, matched/missing skills,
  strengths/weaknesses, recommendations, analyzing state, error + Try again, missing-profile
  call-to-action, re-analyze.
- `src/pages/JobsPage.test.jsx` (13) - loading/success/empty states, filters, debounce
  (fake timers), pagination, delete confirm/cancel/error + last-page step-back, load error +
  retry, add-job link. The 50 pre-existing Stage 7.4 tests are still green.
- `src/pages/JobFormPage.test.jsx` (5) - create/edit load, create/update submit + navigate,
  stale create-mode reset regression.
- `src/pages/JobDetailPage.test.jsx` (15) - loading, full render (status/salary/meta/
  description/skills/notes), load error + retry, not-found, directions selector, analyze
  (with/without career direction + loading + error recovery), cached match, re-analyze,
  existing application state, apply flow, edit link, id-change regression.

### Frontend lint
`npm run lint` (careerflow-frontend): exit 0. Only pre-existing warnings in untouched
production files (react/only-export-components); none from Stage 8 files.

### Frontend build
`npm run build` (careerflow-frontend): succeeds (`vite build`, 1910 modules, dist
index-*.js/css emitted).

### Backend regression
`npm test` (careerflow-api): 6 files, 85/85 PASS (including `db-lifecycle.test.js`, `storage.service.test.js`, and career direction generation/validation).

### Live behavioral verification
Verified across all 19 relevant live E2E suites in an isolated test environment (`AI_MOCK=true`, `DATABASE_NAME=careerflow_e2e_test`):
- All Jobs and AI matching suites (`test/test-jobs.js`, `test-job-filters.js`, `test-match.js`, `test-ai-analysis.js`, `test-ai-analysis-delete.js`, `test-ai-analyses.js`, `test-ai-analysis-summary.js`): 100% PASS.
- Legacy matching suites were aligned with the current Career Direction / Base Resume contract.
- All Application, Interview, Preparation, Practice, and Analytics suites pass.
- Frontend behavior verified by the 13 Vitest suites (130/130 PASS); backend behavior verified by the 6 Vitest suites (85/85 PASS) and 19 live E2E suites.