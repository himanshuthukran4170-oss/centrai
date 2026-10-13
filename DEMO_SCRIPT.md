# CenterAlign — 3-Minute Demo Walkthrough Script (MERN Stack)

## 1. Introduction (30 seconds)
> "CenterAlign is an autonomous company operator built on the MERN stack that reads company policies, emails, and receipts, evaluates claims deterministically, and executes actions in the web finance portal through Playwright browser automation while adhering to strict safety guardrails and real-time human approval gates."

---

## 2. Launching Services & Scenario 1: Happy Path (60 seconds)

### Terminal 1: Launch Full-Stack Application
```bash
npm run dev
# Starts Express backend on http://localhost:8000
# Starts React frontend on http://localhost:5173
```

### Terminal 2: Run Scenario 1
```bash
npm run demo
```

### What to show on screen:
1. Open the Operator Dashboard at `http://localhost:5173/dashboard`.
2. **Strategy & Requirements:** Show how the goal *"Process Priya Sharma's Q3 expense claims"* expands into structured policy requirements citing clauses P1, P2, P10.
3. **Execution Plan:** Steps update in real time with status badges (`PENDING` -> `IN_PROGRESS` -> `DONE`).
4. **Activity Feed:** Live SSE events stream directly from the backend as the operator navigates and files claims.
5. **Claims Ledger:** Switch to `http://localhost:5173/claims` to view the filed claims in the database.

---

## 3. Scenario 2: Full Mixed Claims & Human Approval Gate (60 seconds)

### Run Scenario 2:
```bash
npm run demo-all
```

### What to show on screen:
1. **Approval Queue:** Highlight claim 4 (Flight ₹18,500) and claim 12 (Client Entertainment ₹2,800) pausing for human signoff.
2. Explain the policy reasoning:
   - Claim 4 pre-approval email was verified from the inbox, but requires human signoff because it exceeds the ₹10,000 threshold (Clause P10).
   - Claim 12 was ambiguous ("Meals" in CSV, but receipt mentions 4 client attendees from Acme Corp). The operator classified it as **Client entertainment** (Clause P7).
3. The dashboard displays interactive **Approve** and **Deny** buttons.
4. Show how the operator resumes, submits approved claims, and blocks rejected claims (e.g. Claim 11 with alcohol, Claim 10 duplicate, Claim 9 stale date).

---

## 4. Failure Recovery & Guardrails (30 seconds)

### Highlight S3 & S4:
- **Scenario 3 (Failure Recovery):** Run `node scenarios/s3_failure_recovery.js`. The operator encounters transient HTTP 500 errors, session timeouts, and missing cost centers. It re-authenticates, performs idempotency checks via the UI, and completes with **zero duplicate submissions**.
- **Scenario 4 (Guardrails):** Run `node scenarios/s4_guardrail_test.js`. Even when faced with adversarial prompt injection in emails or receipts, the deterministic code gate strictly blocks unauthorized access to `/admin` and destructive operations.
- **Audit Report:** View `http://localhost:5173/report` for the executive Markdown report with ground truth verification tallies.
