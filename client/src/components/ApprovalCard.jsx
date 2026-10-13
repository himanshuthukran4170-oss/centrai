/**
 * ApprovalCard.jsx — Human-in-the-loop approval card for gated claims
 */
import React, { useState } from 'react';
import apiClient from '../api/apiClient';

export function ApprovalCard({ approval, runId, onDecided }) {
  const [loading, setLoading] = useState(false);
  const [decisionMade, setDecisionMade] = useState(null);

  const claimId = approval.claim_id || approval.claimId;
  const amount = parseFloat(approval.amount_inr || approval.amountInr || 0);

  const handleDecision = async (decision) => {
    setLoading(true);
    try {
      await apiClient.post(`/ui/approval/${runId}/${claimId}`, {
        decision,
        note: `Decided by human operator in UI (${decision})`,
      });
      setDecisionMade(decision);
      if (onDecided) onDecided(claimId, decision);
    } catch (err) {
      alert(`Error submitting decision: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ borderLeft: '4px solid var(--status-pending)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Claim #{claimId}</span>
          <h4 style={{ fontSize: '1.05rem', margin: '0.2rem 0' }}>{approval.employee}</h4>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: 'var(--accent-cyan)',
          fontSize: '1.1rem',
        }}>
          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        <p><strong>Vendor:</strong> {approval.vendor || 'N/A'}</p>
        <p><strong>Reason:</strong> {approval.reason || 'Human authorization required'}</p>
        {approval.clauses && approval.clauses.length > 0 && (
          <p><strong>Clauses:</strong> {approval.clauses.join(', ')}</p>
        )}
      </div>

      {decisionMade ? (
        <div style={{
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '0.85rem',
          background: decisionMade === 'APPROVED' ? 'var(--status-allow-bg)' : 'var(--status-reject-bg)',
          color: decisionMade === 'APPROVED' ? 'var(--status-allow)' : 'var(--status-reject)',
        }}>
          ✓ {decisionMade}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleDecision('APPROVED')}
            disabled={loading}
            className="btn btn-success btn-sm"
            style={{ flex: 1 }}
            id={`approve-btn-${claimId}`}
          >
            {loading ? 'Submitting...' : 'Approve'}
          </button>
          <button
            onClick={() => handleDecision('DENIED')}
            disabled={loading}
            className="btn btn-danger btn-sm"
            style={{ flex: 1 }}
            id={`deny-btn-${claimId}`}
          >
            {loading ? 'Submitting...' : 'Deny'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ApprovalCard;
