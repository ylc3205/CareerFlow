# CareerFlow — REST API Catalog & Integration Reference

> Exhaustive contract specifications for all 39 REST endpoints across the CareerFlow backend API.

---

## Standard Response Envelopes

### Success Envelope (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

### Error Envelope (`400`, `401`, `403`, `404`, `422`, `429`, `500`, `502`, `503`)
```json
{
  "success": false,
  "message": "Specific error explanation",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

---

## 1. Health & Diagnostics API

### `GET /api/health/live`
- **Auth**: None
- **Rate Limit**: None
- **Purpose**: Kubernetes/Docker process liveness probe.
- **Success (200)**:
```json
{
  "success": true,
  "status": "alive",
  "message": "Process is alive",
  "timestamp": "2026-10-02T00:00:00.000Z"
}
```

### `GET /api/health/ready`
- **Auth**: None
- **Rate Limit**: None
- **Purpose**: Kubernetes readiness probe. Verifies database connectivity and checks that the server is not draining.
- **Success (200)**:
```json
{
  "success": true,
  "status": "ready",
  "db": "connected",
  "message": "Server is ready to receive traffic",
  "timestamp": "2026-10-02T00:00:00.000Z"
}
```
- **Error (503 Service Unavailable)**:
```json
{
  "success": false,
  "status": "unavailable",
  "db": "disconnected",
  "shuttingDown": false,
  "message": "Database is disconnected",
  "timestamp": "2026-10-02T00:00:00.000Z"
}
```

### `GET /api/health`
- **Auth**: None
- **Rate Limit**: None
- **Purpose**: Comprehensive health overview (backward-compatible).
- **Success (200)**:
```json
{
  "success": true,
  "status": "healthy",
  "db": "connected",
  "message": "CareerFlow API is operational",
  "timestamp": "2026-10-02T00:00:00.000Z"
}
```

---

## 2. Authentication API

### `POST /api/auth/register`
- **Auth**: None
- **Rate Limit**: `authLimiter` (30 attempts / 15m)
- **Body**:
```json
{
  "email": "developer@careerflow.io",
  "password": "Password123!"
}
```
- **Success (201 Created)**: Sets `refreshToken` HTTP-Only cookie.
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "672410a8f13b90001a111111",
      "email": "developer@careerflow.io",
      "createdAt": "2026-10-02T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

### `POST /api/auth/login`
- **Auth**: None
- **Rate Limit**: `authLimiter` (30 attempts / 15m)
- **Body**:
```json
{
  "email": "developer@careerflow.io",
  "password": "Password123!"
}
```
- **Success (200 OK)**: Sets `refreshToken` HTTP-Only cookie.
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "672410a8f13b90001a111111",
      "email": "developer@careerflow.io"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

### `POST /api/auth/refresh`
- **Auth**: `refreshToken` Cookie
- **Rate Limit**: None
- **Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

### `POST /api/auth/logout`
- **Auth**: None
- **Rate Limit**: None
- **Success (200 OK)**: Clears `refreshToken` cookie.
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### `GET /api/auth/me`
- **Auth**: Bearer JWT
- **Rate Limit**: None
- **Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "672410a8f13b90001a111111",
      "email": "developer@careerflow.io"
    }
  }
}
```

---

## 3. Dashboard API (Composite)

