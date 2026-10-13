/**
 * ReportPage.jsx — Execution & verification report viewer
 */
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import apiClient from '../api/apiClient';

export function ReportPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await apiClient.get('/ui/runs');
        const list = res.data.runs || [];
        setRuns(list);
        if (list.length > 0) {
          setSelectedRunId(list[0]);
        }
      } catch (err) {
        console.warn('Could not fetch runs:', err.message);
      }
    }
    fetchRuns();
  }, []);

  useEffect(() => {
    async function fetchReport() {
      if (!selectedRunId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await apiClient.get(`/ui/report/${selectedRunId}`);
        setReportMarkdown(res.data.report || res.data || '');
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'No report found for this run.');
        setReportMarkdown('');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [selectedRunId]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <h1>Operator <span className="gradient-text">Audit Report</span></h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Cryptographically signed verification verdicts and policy execution log
          </p>
        </div>

        {runs.length > 0 && (
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '200px' }}
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
          >
            {runs.map((r) => (
              <option key={r} value={r}>Report for: {r}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="alert-banner error-banner">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading audit report...</p>
        </div>
      ) : reportMarkdown ? (
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <div className="markdown-body">
            <ReactMarkdown>{reportMarkdown}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            No report generated yet. Launch an operator run from the Dashboard to generate one.
          </p>
        </div>
      )}
    </div>
  );
}

export default ReportPage;
