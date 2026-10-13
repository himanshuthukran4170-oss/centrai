/**
 * ClaimDetailPage.jsx — Detailed view of a single claim
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import StatusBadge from '../components/StatusBadge';

export function ClaimDetailPage() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchClaim() {
      try {
        setLoading(true);
        const res = await apiClient.get(`/claims/${id}`);
        setClaim(res.data.claim || res.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchClaim();
  }, [id]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading claim details...</p>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div>
        <Link to="/claims" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ← Back to Claims
        </Link>
        <div className="alert-banner error-banner" style={{ marginTop: '1rem' }}>
          <span>{error || 'Claim not found.'}</span>
        </div>
      </div>
    );
  }

  const amount = parseFloat(claim.amount_inr ?? claim.amountInr ?? 0);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/claims" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ← Back to Claims Ledger
        </Link>
        <StatusBadge status={claim.status || 'SUBMITTED'} />
      </div>

      <div className="alert-banner success-banner" id="success-banner" style={{ marginBottom: '1.5rem' }}>
        <span>Claim record is registered in the finance system.</span>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Claim Record</span>
            <h2 style={{ marginTop: '0.25rem' }}>#{String(claim.id || claim._id).substring(0, 8)}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Amount</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span className="form-label">Employee</span>
            <p style={{ fontWeight: 600 }}>{claim.employee}</p>
          </div>
          <div>
            <span className="form-label">Date</span>
            <p>{claim.date}</p>
          </div>
          <div>
            <span className="form-label">Category</span>
            <p>{claim.category}</p>
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span className="form-label">Vendor</span>
            <p>{claim.vendor}</p>
          </div>
          <div>
            <span className="form-label">Cost Center</span>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              {claim.cost_center || claim.costCenter || '—'}
            </p>
          </div>
          <div>
            <span className="form-label">Receipt Identifier</span>
            <p style={{ fontFamily: 'var(--font-mono)' }}>
              {claim.receipt_id || claim.receiptId || 'None'}
            </p>
          </div>
        </div>

        {claim.description && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
            <span className="form-label">Business Justification</span>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{claim.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClaimDetailPage;