### `GET /api/dashboard/overview`
- **Auth**: Bearer JWT
- **Rate Limit**: None
- **Purpose**: Collapses 4+ frontend waterfall queries into a single round-trip database aggregation.
- **Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "jobs": 14,
      "applications": 8,
      "interviews": 3,
      "offers": 1
    },
    "pipeline": {
      "totalApplications": 8,
      "byStatus": {
        "applied": 3,
        "screening": 2,
        "interviewing": 2,
        "offer": 1
      }
    },
    "nextInterview": {
      "_id": "672410a8f13b90001a222222",
      "title": "System Design Interview",
      "scheduledDate": "2026-10-05T14:00:00.000Z",
      "meetingLink": "https://meet.google.com/xyz-abc",
      "application": {
        "_id": "672410a8f13b90001a333333",
        "job": {
          "title": "Senior Backend Engineer",
          "company": "TechCorp"
        }
      }
    },
    "practice": {
      "totals": { "totalSessions": 5, "completedSessions": 4, "totalQuestions": 24, "answeredQuestions": 24 },
      "averages": { "overallScore": 84, "technicalScore": 86, "communicationScore": 82, "behavioralScore": 84 },
      "bestSession": { "overallScore": 92 }
    }
  }
}
```

---

## 4. Jobs & Match API

### `GET /api/jobs`
- **Auth**: Bearer JWT
- **Query Params**: `page` (default 1), `limit` (default 10), `q` (search title/company), `status`, `workplaceType`, `employmentType`
- **Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "_id": "672410a8f13b90001a444444",
        "title": "Senior Backend Engineer",
        "company": "TechCorp",
        "location": "Remote, US",
        "employmentType": "full-time",
        "workplaceType": "remote",
        "status": "saved",
        "skills": ["Node.js", "Express", "MongoDB", "Redis"],
        "createdAt": "2026-10-01T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}
```

### `POST /api/jobs`
- **Auth**: Bearer JWT
- **Body**:
```json
{
  "title": "Senior Backend Engineer",
  "company": "TechCorp",
  "location": "Remote",
  "employmentType": "full-time",
  "workplaceType": "remote",
  "skills": ["Node.js", "MongoDB"],
  "sourceUrl": "https://jobs.example.com/senior-backend"
}
```
- **Success (201 Created)**: Returns created job document.

### `GET /api/jobs/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Full job detail document.

### `GET /api/jobs/:id/context`
- **Auth**: Bearer JWT
- **Purpose**: Pre-hydrated composite: Job details + active user application (if any) + all user Career Directions.
- **Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "job": { "_id": "672410a8f13b90001a444444", "title": "Senior Backend Engineer", "company": "TechCorp" },
    "application": { "_id": "672410a8f13b90001a555555", "status": "applied" },
    "careerDirections": [{ "_id": "672410a8f13b90001a666666", "title": "Lead Backend Architect" }]
  }
}
```

### `PATCH /api/jobs/:id`
- **Auth**: Bearer JWT
- **Body**: Partial update fields (`status`, `notes`, `salary`, etc.).
- **Success (200 OK)**: Returns updated job.

### `DELETE /api/jobs/:id`
- **Auth**: Bearer JWT
- **Behavior**: Soft deletes job (`isDeleted: true`, sets `deletedAt`).
- **Success (200 OK)**: `{ "success": true, "message": "Job deleted successfully" }`

### `POST /api/jobs/:id/match`
- **Auth**: Bearer JWT
- **Rate Limit**: `aiLimiter` (30 req / 1m)
- **Body**: `{ "careerDirectionId": "optional_id" }`
- **Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "matchScore": 86,
    "skillsScore": 90,
    "experienceScore": 85,
    "backgroundScore": 80,
    "matchedSkills": ["Node.js", "Express", "MongoDB"],
    "missingSkills": ["Redis", "Kubernetes"],
    "strengths": ["Strong backend fundamentals and REST API experience"],
    "weaknesses": ["Limited distributed cache experience"],
    "recommendations": ["Highlight system scalability in CV and learn Redis fundamentals"],
    "careerDirectionId": null,
    "candidateSourceType": "general"
  }
}
```

---

## 5. Applications API

### `GET /api/applications`
- **Auth**: Bearer JWT
- **Query Params**: `page`, `limit`, `status`, `job`
- **Success (200 OK)**: Paginated applications with populated lean job data (`title`, `company`, `location`, `status`).

### `POST /api/applications`
- **Auth**: Bearer JWT
- **Body**: `{ "job": "job_object_id", "status": "applied", "coverLetter": "...", "notes": "..." }`
- **Success (201 Created)**: Created application document.

### `GET /api/applications/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Full application with populated job details.

### `PATCH /api/applications/:id`
- **Auth**: Bearer JWT
- **Body**: `{ "status": "interviewing", "notes": "Passed phone screening" }`
- **Success (200 OK)**: Returns updated application.

