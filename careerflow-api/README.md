# CareerFlow Backend API (`careerflow-api`)

> High-performance Node.js / Express REST API powering the CareerFlow platform.

---

## 1. Architecture & Design Patterns

The backend follows a strict **Layered Domain-Driven (MVC + Service Layer)** pattern:

```
Request ──▶ Middleware ──▶ Router ──▶ Controller ──▶ Service Layer ──▶ Database / AI / Storage
                ▲                                          │
                └─────────────── Error / Exception ────────┘
```

- **Routes (`src/routes/`)**: Mount HTTP paths, assign validation schemas, apply rate limiters, and delegate to controllers.
- **Controllers (`src/controllers/`)**: Parse HTTP inputs, invoke domain services, and serialize JSON responses. All controller methods are wrapped with `catchAsync`.
- **Services (`src/services/`)**: Encapsulate all business logic, data formatting, parallel queries, and third-party integrations (Gemini, Cloudinary).
- **Models (`src/models/`)**: Mongoose schemas enriched with Equality-Sort-Range (ESR) compound indexes.
- **Middlewares (`src/middlewares/`)**: `auth.middleware.js` (JWT verification), `validate.middleware.js` (Zod validation), `rateLimiter.middleware.js` (sliding-window rate limiters), and `error.middleware.js` (centralized error handling).
- **Utils (`src/utils/`)**: Reusable utilities including `transaction.js` (MongoDB transaction executor), `lifecycle.js` (graceful shutdown handler), and `jwt.js`.

---

## 2. Key Directories

```
careerflow-api/
├── src/
│   ├── app.js               # Express application initialization & middleware stack
│   ├── server.js            # HTTP server startup & graceful shutdown signal bindings
│   ├── config/              # Database and Cloudinary connection configuration
│   ├── controllers/         # Request handling & HTTP response mapping
│   ├── middlewares/         # Auth, validation, rate limiting, and error handling
│   ├── models/              # Mongoose data models with ESR indexes
│   ├── routes/              # Express API route declarations
│   ├── services/            # Domain logic, AI matching, composite aggregations
│   │   └── providers/       # Gemini AI and Cloudinary storage providers
│   ├── utils/               # JWT, lifecycle, transaction, and error utilities
│   └── validators/          # Zod schema definitions for request bodies/params
├── test/                    # Live integration & E2E test suites
└── vitest.config.js         # Vitest test runner configuration
```

---

## 3. Database Transactions & Indexing

### Atomic Multi-Document Transactions
Multi-collection operations (e.g. deleting an application and cascading to interviews, preparation, and practice sessions) utilize `runInTransaction`:
```javascript
import { runInTransaction } from '../utils/transaction.js'

await runInTransaction(async (session) => {
  // Queries pass { session } when supported by the cluster topology.
  // Falls back gracefully on standalone development instances.
})
```

### ESR Compound Indexing
Indexes are ordered following MongoDB's Equality, Sort, Range rule:
- `Job`: `{ user: 1, isDeleted: 1, status: 1, createdAt: -1 }`
- `Application`: `{ user: 1, status: 1, createdAt: -1 }`
- `Interview`: `{ user: 1, application: 1, createdAt: -1 }`
- `PracticeSession`: `{ user: 1, status: 1, createdAt: -1 }`

---

## 4. Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

| Key | Purpose |
| :--- | :--- |
| `PORT` | API server port (default: `5000`) |
| `HOST` | Interface binding (default: `0.0.0.0`) |
| `MONGODB_URI` | MongoDB connection string (default: `mongodb://localhost:27017/careerflow`) |
| `AI_MOCK` | Set `true` to use deterministic mock AI responses without external API calls |
| `STORAGE_MOCK` | Set `true` to store uploaded CVs locally in `.storage/` |
| `CLIENT_URL` | Comma-separated allowed frontend origins for CORS |

### 3. Run Development Server
```bash
npm run dev
```

---

## 5. Testing & Quality Gates

Run the comprehensive Vitest test suite (164 tests across 15 test suites):
```bash
npm test
```

All tests execute in an isolated environment with mocked third-party dependencies, ensuring 100% determinism and green builds.