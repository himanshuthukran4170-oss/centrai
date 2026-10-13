/**
 * NewClaimPage.jsx — Claim submission form
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

const CATEGORIES = [
  'Meals',
  'Cab',
  'Flight',
  'Lodging',
  'Software',
  'Client entertainment',
  'Other',
];

export function NewClaimPage() {
  const [formData, setFormData] = useState({
    employee: 'Priya Sharma',
    date: new Date().toISOString().substring(0, 10),
    category: 'Meals',
    amount_inr: '',
    vendor: '',
    cost_center: 'CC-42',
    receipt_id: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await apiClient.post('/claims/new', formData);
      setSuccess('Expense claim submitted successfully!');
      setTimeout(() => {
        const id = res.data.claimId || res.data.id || (res.data.claim && (res.data.claim.id || res.data.claim._id));
        if (id) {
          navigate(`/claims/${id}`);
        } else {
          navigate('/claims');
        }
      }, 800);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Submission failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/claims" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ← Back to Claims Ledger
        </Link>
        <h1 style={{ marginTop: '0.5rem' }}>Submit <span className="gradient-text">Expense Claim</span></h1>
        <p className="subtitle">Enter claim details for reimbursement processing and policy audit</p>
      </div>

      <div className="glass-panel">
        {error && (
          <div className="alert-banner error-banner" id="form-error-banner">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-banner success-banner" id="success-banner">
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="claim-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="employee">Employee Name *</label>
              <input
                id="employee"
                name="employee"
                type="text"
                className="form-control"
                value={formData.employee}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date">Expense Date *</label>
              <input
                id="date"
                name="date"
                type="date"
                className="form-control"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                className="form-control"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount_inr">Amount (INR ₹) *</label>
              <input
                id="amount_inr"
                name="amount_inr"
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder="e.g. 1500.00"
                value={formData.amount_inr}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="vendor">Vendor / Merchant *</label>
              <input
                id="vendor"
                name="vendor"
                type="text"
                className="form-control"
                placeholder="e.g. Blue Tokai Coffee"
                value={formData.vendor}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cost_center">Cost Center *</label>
              <input
                id="cost_center"
                name="cost_center"
                type="text"
                className="form-control"
                placeholder="e.g. CC-42"
                value={formData.cost_center}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="receipt_id">Receipt Identifier</label>
            <input
              id="receipt_id"
              name="receipt_id"
              type="text"
              className="form-control"
              placeholder="e.g. REC-10293 or Invoice Number"
              value={formData.receipt_id}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Business Justification / Description</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              className="form-control"
              placeholder="Business purpose of expenditure..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Link to="/claims" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="submit-claim-button"
            >
              {loading ? 'Filing Claim...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewClaimPage;