### `DELETE /api/applications/:id`
- **Auth**: Bearer JWT
- **Behavior**: **Atomic Cascade Deletion**: Safely and atomically deletes the application, all linked interviews, interview preparations, and practice sessions in a single database transaction.
- **Success (200 OK)**: `{ "success": true, "message": "Application deleted successfully" }`

---

## 6. Interviews & Practice API

### `GET /api/interviews`
- **Auth**: Bearer JWT
- **Query Params**: `application`, `status`
- **Success (200 OK)**: Array of scheduled/completed interviews.

### `POST /api/interviews`
- **Auth**: Bearer JWT
- **Body**:
```json
{
  "application": "app_object_id",
  "title": "Technical Round 1",
  "type": "video",
  "scheduledDate": "2026-10-10T15:00:00.000Z",
  "interviewerNames": "Alex Rivera",
  "meetingLink": "https://zoom.us/j/123456789"
}
```
- **Success (201 Created)**: Created interview.

### `GET /api/interviews/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Interview details with linked application and job.

### `PATCH /api/interviews/:id`
- **Auth**: Bearer JWT
- **Body**: Partial updates (`status`, `scheduledDate`, `notes`, `feedback`).
- **Success (200 OK)**: Updated interview.

### `DELETE /api/interviews/:id`
- **Auth**: Bearer JWT
- **Behavior**: Deletes interview along with linked preparation questions and practice sessions.
- **Success (200 OK)**: `{ "success": true, "message": "Interview deleted successfully" }`

### `GET /api/interviews/:id/preparation`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Returns cached interview preparation questions.

### `POST /api/interviews/:id/preparation`
- **Auth**: Bearer JWT
- **Rate Limit**: `aiLimiter` (30 req / 1m)
- **Purpose**: Generates and persists targeted interview questions based on the candidate's Profile/Resume and the linked Job. Reuses cached preparation if already generated.
- **Success (200 OK / 201 Created)**:
```json
{
  "success": true,
  "data": {
    "preparation": {
      "_id": "672410a8f13b90001a777777",
      "interview": "672410a8f13b90001a222222",
      "questions": [
        {
          "question": "How do you design a resilient retry mechanism for external API failures?",
          "category": "technical",
          "difficulty": "medium"
        }
      ]
    }
  }
}
```

### `POST /api/interviews/:id/practice`
- **Auth**: Bearer JWT
- **Purpose**: Creates an interactive mock practice session snapshotting the preparation questions.
- **Success (201 Created)**: Practice session document with `status: "not_started"`.

### `GET /api/interviews/:id/practice`
- **Auth**: Bearer JWT
- **Success (200 OK)**: List of practice sessions for this interview.

### `GET /api/interviews/:id/practice/:pid`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Full practice session state, answers, and evaluation scores.

### `POST /api/interviews/:id/practice/:pid/answers`
- **Auth**: Bearer JWT
- **Rate Limit**: `aiLimiter`
- **Body**:
```json
{
  "questionIndex": 0,
  "answer": "I implement exponential backoff with jitter and circuit breaker patterns using Polly or custom middleware."
}
```
- **Success (200 OK)**: Evaluates answer with AI (or mock), returning dimension scores (`score`, `technicalScore`, `communicationScore`, `behavioralScore`, `feedback`, `suggestedAnswer`).

### `POST /api/interviews/:id/practice/:pid/complete`
- **Auth**: Bearer JWT
- **Purpose**: Concludes session and deterministically calculates aggregate score summary without redundant AI calls.
- **Success (200 OK)**: Returns completed session with `summary` envelope.

### `DELETE /api/interviews/:id/practice/:pid`
- **Auth**: Bearer JWT
- **Success (200 OK)**: `{ "success": true, "message": "Practice session deleted successfully" }`

---

## 7. Career Directions API

### `GET /api/career-directions`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Array of career directions.

