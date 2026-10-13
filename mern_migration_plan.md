# CenterAlign — Python → MERN Stack Migration Plan

> **Role:** Software Architect, Developer & Planning Agent  
> **Scope:** Full-stack rewrite from Python (FastAPI + SQLite + Jinja2 + Playwright) to MERN (MongoDB + Express + React + Node.js)  
> **Style:** Greenfield-style MERN implementation in the same repo, preserving all data files (CSV, JSON, receipts, policy docs) and all business logic semantics

---

## 1. Current Stack Inventory

| Layer | Python (Current) | MERN Replacement |
|---|---|---|
| Finance App Server | FastAPI + Uvicorn (Port 8000) | Express.js (Port 8000) |
| Operator Dashboard UI | FastAPI + SSE + Jinja2 (Port 8001) | React + Vite (Port 5173 dev) |
| Database | SQLite via SQLAlchemy | MongoDB via Mongoose |
| Auth | Custom HMAC-SHA256 session cookie | JWT (jsonwebtoken) via HTTP-only cookie |
| Templating | Jinja2 HTML templates | React components (SPA) |
| Agent / Orchestrator | Python class `Orchestrator` | Node.js `AgentOrchestrator` class |
| Policy Checker | Python functions P1-P11 | Pure JavaScript functions P1-P11 |
| Guardrail Gate | Python `GuardrailGate` class | JavaScript `GuardrailGate` class |
| Event Bus | SQLite WAL (`events_<run_id>.db`) | MongoDB collection `events` + SSE |
| Audit Log | JSONL flat file (SHA-256 chained) | MongoDB collection `audit_log` (chained) |
| State Persistence | JSON file (`state_<run_id>.json`) | MongoDB document `task_states` |
| Claim Extractor | Python CSV/file reader | Node.js CSV/file reader (csv-parse) |
| Context Layer | Python keyword search | Node.js keyword search (fs + regex) |
| Browser Automation | Playwright (Python) | Playwright (Node.js / `@playwright/test`) |
| AI API | Anthropic SDK (Python) | Anthropic SDK (Node.js / `@anthropic-ai/sdk`) |
| Verifier | Python `httpx` HTTP client | Node.js `axios` HTTP client |
| Report Generator | Python Markdown string writer | Node.js Markdown string writer (fs) |
| Test Suite | pytest + pytest-asyncio | Jest + Supertest |
| Process Runner | `Makefile` + `python tasks.py` | `package.json` scripts + `concurrently` |
| Env Config | `python-dotenv` + `.env` | `dotenv` Node.js + `.env` (same file) |

---

## 2. Target MERN Directory Layout

