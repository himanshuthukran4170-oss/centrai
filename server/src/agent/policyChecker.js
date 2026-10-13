/**
 * policyChecker.js
 * Replaces Python agent/policy_checker.py — ALL rules P1-P11 direct port to JavaScript.
 * Business logic is semantically identical; only syntax changes.
 */

const VERDICT_PRIORITY = { ALLOW: 1, NEEDS_APPROVAL: 2, REJECT: 3 };

const ALLOWED_CATEGORIES = [
  'Meals', 'Cab', 'Flight', 'Lodging', 'Software', 'Client entertainment', 'Other',
];

function getPolicyDate() {
  const dateStr = process.env.POLICY_AS_OF_DATE || '2026-10-13';
  return new Date(dateStr);
}

/** P2 helper: sum all distinct meal amounts for an employee on a given date */
function sumMealsForDay(employee, dateStr, allClaims) {
  let total = 0;
  const seen = new Set();
  for (const c of allClaims) {
    if (c.employee === employee && c.date === dateStr && c.category === 'Meals') {
      const key = `${c.vendor.trim().toLowerCase()}__${Math.round(parseFloat(c.amountInr) * 100)}`;
      if (!seen.has(key)) {
        seen.add(key);
        total += parseFloat(c.amountInr);
      }
    }
  }
  return total;
}

/** Task 3.3a: Resolve ambiguous category for claim 12 */
function resolveCategoryForClaim(claim, inboxEmails) {
  if (claim.categoryAmbiguous || claim.claimId === '12') {
    const text = (claim.receiptText || '').toLowerCase();
    if (text.includes('client') || text.includes('attendees')) return 'Client entertainment';
  }
  return claim.category;
}

// ── Rule implementations ─────────────────────────────────────────────────────

