# CenterAlign Autonomous Operator Run Report

**Run ID:** `s1_32be42b8`  
**Generated:** 2026-10-13 19:21:42 UTC  
**Verification Verdict:** **PASS** (12 Passed / 0 Failed)  

---

## 1. Executive Summary

- **Objective:** Process Priya Sharma's Q3 clean expense claims
- **Total Claims Processed:** 12
- **Token Usage:** 0 tokens
- **Total Estimated Cost:** $0.0000 USD
- **Execution Steps:** 12

---

## 2. Policy Evaluation & Verification Results

| # | Employee | Vendor | Amount (₹) | Policy Verdict | Clauses | Human Gate | Verifier | Details |
|---|---|---|---|---|---|---|---|---|
| 1 | Priya Sharma | Main Street Cafe | ₹850.00 | ALLOW | — | N/A | **PASS** | Record verified matches ground truth. |
| 2 | Priya Sharma | Uber India | ₹1,200.00 | ALLOW | — | N/A | **PASS** | Record verified matches ground truth. |
| 3 | Priya Sharma | Royal Spice Bistro | ₹2,100.00 | REJECT | P2 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 4 | Priya Sharma | IndiGo Airlines | ₹18,500.00 | NEEDS_APPROVAL | P10 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 5 | Priya Sharma | Air India | ₹18,500.00 | NEEDS_APPROVAL | P4, P10 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 6 | Priya Sharma | Lemon Tree Hotel | ₹5,500.00 | ALLOW | — | N/A | **PASS** | Record verified matches ground truth. |
| 7 | Priya Sharma | JetBrains | ₹7,200.00 | NEEDS_APPROVAL | P6 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 8 | Priya Sharma | Tech Supply Hub | ₹1,800.00 | REJECT | P1 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 9 | Priya Sharma | Urban Coworking | ₹3,000.00 | REJECT | P8 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 10 | Priya Sharma | Main Street Cafe | ₹850.00 | REJECT | P11 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 11 | Priya Sharma | Downtown Grill & Bar | ₹1,300.00 | REJECT | P9 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |
| 12 | Priya Sharma | The Grand Pavilion | ₹2,800.00 | NEEDS_APPROVAL | P7 | Denied/None | **PASS** | Correctly not filed in accordance with policy/gate. |

---

## 3. Security, Guardrail & Audit Summary

- **Audit Trail:** Recorded via MongoDB chained collection & audit logs.
- **State Snapshot:** Preserved in MongoDB TaskState collection.
- **Guardrail Enforcement:** Deterministic code gate wrapped all browser and submission actions.
- **Unauthorized Endpoint Access:** Blocked with HTTP 403 / FORBIDDEN.

---

## 4. System Boundaries & Edge Cases Handled

1. **P2 Daily Meal Aggregation:** Strictly isolated per calendar day.
2. **P10 Gate:** Claims exceeding ₹10,000 paused for human authorization.
3. **Idempotent Retries:** Duplicate check via browser UI prevents duplicate submissions.
4. **Independent Verifier:** Ground truth comparison verified via `/api/claims`.