```
centrali/
├── server/                          ← Express + Agent backend
│   ├── src/
│   │   ├── index.js                 ← Server entry point
│   │   ├── app.js                   ← Express app factory
│   │   ├── config/
│   │   │   └── db.js                ← MongoDB connection (Mongoose)
│   │   ├── models/
│   │   │   ├── User.js              ← Mongoose User model
│   │   │   ├── ExpenseClaim.js      ← Mongoose ExpenseClaim model
│   │   │   └── Receipt.js           ← Mongoose Receipt model
│   │   ├── routes/
│   │   │   ├── auth.routes.js       ← POST /login, GET /logout
│   │   │   ├── claims.routes.js     ← CRUD /claims
│   │   │   ├── api.routes.js        ← GET /api/claims (read-only verifier)
│   │   │   ├── admin.routes.js      ← Protected admin endpoints
│   │   │   ├── agent.routes.js      ← POST /agent/run, GET /agent/status
│   │   │   └── ui.routes.js         ← GET /ui/state, /ui/events (SSE)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   ← JWT validation middleware
│   │   │   ├── injection.middleware.js ← Failure injection middleware
│   │   │   └── guardrail.middleware.js ← Guardrail gate wrapper
│   │   ├── agent/
│   │   │   ├── orchestrator.js      ← AgentOrchestrator class
│   │   │   ├── claimExtractor.js    ← CSV + receipt file parser
│   │   │   ├── policyChecker.js     ← Rules P1-P11
│   │   │   ├── guardrail.js         ← GuardrailGate class
│   │   │   ├── humanApproval.js     ← HumanApprovalFlow class
│   │   │   ├── contextLayer.js      ← Keyword search over policy docs
│   │   │   ├── auditLog.js          ← SHA-256 chained audit logger
│   │   │   ├── eventBus.js          ← MongoDB-backed event emitter
│   │   │   ├── stateManager.js      ← TaskState CRUD via MongoDB
│   │   │   ├── verifier.js          ← Independent ground-truth verifier
│   │   │   ├── reportGenerator.js   ← Markdown report builder
│   │   │   └── tools/
│   │   │       ├── browserTools.js  ← Playwright browser actions
│   │   │       ├── fileTools.js     ← File read helpers
│   │   │       └── inboxTools.js    ← Inbox JSON reader
│   │   └── seed/
│   │       └── seed.js              ← DB seeder (users, initial data)
│   ├── package.json
│   └── .env                         ← (symlink or copy of root .env)
│
├── client/                          ← React + Vite frontend
│   ├── src/
│   │   ├── main.jsx                 ← Vite entry point
│   │   ├── App.jsx                  ← Router root
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        ← Login form
│   │   │   ├── DashboardPage.jsx    ← Operator live dashboard
│   │   │   ├── ClaimsListPage.jsx   ← Claims table
│   │   │   ├── ClaimDetailPage.jsx  ← Single claim view
│   │   │   ├── NewClaimPage.jsx     ← Submit new claim form
│   │   │   └── ReportPage.jsx       ← Run report viewer
│   │   ├── components/
│   │   │   ├── ApprovalCard.jsx     ← Human approval card (approve/deny)
│   │   │   ├── EventFeed.jsx        ← Real-time SSE event stream
│   │   │   ├── PlanProgress.jsx     ← Plan step tracker
│   │   │   ├── ClaimsTable.jsx      ← Sortable claims table
│   │   │   ├── Navbar.jsx           ← Navigation bar
│   │   │   └── StatusBadge.jsx      ← ALLOW/REJECT/NEEDS_APPROVAL badge
│   │   ├── hooks/
│   │   │   ├── useSSE.js            ← Custom hook for SSE subscription
│   │   │   ├── useRunState.js       ← Hook to fetch + poll run state
│   │   │   └── useAuth.js           ← Auth context hook
│   │   ├── context/
│   │   │   └── AuthContext.jsx      ← Auth provider (JWT from cookie)
│   │   ├── api/
│   │   │   └── apiClient.js         ← Axios base client + interceptors
│   │   └── index.css                ← Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── claims_data/                     ← UNCHANGED (CSV + receipts)
├── company_context/                 ← UNCHANGED (policy.md, JSON files)
├── tests/                           ← Migrated to Jest
│   ├── unit/
│   │   ├── policyChecker.test.js
│   │   ├── guardrail.test.js
│   │   ├── claimExtractor.test.js
│   │   └── verifier.test.js
│   └── e2e/
│       └── e2e.test.js
├── scenarios/                       ← Migrated to Node.js
│   ├── s1_happy_path.js
│   ├── s2_full_mixed.js
│   ├── s3_failure_recovery.js
│   └── s4_guardrail_test.js
├── .env.example                     ← Updated with MONGODB_URI
├── .gitignore                       ← Updated
└── package.json                     ← Root workspace scripts
```

---

## 3. Key Architecture Decisions

1. **MongoDB replaces SQLite (both databases):** The `ExpenseClaim` + `User` relational DB and the `events_<run_id>.db` SQLite event bus both move to MongoDB. Two collections for finance: `users`, `expense_claims`. Two collections for agent: `events`, `audit_logs`, `task_states`.
2. **SSE remains identical in protocol:** The SSE endpoint `/ui/events/:runId` is re-implemented in Express using `res.write()` + `res.flush()` polling MongoDB.
3. **Playwright moves to Node.js:** `@playwright/test` Node package replaces the Python Playwright. The `BrowserSession` singleton and all browser actions (open, click, type, select, screenshot) are re-implemented in `browserTools.js`.
4. **JWT replaces custom HMAC session cookie:** `jsonwebtoken` signs a JWT stored in an HTTP-only cookie. Middleware validates it on every protected route—the same pattern as the current `require_auth` dependency.
5. **Agent stays in the server process:** The `AgentOrchestrator` runs inside the Express server as a long-lived background job (not a separate process). The agent communicates with the finance DB directly through Mongoose rather than through Playwright's browser UI for state checks.
6. **React SPA replaces Jinja2 templates:** One unified React app handles both the Finance Portal UI (login, claims list, new claim, claim detail) and the Operator Dashboard (live feed, approval cards, report viewer). Routes are managed by React Router.
7. **Business logic is a direct port:** All 11 policy rules (P1-P11), the Guardrail Gate, and the Context Layer are **line-by-line JavaScript translations** of the Python originals. No logic changes—only syntax changes.
8. **Data files are unchanged:** `claims_data/`, `company_context/`, `tests/expected_outcomes/` remain as-is. Node.js reads them with `fs` + `csv-parse` instead of Python's `csv` module.