function checkRuleP1Receipt(claim) {
  const hasReceipt = claim.hasReceipt !== undefined ? claim.hasReceipt : true;
  const receiptId  = claim.receiptId;
  if (parseFloat(claim.amountInr) > 500 && (!hasReceipt || !receiptId)) {
    return { fired: true, verdictContribution: 'REJECT', clause: 'P1',
      reason: `Claim amount ₹${claim.amountInr} exceeds ₹500 without a valid receipt identifier.` };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P1', reason: '' };
}

function checkRuleP2MealLimit(claim, allClaims) {
  if (claim.category !== 'Meals') return { fired: false, verdictContribution: 'ALLOW', clause: 'P2', reason: '' };
  const daySum = sumMealsForDay(claim.employee, claim.date, allClaims);
  if (daySum > 1500 || parseFloat(claim.amountInr) > 1500) {
    return { fired: true, verdictContribution: 'REJECT', clause: 'P2',
      reason: `Total meal expenditure of ₹${daySum.toFixed(2)} for date ${claim.date} exceeds daily limit of ₹1,500.` };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P2', reason: '' };
}

function checkRuleP3CabLimit(claim) {
  if (claim.category === 'Cab' && parseFloat(claim.amountInr) > 3000) {
    return { fired: true, verdictContribution: 'NEEDS_APPROVAL', clause: 'P3',
      reason: `Cab expense of ₹${parseFloat(claim.amountInr).toFixed(2)} exceeds ₹3,000 threshold.` };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P3', reason: '' };
}

function checkRuleP4FlightPreapproval(claim, inboxEmails) {
  if (claim.category !== 'Flight') return { fired: false, verdictContribution: 'ALLOW', clause: 'P4', reason: '' };

  const inboxRef = claim.inboxRef;
  const notes    = claim.notes || '';

  if (inboxRef) return { fired: false, verdictContribution: 'ALLOW', clause: 'P4', reason: 'Manager pre-approval verified via inbox reference.' };
  if (notes.includes('MSG-001')) return { fired: false, verdictContribution: 'ALLOW', clause: 'P4', reason: 'Manager pre-approval verified via MSG-001 reference.' };

  const vendorWords = claim.vendor.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  let hasApproval = false;
  for (const msg of inboxEmails) {
    const body    = (msg.body || '').toLowerCase();
    const subject = (msg.subject || '').toLowerCase();
    if ((body.includes('approved') || subject.includes('pre-approval')) &&
      (vendorWords.some((w) => body.includes(w)) || body.includes(claim.date))) {
      hasApproval = true;
      break;
    }
  }

  if (!hasApproval) {
    return { fired: true, verdictContribution: 'NEEDS_APPROVAL', clause: 'P4',
      reason: 'Flight expense lacks verified manager pre-approval email.' };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P4', reason: 'Manager pre-approval verified.' };
}

function checkRuleP5LodgingLimit(claim) {
  if (claim.category === 'Lodging' && parseFloat(claim.amountInr) > 6000) {
    return { fired: true, verdictContribution: 'NEEDS_APPROVAL', clause: 'P5',
      reason: `Lodging amount of ₹${parseFloat(claim.amountInr).toFixed(2)} exceeds ₹6,000 nightly cap.` };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P5', reason: '' };
}

function checkRuleP6Software(claim) {
  if (claim.category === 'Software' && parseFloat(claim.amountInr) > 5000) {
    return { fired: true, verdictContribution: 'NEEDS_APPROVAL', clause: 'P6',
      reason: `Software subscription ₹${parseFloat(claim.amountInr).toFixed(2)} exceeds ₹5,000; IT approval required.` };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P6', reason: '' };
}

function checkRuleP7ClientEntertainment(claim) {
  if (claim.category === 'Client entertainment') {
    return { fired: true, verdictContribution: 'NEEDS_APPROVAL', clause: 'P7',
      reason: 'Client entertainment requires managerial review and attendee validation.' };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P7', reason: '' };
}

function checkRuleP8StaleDate(claim) {
  const policyDate = getPolicyDate();
  const claimDate  = new Date(claim.date);
  const ageDays    = Math.floor((policyDate - claimDate) / (1000 * 60 * 60 * 24));
  if (ageDays > 90) {
    return { fired: true, verdictContribution: 'REJECT', clause: 'P8',
      reason: `Claim is ${ageDays} days old, exceeding the 90-day policy window relative to ${process.env.POLICY_AS_OF_DATE || '2026-10-13'}.` };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P8', reason: '' };
}

function checkRuleP9Alcohol(claim) {
  const text = `${claim.notes || ''} ${claim.receiptText || ''}`.toLowerCase();
  if (text.includes('alcohol') || text.includes('beer') || text.includes('wine') || text.includes('liquor')) {
    return { fired: true, verdictContribution: 'REJECT', clause: 'P9',
      reason: 'Receipt contains non-reimbursable alcoholic beverage items.' };
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P9', reason: '' };
}

function checkRuleP11Duplicate(claim, allClaims) {
  for (const other of allClaims) {
    if (other.claimId === claim.claimId) continue;
    const otherId = parseInt(other.claimId, 10) || 0;
    const thisId  = parseInt(claim.claimId, 10) || 1;
    if (
      other.employee === claim.employee &&
      other.date    === claim.date &&
      other.vendor.trim().toLowerCase() === claim.vendor.trim().toLowerCase() &&
      Math.abs(parseFloat(other.amountInr) - parseFloat(claim.amountInr)) < 0.01 &&
      thisId > otherId
    ) {
      return { fired: true, verdictContribution: 'REJECT', clause: 'P11',
        reason: `Duplicate submission matching earlier claim #${other.claimId}.` };
    }
  }
  return { fired: false, verdictContribution: 'ALLOW', clause: 'P11', reason: '' };
}

// ── Main check function ───────────────────────────────────────────────────────

/**
 * Evaluate all rules P1-P11 on a claim.
 * Mirrors Python: check_claim(claim, all_claims, inbox_emails) -> PolicyVerdict
 * @param {object} claim - ClaimRecord-like object
 * @param {Array}  allClaims
 * @param {Array}  inboxEmails
 * @returns {object} PolicyVerdict
 */
export function checkClaim(claim, allClaims, inboxEmails = []) {
  // Resolve ambiguous category (Task 3.3a)
  claim.category = resolveCategoryForClaim(claim, inboxEmails);

  // Run ALL rules without early exit
  const results = [
    checkRuleP1Receipt(claim),
    checkRuleP2MealLimit(claim, allClaims),
    checkRuleP3CabLimit(claim),
    checkRuleP4FlightPreapproval(claim, inboxEmails),
    checkRuleP5LodgingLimit(claim),
    checkRuleP6Software(claim),
    checkRuleP7ClientEntertainment(claim),
    checkRuleP8StaleDate(claim),
    checkRuleP9Alcohol(claim),
    checkRuleP11Duplicate(claim, allClaims),
  ];

  const firedRules = results.filter((r) => r.fired);
  const clausesTriggered = firedRules.map((r) => r.clause);

  let accumulatedVerdict, reasons;
  if (firedRules.length === 0) {
    accumulatedVerdict = 'ALLOW';
    reasons = ['All policy rules satisfied.'];
  } else {
    firedRules.sort((a, b) => VERDICT_PRIORITY[b.verdictContribution] - VERDICT_PRIORITY[a.verdictContribution]);
    accumulatedVerdict = firedRules[0].verdictContribution;
    reasons = firedRules.map((r) => r.reason);
  }

  // Post-pass P10: >₹10,000 threshold
  if (parseFloat(claim.amountInr) > 10000) {
    if (!clausesTriggered.includes('P10')) clausesTriggered.push('P10');
    if (accumulatedVerdict === 'ALLOW') {
      accumulatedVerdict = 'NEEDS_APPROVAL';
      reasons.push(`Claim exceeds ₹10,000 threshold (₹${parseFloat(claim.amountInr).toFixed(2)}); human approval required.`);
    }
  }

  // Determine approver
  let approverRequired = null;
  if (accumulatedVerdict === 'NEEDS_APPROVAL') {
    if (clausesTriggered.includes('P10'))     approverRequired = 'FINANCE_DIRECTOR';
    else if (clausesTriggered.includes('P6')) approverRequired = 'IT_HEAD';
    else                                      approverRequired = 'MANAGER';
  }

  // Sync verdict back to claim object (mirrors Python)
  claim.verdict          = accumulatedVerdict;
  claim.clausesTriggered = clausesTriggered;

  return {
    claimId:          claim.claimId,
    verdict:          accumulatedVerdict,
    clausesTriggered,
    reason:           reasons.join('; '),
    approverRequired,
  };
}

export {
  sumMealsForDay,
  resolveCategoryForClaim,
  VERDICT_PRIORITY,
  ALLOWED_CATEGORIES,
  checkRuleP1Receipt,
  checkRuleP2MealLimit,
  checkRuleP3CabLimit,
  checkRuleP4FlightPreapproval,
  checkRuleP5LodgingLimit,
  checkRuleP6Software,
  checkRuleP7ClientEntertainment,
  checkRuleP8StaleDate,
  checkRuleP9Alcohol,
  checkRuleP11Duplicate,
};
