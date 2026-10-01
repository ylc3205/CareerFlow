# CareerFlow Frontend SPA (`careerflow-frontend`)

> High-performance, modern Single-Page Application (SPA) built with React 19, Vite 8, Tailwind CSS, and Radix UI.

---

## 1. Architecture & Design Principles

The frontend is architected for **stability, speed, and modularity**:

- **Predictable State & Custom Hooks**: Complex workflows (e.g. Resume lifecycle, search debouncing) are isolated in custom hooks (`useResume`, `useDebounce`, `useAuth`) rather than inlined in view components.
- **Top-Level Component Decomposition**: Subcomponents and helper cards are declared at the top-level of module files (or separate files) to prevent input remounting and maintain focus stability during typing.
- **Route-Isolated Transient State**: Detail views and wizard forms reset internal form state when the active URL route parameter changes, avoiding stale prop leakage between navigation actions.
- **WCAG 2.1 AA Compliance**: High-contrast typography, accessible form labels, explicit ARIA roles (`role="status"`, `role="dialog"`), and keyboard navigation across all interactive modal dialogs and tabs.

---

## 2. Directory Structure

```
careerflow-frontend/
├── src/
│   ├── api/                 # Axios HTTP client wrappers with typed responses
│   ├── components/          # Reusable UI components & section cards
│   │   ├── applications/    # Application cards, form dialogs, status badges
│   │   ├── careerDirections/# Career path preview, level & mode selectors
│   │   ├── interviews/      # Preparation questions, practice session view
│   │   ├── jobs/            # Job fit analysis gauge, skill badges, job form
│   │   ├── resume/          # Modular resume cards, dropzone, banners, file rows
│   │   └── ui/              # Radix UI primitives (Button, Card, Input, Label, Badge)
│   ├── hooks/               # Custom domain hooks (useResume, useDebounce, useAuth)
│   ├── layouts/             # AppLayout shell, sidebar navigation, headers
│   ├── pages/               # Top-level route orchestrators (Dashboard, Jobs, Resume...)
│   ├── routes/              # React Router v7 routes with ProtectedRoute guards
│   ├── utils/               # Formatting, sanitizers, and resume form utilities
│   └── test/                # Test fixtures and global test setup
├── tailwind.config.js       # Design tokens, color scales, and theme configuration
├── vite.config.js           # Vite development and bundling configuration
└── vitest.config.js         # Vitest test runner configuration (jsdom environment)
```

---

## 3. Modular Resume Architecture

Following Process 5, the Resume system is fully decomposed into modular, isolated modules:

```
src/
├── utils/resumeForm.js            # Pure data hydrators, defaults, and payload builders
├── hooks/useResume.js             # Resume state machine, upload, parse, and draft mutations
└── components/resume/
    ├── FileRow.jsx                # File metadata presentation row
    ├── SuccessBanner.jsx          # Accessible status feedback banner
    ├── ResumeFormCards.jsx        # Top-level cards for Information, Skills, Exp, Edu, Proj, Certs
    ├── ResumeUploadTab.jsx        # Dropzone, AI extraction progress, and Draft review
    └── ResumeSkeleton.jsx         # Loading skeleton with accessible role="status"
```

The orchestrator `ResumePage.jsx` is condensed to ~185 lines (-85.7% LoC reduction), coordinating `useResume()` with the extracted subcomponents.

---

## 4. Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `VITE_API_URL` points to your backend instance (default: `http://localhost:5000/api`).

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

---

## 5. Testing & Quality Gates

The frontend enforces strict automated testing and linting standards:

```bash
# Run Vitest Test Suite (268 tests in 37 suites)
npm test

# Run Oxlint Fast Linter (0 errors, 0 warnings across 151 files)
npm run lint

# Validate Production Bundle Build
npm run build
```