---

## 4. Phased Execution Plan

---

### PHASE 1 — Project Scaffolding & Monorepo Setup
**Goal:** Create the new directory structure, package configs, and root-level orchestration scripts without any application code.

**Task 1.1 — Create root `package.json` workspace**
- Create `/package.json` at repo root defining two workspaces: `server` and `client`
- Add root-level `scripts`: `start`, `dev`, `setup`, `seed`, `test`
- Add `concurrently` dev dependency to run server + client simultaneously

**Task 1.2 — Initialize server package**
- Create `server/package.json` with dependencies:
  - `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `csv-parse`, `@anthropic-ai/sdk`, `@playwright/test`, `axios`, `cors`, `cookie-parser`, `morgan`
- Add server scripts: `start`, `dev` (nodemon), `seed`
- Create `server/src/index.js` as the bare entry point (start HTTP server)
- Create `server/src/app.js` as the Express factory (register routes, middleware, error handler)

**Task 1.3 — Initialize client package with Vite + React**
- Create `client/package.json` with dependencies:
  - `react`, `react-dom`, `react-router-dom`, `axios`, `vite`, `@vitejs/plugin-react`
- Create `client/vite.config.js` with proxy config: `/api`, `/ui`, `/claims`, `/login` → `http://localhost:8000`
- Create `client/index.html` and `client/src/main.jsx`

**Task 1.4 — Update `.env.example`**
- Add `MONGODB_URI=mongodb://localhost:27017/centralign`
- Add `JWT_SECRET=centralign-jwt-secret-key`
- Retain all existing env vars (`ANTHROPIC_API_KEY`, `FINANCE_APP_URL`, `INJECT_*`, etc.)

**Task 1.5 — Update `.gitignore`**
- Add `node_modules/`, `dist/`, `build/`, `server/reports/*.db`, `.env`
- Keep existing Python ignores (`.venv/`, `*.pyc`, `__pycache__/`) for backward compatibility during transition

---

### PHASE 2 — MongoDB Database Layer & Models
**Goal:** Define Mongoose schemas mirroring the SQLAlchemy models and establish DB connection.

**Task 2.1 — MongoDB connection module**
- Create `server/src/config/db.js`
- Export `connectDB()` async function using `mongoose.connect(MONGODB_URI)`
- Call `connectDB()` from `server/src/index.js` before starting HTTP server

**Task 2.2 — `User` Mongoose model**
- File: `server/src/models/User.js`
- Fields: `username` (String, unique, required), `passwordHash` (String, required), `isAdmin` (Boolean, default false)
- **Maps from:** `finance_app/models.py` → `class User`

**Task 2.3 — `ExpenseClaim` Mongoose model**
- File: `server/src/models/ExpenseClaim.js`
- Fields: `employee`, `date`, `category`, `amountInr` (Number), `currency` (default 'INR'), `vendor`, `description`, `costCenter`, `receiptId`, `status` (default 'SUBMITTED'), `createdAt` (Date, default Date.now)
- **Maps from:** `finance_app/models.py` → `class ExpenseClaim`

**Task 2.4 — `Receipt` Mongoose model**
- File: `server/src/models/Receipt.js`
- Fields: `claimId` (ObjectId ref ExpenseClaim), `filename`, `content`
- **Maps from:** `finance_app/models.py` → `class Receipt`

