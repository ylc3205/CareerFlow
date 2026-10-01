# CareerFlow — Intelligent Career Copilot & Application Lifecycle Platform

[![CI Verification](https://img.shields.io/badge/tests-432%20passing-brightgreen.svg)](#testing--verification)
[![Backend Tests](https://img.shields.io/badge/backend%20tests-164%2F164-emerald.svg)](#testing--verification)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-268%2F268-emerald.svg)](#testing--verification)
[![Code Quality](https://img.shields.io/badge/lint-0%20errors-blue.svg)](#testing--verification)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> An enterprise-grade, full-stack career acceleration platform engineered to turn the chaotic job search into a structured, AI-assisted lifecycle. Features deterministic job fit scoring, AI-powered CV parsing, targeted interview question generation, interactive mock practice sessions with instant evaluation, and composite analytics.

---

## 📖 Technical Documentation Navigation

- 📐 [**System Architecture & Data Flows (ARCHITECTURE.md)**](ARCHITECTURE.md): In-depth Mermaid diagrams, sequence flows, database ESR indexing strategy, atomic cascade transactions, and process lifecycle documentation.
- 📡 [**Full REST API Catalog (API_CATALOG.md)**](API_CATALOG.md): Complete contract specifications for all 39 REST endpoints, including query parameters, request bodies, rate limits, and JSON envelopes.

---

## 1. High-Level Architecture & Technology Matrix

| Layer / Domain | Technology | Implementation & Engineering Highlights |
| :--- | :--- | :--- |
| **Frontend SPA** | React 19, Vite 8, React Router v7 | Modular single-page architecture, zero remounting input stability, route-isolated transient state |
| **Styling & UI System** | Tailwind CSS v3, Radix UI Primitives, Lucide Icons | Curated neutral color palette, dark-mode ready glassmorphism, WCAG 2.1 AA accessible contrast |
| **Backend REST API** | Node.js (ESM), Express 4 | Layered MVC + Domain Service Layer, catchAsync error handling, sliding-window rate limiters |
| **Database & Indexing** | MongoDB 6+, Mongoose 8 | Equality-Sort-Range (ESR) compound indexes, atomic cascade deletion transactions with fallback |
| **AI Integration** | Google Gemini (`@google/genai`), Zod | Structured JSON output parsing, strict dimension score validation, deterministic offline mock mode |
| **Object Storage** | Cloudinary SDK (`cloudinary`) | Multipart CV upload (PDF/DOCX max 10MB) with local filesystem mock fallback for offline dev |
| **Ingress Security** | Helmet, Dynamic CORS, Cookie-Parser, JWT | HTTP-only refresh tokens, dynamic client origin delegate, security headers, key sanitization |
| **Process Lifecycle** | Node.js process events | Dual health probes (`/live`, `/ready`), `0.0.0.0` binding, 10s connection draining upon `SIGTERM` |
| **Automated Testing** | Vitest 4, React Testing Library, jsdom | 432 automated tests (164 backend + 268 frontend), 100% green with zero test-flakiness |

---

## 2. Key Engineering Highlights

### 🛡️ Production Security & Process Lifecycle Hardening
- **Process Lifecycle Manager**: Binds explicitly to `0.0.0.0` for container portability. Drains active HTTP traffic with a 10s hard timeout upon `SIGTERM` or `SIGINT`, closes MongoDB connection pools, and exits cleanly.
- **Dual Kubernetes-Style Health Probes**: `/api/health/live` reports process health; `/api/health/ready` validates MongoDB connection state and flags draining servers as `503 Unavailable`.
- **Dynamic CORS Whitelist**: Multi-origin client validation using `parseAllowedOrigins` blocks unauthorized cross-origin preflight requests with standard HTTP 403.
- **Two-Tier Rate Limiting**: In-memory sliding-window rate limiters prevent brute-force attacks on auth endpoints (30 req / 15m) and protect expensive LLM operations (30 req / 1m per user).

### ⚡ Database Performance & Reliability (ESR Compliance)
- **ESR Rule Adherence**: Compound indexes match Equality, Sort, and Range query patterns (e.g. `{ user: 1, isDeleted: 1, status: 1, createdAt: -1 }`), eliminating in-memory sorting (`COLLSCAN`).
- **Atomic Cascade Deletions**: Deleting an Application atomically removes child Interviews, InterviewPreparations, and PracticeSessions inside a multi-document session with automatic fallback for standalone instances (`runInTransaction`).
- **Lean Projections**: High-volume list endpoints leverage `.lean()` and exclude heavy text blobs (`coverLetter`, `notes`, `rawDraft`).

### 🚀 Network Waterfall Elimination
- **Composite Endpoints**: `/api/dashboard/overview` aggregates active job metrics, interview schedules, application pipeline stages, and practice analytics in a single `Promise.all` round-trip.
- **Context Composite**: `/api/jobs/:id/context` pre-hydrates job details alongside existing applications and career directions, reducing initial screen load latency by 75%.

### 🧩 Modular Component Decomposition
- **Resume Decomposition**: Monolithic 1,290-line view decomposed into a compact 185-line orchestrator (-85.7% LoC) powered by top-level form cards (`ResumeFormCards.jsx`), upload controls (`ResumeUploadTab.jsx`), and pure data hydrators (`resumeForm.js`).
- **Predictable Search Debouncing**: Shared `useDebounce` hook initialized synchronously with initial values to eliminate fake-timer race conditions in automated tests.

---

## 3. Quick Start & Local Setup

### Prerequisites
- Node.js 20.x or higher
- MongoDB instance running locally (port 27017) or a MongoDB Atlas URI
- npm 10.x or higher

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/ylc3205/CareerFlow.git
cd CareerFlow

# Install Backend dependencies
cd careerflow-api
npm install

# Install Frontend dependencies
cd ../careerflow-frontend
npm install
```

### Step 2: Configure Environment Files
```bash
# In careerflow-api/
cp .env.example .env

# In careerflow-frontend/
cp .env.example .env
```

### Step 3: Start Development Servers
```bash
# Terminal 1: Start Backend (Default: http://localhost:5000)
cd careerflow-api
npm run dev

# Terminal 2: Start Frontend (Default: http://localhost:5173)
cd careerflow-frontend
npm run dev
```

---

## 4. Environment Variables Reference

### Backend (`careerflow-api/.env`)

| Variable Name | Required | Default Value | Valid Options / Type | Purpose & Scope |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Optional | `5000` | Integer | Port for the Express server |
| `HOST` | Optional | `0.0.0.0` | IP String | Host interface binding for Docker/Cloud compatibility |
| `MONGODB_URI` | **Required** | `mongodb://localhost:27017/careerflow` | Connection URI | MongoDB connection string |
| `DATABASE_NAME` | Optional | `careerflow` | String | Target database name |
| `NODE_ENV` | Optional | `development` | `development`, `production`, `test` | Runtime environment mode |
| `ACCESS_TOKEN_SECRET` | **Required** | None (Set in prod) | String (High-entropy) | Secret key for signing short-lived JWT access tokens |
| `ACCESS_TOKEN_EXPIRES_IN`| Optional | `15m` | String (zeit/ms format) | Lifespan of access token |
| `REFRESH_TOKEN_SECRET`| **Required** | None (Set in prod) | String (High-entropy) | Secret key for signing long-lived refresh tokens |
| `REFRESH_TOKEN_EXPIRES_IN`| Optional| `7d` | String (zeit/ms format) | Lifespan of refresh token and HTTP-only cookie |
| `CLIENT_URL` | **Required** | `http://localhost:5173` | Comma-separated URLs | Allowed CORS origin whitelist |
| `AI_MOCK` | Optional | `true` | `true`, `false` | When true, enables offline deterministic AI responses |
| `GEMINI_API_KEY` | Conditional | Empty | String | Google Gemini API Key (Required if `AI_MOCK=false`) |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | String | Gemini model identifier |
| `STORAGE_MOCK` | Optional | `true` | `true`, `false` | When true, stores uploaded CV files locally instead of Cloudinary |
| `STORAGE_MOCK_DIR` | Optional | `.storage/` | Absolute/Relative Path | Local directory for storing mock uploaded files |
| `CLOUDINARY_CLOUD_NAME`| Conditional | Empty | String | Cloudinary cloud identifier (Required if `STORAGE_MOCK=false`) |
| `CLOUDINARY_API_KEY` | Conditional | Empty | String | Cloudinary API Key |
| `CLOUDINARY_API_SECRET`| Conditional | Empty | String | Cloudinary API Secret |
| `RESUME_MAX_SIZE_MB` | Optional | `10` | Number (MB) | Maximum file size allowed for CV uploads |

### Frontend (`careerflow-frontend/.env`)

| Variable Name | Required | Default Value | Valid Options / Type | Purpose & Scope |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Required** | `http://localhost:5000/api` | Full URL | Base endpoint URL for all client Axios HTTP requests |

---

## 5. Testing & Verification

CareerFlow enforces strict test gates across both tiers:

```bash
# 1. Run Backend Test Suite (164 tests in 15 suites)
cd careerflow-api
npm test

# 2. Run Frontend Test Suite (268 tests in 37 suites)
cd careerflow-frontend
npm test

# 3. Run Frontend Linter (0 errors, 0 warnings across 151 files)
cd careerflow-frontend
npm run lint

# 4. Build Frontend Production Bundle (Vite build)
cd careerflow-frontend
npm run build
```

---

## 6. Engineering Benchmark: CareerFlow vs Typical MERN Stack

| Architectural Dimension | Typical "Tutorial" MERN App | CareerFlow Engineering Baseline |
| :--- | :--- | :--- |
| **Component Hierarchy** | 1,000+ line monolithic components with nested inline renders | Top-level decomposed components with custom hooks & stable focus |
| **Client Network Waterfalls** | N+1 sequential HTTP round-trips to populate dashboard | Single composite endpoints (`/dashboard/overview`) with parallel DB queries |
| **Data Integrity & Cascades** | Disjointed manual deletes leaving orphaned records | Multi-document transactions with atomic cascade cleanup & fallback |
| **Database Indexing** | Default single-field `_id` index only | ESR-compliant compound indexes with partial filter expressions |
| **AI LLM Integration** | Unchecked free-form prompt string injection | Structured JSON schemas, Zod validation & deterministic offline mocks |
| **File Storage Architecture**| Insecure local writes directly in public web root | Abstracted storage service with path traversal defense & Cloudinary CDN |
| **Security Boundaries** | `cors()` wildcard, plaintext tokens in LocalStorage | Dynamic origin delegate, Helmet headers, HTTP-only SameSite cookies |
| **Process Management** | Immediate unhandled crash on `SIGTERM` / `SIGINT` | Graceful shutdown draining HTTP connections & MongoDB pools in 10s |

---

## 7. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.