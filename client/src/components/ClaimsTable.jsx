/**
 * ClaimsTable.jsx — Claims list data table
 */
import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export function ClaimsTable({ claims = [] }) {
  if (!claims || claims.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>No expense claims found.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table" id="claims-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Employee</th>
            <th>Date</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Amount</th>
            <th>Cost Center</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => {
            const id = claim.id || claim._id;
            const amount = parseFloat(claim.amount_inr ?? claim.amountInr ?? 0);
            return (
              <tr key={id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  #{String(id).substring(0, 8)}
                </td>
                <td style={{ fontWeight: 600 }}>{claim.employee}</td>
                <td>{claim.date}</td>
                <td>{claim.category}</td>
                <td>{claim.vendor}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {claim.cost_center || claim.costCenter || '—'}
                  </span>
                </td>
                <td>
                  <StatusBadge status={claim.status || 'SUBMITTED'} />
                </td>
                <td>
                  <Link to={`/claims/${id}`} className="btn btn-secondary btn-sm">
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ClaimsTable;