**Task 2.5 — Agent MongoDB models (events, audit, state)**
- File: `server/src/models/AgentEvent.js` — Fields: `runId`, `timestamp`, `type`, `payload` (Mixed)
- File: `server/src/models/AuditEntry.js` — Fields: `runId`, `timestamp`, `type`, `toolName`, `arguments`, `resultSummary`, `gateDecision`, `stepIndex`, `prevHash`, `hash`
- File: `server/src/models/TaskState.js` — Fields: `runId`, `goal`, `expandedRequirements`, `plan` (Array), `claims` (Array), `pendingApprovals` (Array), `stepIndex`, `tokensUsed`, `totalCostUsd`, `lastError`

**Task 2.6 — Database seeder**
- File: `server/src/seed/seed.js`
- Seed two users: `operator` (plain) and `admin` (isAdmin=true) with `bcryptjs`-hashed passwords
- **Maps from:** `finance_app/seed.py`

---

### PHASE 3 — Express Server & Finance App Routes
**Goal:** Re-implement all Finance Portal HTTP endpoints in Express, matching the current FastAPI behavior exactly.

**Task 3.1 — Auth middleware (JWT)**
- File: `server/src/middleware/auth.middleware.js`
- `requireAuth(req, res, next)`: reads `session_token` cookie → verifies JWT → attaches `req.user`
- `requireAdmin(req, res, next)`: additionally checks `isAdmin`
- **Maps from:** `finance_app/routes/auth.py` → `require_auth`, `decode_session_token`

**Task 3.2 — Auth routes**
- File: `server/src/routes/auth.routes.js`
- `GET /login` → serve login page response (returns JSON for React SPA)
- `POST /login` → verify credentials → sign JWT → set HTTP-only cookie → return `{ user, token }`
- `GET /logout` → clear cookie → return `{ ok: true }`
- **Maps from:** `finance_app/routes/auth.py`

**Task 3.3 — Claims routes (Finance Portal)**
- File: `server/src/routes/claims.routes.js`
- `GET /claims` → return all claims (sorted desc by `_id`), protected by `requireAuth`
- `GET /claims/new` → return empty form context (JSON), protected
- `POST /claims/new` → validate cost center, amount, date, duplicate → create `ExpenseClaim` → return `{ claimId }`
- `GET /claims/:id` → return single claim by ID, protected
- Validation rules are identical: cost center required, positive amount, no future date, no duplicate
- **Maps from:** `finance_app/routes/claims.py`

**Task 3.4 — Read-only verifier API route**
- File: `server/src/routes/api.routes.js`
- `GET /api/claims` → query `ExpenseClaim` with optional `employee` filter → return JSON array
- Response shape identical to current Python: `{ id, employee, date, category, amountInr, vendor, costCenter, receiptId, status, createdAt }`
- **Maps from:** `finance_app/routes/api.py`

**Task 3.5 — Admin routes**
- File: `server/src/routes/admin.routes.js`
- `GET /admin` → protected by `requireAuth + requireAdmin` → returns admin data
- `POST /admin/reset-injections` → resets injection flags
- **Maps from:** `finance_app/routes/admin.py`

**Task 3.6 — Failure injection middleware**
- File: `server/src/middleware/injection.middleware.js`
- One-shot `INJECT_TRANSIENT_500`, `INJECT_SLOW_PAGE`, `INJECT_VALIDATION_ERROR` flags via `process.env`
- Stateful using a module-level injection state object (same pattern as Python `injection_state` dict)
- **Maps from:** `finance_app/app.py` → `failure_injection_middleware`

**Task 3.7 — UI/Dashboard API routes**
- File: `server/src/routes/ui.routes.js`
- `GET /ui/runs` → list available run IDs from `task_states` collection
- `GET /ui/state/:runId` → return `TaskState` document
- `GET /ui/report/:runId` → return Markdown report from `reports/` directory
- `POST /ui/approval/:runId/:claimId` → write `approval_response` event to MongoDB
- `GET /ui/events/:runId` → **SSE stream** polling MongoDB `events` collection every 500ms
- **Maps from:** `ui/server.py`

**Task 3.8 — Express app wiring**
- File: `server/src/app.js`
- Register all middleware: `cors`, `cookie-parser`, `express.json()`, `morgan`, injection middleware
- Mount all routers at their correct paths
- Add global error handler (catch `AuthRequiredError` → 302 redirect or 401 JSON)

---

