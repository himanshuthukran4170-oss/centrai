/**
 * ClaimsListPage.jsx — Finance Portal expense claims ledger
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import ClaimsTable from '../components/ClaimsTable';

export function ClaimsListPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/claims');
      setClaims(res.data.claims || res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const filteredClaims = claims.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.employee || '').toLowerCase().includes(q) ||
      (c.vendor || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.costCenter || c.cost_center || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <h1>Finance <span className="gradient-text">Claims Ledger</span></h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Official corporate record of submitted and audited expense reimbursement requests
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search employee, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
          <Link to="/claims/new" className="btn btn-primary" id="new-claim-btn">
            + New Claim
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-banner error-banner">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading expense claims...</p>
        </div>
      ) : (
        <ClaimsTable claims={filteredClaims} />
      )}
    </div>
  );
}

export default ClaimsListPage;