### `POST /api/career-directions`
- **Auth**: Bearer JWT
- **Body**:
```json
{
  "title": "Lead Backend Architect",
  "description": "Focusing on distributed microservices and event streaming.",
  "baseType": "resume",
  "focusSkills": ["Node.js", "Kafka", "PostgreSQL", "Docker"],
  "targetRoles": ["Backend Architect", "Staff Engineer"]
}
```
- **Success (201 Created)**: Created career direction.

### `POST /api/career-directions/generate`
- **Auth**: Bearer JWT
- **Rate Limit**: `aiLimiter`
- **Body**: `{ "mode": "ai_from_idea", "userIdea": "Transition from Frontend to Fullstack with NestJS and AWS" }`
- **Success (200 OK)**: Returns AI-generated draft direction without persisting to database.

### `GET /api/career-directions/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Full career direction details.

### `PATCH /api/career-directions/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Updated career direction.

### `DELETE /api/career-directions/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: `{ "success": true, "message": "Career direction deleted successfully" }`

---

## 8. Profile & Resume API

### `GET /api/profile`
- **Auth**: Bearer JWT
- **Success (200 OK)**: User profile document (`headline`, `bio`, `skills`, `experience`, `education`).

### `PATCH /api/profile`
- **Auth**: Bearer JWT
- **Body**: Partial update of user profile fields.
- **Success (200 OK)**: Updated profile.

### `GET /api/resume`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Active resume, draft resume (if importStatus === 'draft'), and original uploaded file metadata.

### `PATCH /api/resume`
- **Auth**: Bearer JWT
- **Body**: Cleaned resume payload (`title`, `summary`, `skills`, `experience`, `education`, `projects`, `certifications`).
- **Success (200 OK)**: Saved resume.

### `DELETE /api/resume`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Deletes resume and purges associated file from storage.

### `POST /api/resume/upload`
- **Auth**: Bearer JWT
- **Payload**: `multipart/form-data` with `file` field (PDF or DOCX, max 10MB).
- **Success (200 OK)**: Returns uploaded file metadata (`fileUrl`, `publicId`, `fileSize`, `originalFileName`).

### `POST /api/resume/parse`
- **Auth**: Bearer JWT
- **Rate Limit**: `aiLimiter`
- **Purpose**: Extracts text from the uploaded CV file and uses LLM to generate a structured draft resume.
- **Success (200 OK)**: Returns parsed draft resume in `r.draft`.

### `POST /api/resume/confirm`
- **Auth**: Bearer JWT
- **Body**: Sanitized draft resume payload. Promotes draft to primary active resume.
- **Success (200 OK)**: Returns confirmed active resume.

### `POST /api/resume/discard`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Clears draft state while keeping the uploaded CV file.

---

## 9. Analytics & AI History API

### `GET /api/analytics/dashboard`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Interview practice metrics (`totals`, `averages`, `bestSession`, `recentSessions`, `trend`, `strongAreas`, `weakAreas`).

### `GET /api/analytics/history`
- **Auth**: Bearer JWT
- **Query Params**: `page`, `limit`, `status`, `interview`
- **Success (200 OK)**: Paginated historical practice sessions.

### `GET /api/analytics/trends`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Array of `{ sessionId, completedAt, overallScore }` sorted chronologically.

### `GET /api/analytics/areas`
- **Auth**: Bearer JWT
- **Query Params**: `limit` (default 5, max 10)
- **Success (200 OK)**: Frequency count of top strong and weak technical/behavioral categories.

### `GET /api/analytics/performance`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Question-level average scores grouped by category (`technical`, `behavioral`, `situational`).

### `GET /api/analytics/applications/pipeline`
- **Auth**: Bearer JWT
- **Success (200 OK)**: `{ "totalApplications": 8, "byStatus": { "applied": 3, "screening": 2, "interviewing": 2, "offer": 1 } }`

### `GET /api/ai-analyses`
- **Auth**: Bearer JWT
- **Success (200 OK)**: List of historical job match analyses.

### `GET /api/ai-analyses/summary`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Statistical summary of match scores, top missing skills, and strengths across all analyzed jobs.

### `DELETE /api/ai-analyses/:id`
- **Auth**: Bearer JWT
- **Success (200 OK)**: Deletes individual match analysis document.