### PHASE 4 — Agent Core: State, Event Bus & Audit Log
**Goal:** Port the agent's internal infrastructure to JavaScript using MongoDB instead of files/SQLite.

**Task 4.1 — State manager (TaskState)**
- File: `server/src/agent/stateManager.js`
- Export class `StateManager` with methods: `create(runId, goal)`, `load(runId)`, `save(state)`, `update(runId, partial)`
- State shape mirrors Python `TaskState` dataclass fields (camelCase)
- **Maps from:** `agent/state.py` → `class TaskState`

**Task 4.2 — Event bus (MongoDB-backed)**
- File: `server/src/agent/eventBus.js`
- `emit(runId, eventType, payload)` → inserts `AgentEvent` document → returns `insertedId`
- `pollEvents(runId, sinceId, typeFilter)` → queries `AgentEvent` collection with `_id > sinceId`
- **Maps from:** `agent/event_bus.py`

**Task 4.3 — Audit logger (cryptographically chained)**
- File: `server/src/agent/auditLog.js`
- Class `AuditLogger` with `logEntry(entry)`, `logToolCall(...)`, `logEvent(...)`
- SHA-256 chaining: each entry hashes `JSON.stringify(redactedEntry, sortedKeys)` and sets `prevHash`
- Secret redaction: replaces `ANTHROPIC_API_KEY`, `JWT_SECRET` values with `[REDACTED]`
- **Maps from:** `agent/audit_log.py`

---

### PHASE 5 — Agent Core: Policy Checker & Guardrail
**Goal:** Translate all deterministic business logic rules (P1-P11) and the guardrail gate to JavaScript.

**Task 5.1 — Policy checker (P1-P11)**
- File: `server/src/agent/policyChecker.js`
- Port each rule function exactly: `checkRuleP1Receipt`, `checkRuleP2MealLimit`, `checkRuleP3CabLimit`, `checkRuleP4FlightPreapproval`, `checkRuleP5LodgingLimit`, `checkRuleP6Software`, `checkRuleP7ClientEntertainment`, `checkRuleP8StaleDate`, `checkRuleP9Alcohol`, `checkRuleP11Duplicate`
- `checkClaim(claim, allClaims, inboxEmails)` → run all rules → return `PolicyVerdict` object
- `resolveCategoryForClaim(claim, inboxEmails)` → identical ambiguous-category resolution
- `sumMealsForDay(employee, dateStr, allClaims)` → identical daily aggregation logic
- **VERDICT_PRIORITY**, **ALLOWED_CATEGORIES** constants identical
- **Maps from:** `agent/policy_checker.py`

**Task 5.2 — Guardrail gate**
- File: `server/src/agent/guardrail.js`
- Class `GuardrailGate` with `evaluateAction(action, claim, state)`
- All 4 rules: forbidden `/admin`, forbidden `/api/`, employee isolation, no-delete, claim policy check, P10 threshold
- `ProposedAction` and `GateDecision` as plain JS objects (no dataclasses needed)
- **Maps from:** `agent/guardrail.py`

---

### PHASE 6 — Agent Core: Claim Extractor & Context Layer
**Goal:** Port the data extraction and policy document retrieval to Node.js.

**Task 6.1 — Claim extractor**
- File: `server/src/agent/claimExtractor.js`
- Class `ClaimExtractor` with `extractAll()` async method
- Use `csv-parse` npm package to read `claims_data/claims_spreadsheet.csv`
- Read receipt text files from `claims_data/receipts/` using `fs/promises.readFile`
- Cross-reference employee directory, inbox, receipt ID extraction (regex identical to Python)
- Flag `hasReceipt`, `inboxRef`, `categoryAmbiguous` properties on each claim record
- **Maps from:** `agent/claim_extractor.py`

**Task 6.2 — Context layer (keyword search)**
- File: `server/src/agent/contextLayer.js`
- Class `ContextLayer` with `loadDocuments()` and `search(query, topK)`
- Parse `company_context/policy.md` by `### ` sections using regex
- Parse `company_context/approvals_matrix.json`, `employee_directory.json`, `sop_expense_entry.md`
- Keyword overlap scoring algorithm is identical (token intersection + exact bonus)
- Singleton `getContextLayer()` and top-level `searchCompanyContext(query, topK)` export
- **Maps from:** `agent/context_layer.py`

---

### PHASE 7 — Agent Core: Browser Tools & Human Approval
**Goal:** Port browser automation to Node.js Playwright and the human approval polling to MongoDB events.

**Task 7.1 — Browser tools (Playwright Node.js)**
- File: `server/src/agent/tools/browserTools.js`
- Class `BrowserSession` singleton with `getInstance()`, `ensurePage()`, `setRunId(runId)`
- Functions: `browserOpen(url)`, `browserClick(selectorOrText)`, `browserType(field, value)`, `browserSelect(field, value)`, `browserSnapshot()`, `browserScreenshot(name)`
- Screenshots saved to `reports/screenshots/` via `page.screenshot({ path })`
- Uses `@playwright/test` package: `chromium.launch()`, `browser.newContext()`, `context.newPage()`
- **Maps from:** `agent/tools/browser_tools.py`

**Task 7.2 — File tools**
- File: `server/src/agent/tools/fileTools.js`
- `readFile(filePath)` async function using `fs/promises.readFile`
- **Maps from:** `agent/tools/file_tools.py`

**Task 7.3 — Inbox tools**
- File: `server/src/agent/tools/inboxTools.js`
- `readInbox(inboxPath)` reads and parses `company_context/inbox_export.json`
- **Maps from:** `agent/tools/inbox_tools.py`

**Task 7.4 — Human approval flow**
- File: `server/src/agent/humanApproval.js`
- Class `HumanApprovalFlow` with `requestApproval(claim, reason, state, autoDecision)`
- `emit` approval_requested event → poll MongoDB for `approval_response` event matching `claim_id`
- Timeout logic using `Date.now()` loop identical to Python `time.time()` loop
- Auto-decision shortcut for test scenarios
- **Maps from:** `agent/human_approval.py`

---

### PHASE 8 — Agent Core: Orchestrator, Verifier & Report Generator
**Goal:** Port the full orchestration loop, independent verifier, and report generator.

**Task 8.1 — Verifier**
- File: `server/src/agent/verifier.js`
- Class `Verifier` with `verifyScenario(scenario, runId, targetEmployee)`
- Read expected JSON from `tests/expected_outcomes/<scenario>_expected.json`
- HTTP GET `/api/claims?employee=...` using `axios` → compare against expected
- Match by vendor + amount (±0.05), field comparison (category), pass/fail tallying
- `VerificationReport` and `ClaimVerificationResult` as plain JS objects
- **Maps from:** `agent/verifier.py`

**Task 8.2 — Report generator**
- File: `server/src/agent/reportGenerator.js`
- `generateReport(state, verification, outputPath)` → builds identical Markdown table
- Writes to `reports/run_<runId>_report.md` using `fs/promises.writeFile`
- **Maps from:** `agent/report_generator.py`

**Task 8.3 — Main orchestrator**
- File: `server/src/agent/orchestrator.js`
- Class `AgentOrchestrator` with constructor `(runId, goal)`
- `planGoal()` → calls Anthropic API via `@anthropic-ai/sdk` → fallback plan if no key
- `ensureAuthenticated()` → browser login check + re-login
- `checkClaimExistsInUI(claim)` → browser page content check
- `submitClaimWithRecovery(claim, retries)` → full form-fill loop with guardrail check + retry logic
- `processAllClaims(autoApprovals, scenarioName)` → main orchestration loop (steps 1-6)
- **Maps from:** `agent/orchestrator.py`

**Task 8.4 — Agent runner Express routes**
- File: `server/src/routes/agent.routes.js`
- `POST /agent/run` body `{ goal, scenarioName, autoApprovals }` → starts orchestrator as async background task → returns `{ runId }`
- `GET /agent/status/:runId` → returns current `TaskState` document

---

### PHASE 9 — React Frontend
**Goal:** Build the full React SPA replacing all Jinja2 templates (Finance Portal + Operator Dashboard).

**Task 9.1 — Auth context & login page**
- `client/src/context/AuthContext.jsx` — React context storing `{ user, login, logout }`
- `client/src/hooks/useAuth.js` — hook to consume auth context
- `client/src/pages/LoginPage.jsx` — login form: username + password → POST `/login` → stores user in context → redirect to `/dashboard`

**Task 9.2 — Axios API client**
- `client/src/api/apiClient.js` — Axios instance with `baseURL: ''` (Vite proxy handles it), `withCredentials: true` (send cookies)
- Add response interceptor: on 401 → redirect to `/login`

**Task 9.3 — Layout & Navbar**
- `client/src/components/Navbar.jsx` — top navigation with links: Dashboard, Claims, New Claim, Report; username display; Logout button
- `client/src/App.jsx` — React Router routes: `/login`, `/dashboard`, `/claims`, `/claims/new`, `/claims/:id`, `/report`

**Task 9.4 — Claims pages (Finance Portal)**
- `client/src/pages/ClaimsListPage.jsx` — GET `/claims` → display in sortable table with status badges
- `client/src/pages/NewClaimPage.jsx` — form with fields: employee, date, category (dropdown), amount_inr, vendor, cost_center, receipt_id, description → POST `/claims/new`
- `client/src/pages/ClaimDetailPage.jsx` — GET `/claims/:id` → display all claim fields
- `client/src/components/ClaimsTable.jsx` — reusable table component with `StatusBadge`
- `client/src/components/StatusBadge.jsx` — colored badge: ALLOW=green, REJECT=red, NEEDS_APPROVAL=amber, SUBMITTED=blue

**Task 9.5 — SSE hook**
- `client/src/hooks/useSSE.js` — custom hook wrapping `EventSource` for `/ui/events/:runId`
- Accumulates events in React state, exposes `events[]` and `isConnected` boolean

**Task 9.6 — Operator Dashboard page**
- `client/src/pages/DashboardPage.jsx` — uses `useSSE` + `useRunState` hooks
- Left panel: run selector dropdown (GET `/ui/runs`) + plan progress (step list)
- Center panel: live event feed (`EventFeed` component)
- Right panel: approval cards (`ApprovalCard` component)
- `client/src/components/EventFeed.jsx` — scrollable real-time log of events with type icons
- `client/src/components/ApprovalCard.jsx` — shows claim details + Approve/Deny buttons → POST `/ui/approval/:runId/:claimId`
- `client/src/components/PlanProgress.jsx` — ordered step list with status badges

**Task 9.7 — Run state hook**
- `client/src/hooks/useRunState.js` — polls `GET /ui/state/:runId` on SSE events, returns `{ state, loading }`

**Task 9.8 — Report page**
- `client/src/pages/ReportPage.jsx` — GET `/ui/report/:runId` → renders Markdown as styled HTML (using `react-markdown`)

**Task 9.9 — Global styling**
- `client/src/index.css` — premium dark-mode design system: CSS custom properties, typography (Inter font), color tokens, utility classes

---

### PHASE 10 — Test Suite, Scenarios & DevOps
**Goal:** Migrate all tests and scenario scripts to JavaScript, and finalize the developer workflow.

**Task 10.1 — Unit tests: policy checker**
- File: `tests/unit/policyChecker.test.js`
- Port all `test_policy_checker.py` test cases to Jest
- Tests cover: P1 missing receipt, P2 meal over limit, P3 cab threshold, P4 flight pre-approval, P5 lodging, P6 software, P7 client entertainment, P8 stale date, P9 alcohol, P10 high value, P11 duplicate

**Task 10.2 — Unit tests: guardrail**
- File: `tests/unit/guardrail.test.js`
- Port all `test_guardrail.py` test cases: admin blocked, /api/ blocked, wrong employee blocked, delete blocked, REJECT claim blocked, NEEDS_APPROVAL without human approval blocked

**Task 10.3 — Unit tests: claim extractor**
- File: `tests/unit/claimExtractor.test.js`
- Port `test_claim_extractor.py`: verify 12 claims extracted, receipt cross-reference, category ambiguity flag for claim 12

**Task 10.4 — Unit tests: verifier**
- File: `tests/unit/verifier.test.js`
- Port `test_verifier.py`: mock `/api/claims` endpoint with `nock`, verify pass/fail tallying logic

**Task 10.5 — E2E test**
- File: `tests/e2e/e2e.test.js`
- Use `Supertest` to test full Express server: login → submit claim → verify claim in `/api/claims`
- **Maps from:** `tests/test_e2e.py`

**Task 10.6 — Scenario scripts**
- `scenarios/s1_happy_path.js` → Node.js script importing and calling `AgentOrchestrator`
- `scenarios/s2_full_mixed.js` → full 12-claim run with auto-approvals
- `scenarios/s3_failure_recovery.js` → sets `INJECT_TRANSIENT_500=1`, runs, asserts recovery
- `scenarios/s4_guardrail_test.js` → tests admin access block, cross-employee block, adversarial injection

**Task 10.7 — Root-level npm scripts**
- Update root `package.json` scripts:
  - `npm run setup` → `npm install` in all workspaces + `playwright install chromium`
  - `npm run dev` → `concurrently "npm run dev -w server" "npm run dev -w client"`
  - `npm run seed` → `node server/src/seed/seed.js`
  - `npm run test` → `jest --testPathPattern=tests/`
  - `npm run demo` → `node scenarios/s1_happy_path.js`
  - `npm run demo-all` → `node scenarios/s2_full_mixed.js`
- Update `README.md` with new MERN setup instructions

**Task 10.8 — README update**
- Update architecture diagram (Mermaid) to reflect: React SPA, Express, MongoDB
- Update "How to Run" section: `npm run setup`, `npm run seed`, `npm run dev`, `npm run demo`
- Keep all existing design documentation (architecture decisions, limitations, next steps)

---

## 5. Files to REMOVE (Python-Only)

| File/Directory | Reason |
|---|---|
| `finance_app/` (entire dir) | Replaced by `server/src/routes/` + `server/src/models/` |
| `agent/` (entire dir) | Replaced by `server/src/agent/` |
| `ui/` (entire dir) | Replaced by `client/` React app |
| `pyproject.toml` | Replaced by `package.json` workspaces |
| `tasks.py` | Replaced by npm scripts |
| `Makefile` | Replaced by npm scripts |
| `scenarios/*.py` | Replaced by `scenarios/*.js` |
| `tests/*.py` | Replaced by `tests/**/*.test.js` |

---

## 6. Files to KEEP UNCHANGED

| File/Directory | Reason |
|---|---|
| `claims_data/claims_spreadsheet.csv` | Node.js reads it directly with `csv-parse` |
| `claims_data/receipts/*.txt` | Node.js reads with `fs.readFile` |
| `company_context/*.md`, `*.json` | Node.js reads with `fs.readFile` + `JSON.parse` |
| `tests/expected_outcomes/*.json` | Node.js verifier reads the same JSON files |
| `.env.example` | Extended with MongoDB/JWT vars |
| `reports/` directory | Reports, screenshots, audit logs remain here |
| `DEMO_SCRIPT.md` | Updated with new npm commands |

---

## 7. Implementation Order Summary

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5
(Scaffold)   (DB)         (Routes)     (Infra)     (Business Logic)
                                                         ↓
Phase 10 ←  Phase 9  ←  Phase 8  ←  Phase 7  ←  Phase 6
(DevOps)    (React)     (Orchestr.)  (Browser)   (Extractor/Context)
```

> Each phase produces independently runnable/testable code. Phase 3 produces a working finance portal. Phase 8 completes the full agent loop. Phase 9 makes the UI visual. Phase 10 validates everything.

---

## 8. Risk & Mitigation Table

| Risk | Mitigation |
|---|---|
| Playwright behavior differences (Python vs Node.js) | Use identical selector strategies; validate with screenshots in each browser tool function |
| MongoDB ObjectId vs integer primary keys | Use MongoDB `_id` as string for agent state; add `numericId` auto-increment field on `ExpenseClaim` for Playwright DOM comparison compatibility |
| SSE streaming in Express (vs async generators in FastAPI) | Use `res.setHeader('Content-Type', 'text/event-stream')` + `res.write()` + `setInterval` polling pattern |
| Anthropic SDK async differences | Node.js SDK is natively async/await; map directly from Python's `client.messages.create()` |
| Policy date arithmetic (Python `datetime` vs JS `Date`) | Use `date-fns` npm package for consistent `differenceInDays()` calculations |
| SHA-256 chaining (Python `hashlib` vs Node.js `crypto`) | Use built-in `crypto.createHash('sha256')` — identical semantics |
| CSV parsing edge cases | Use `csv-parse` with `columns: true` option matching Python `csv.DictReader` behavior |
