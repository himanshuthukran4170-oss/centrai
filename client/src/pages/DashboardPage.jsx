/**
 * DashboardPage.jsx — Autonomous Operator Live Monitoring & Approval Center
 */
import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useSSE } from '../hooks/useSSE';
import { useRunState } from '../hooks/useRunState';
import EventFeed from '../components/EventFeed';
import PlanProgress from '../components/PlanProgress';
import ApprovalCard from '../components/ApprovalCard';
import StatusBadge from '../components/StatusBadge';

export function DashboardPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [isStartingRun, setIsStartingRun] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await apiClient.get('/ui/runs');
      const runsList = res.data.runs || [];
      setRuns(runsList);
      if (runsList.length > 0 && !selectedRunId) {
        setSelectedRunId(runsList[0]);
      }
    } catch (err) {
      console.warn('Could not fetch runs:', err.message);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, []);

  const { events, isConnected } = useSSE(selectedRunId);
  const { state, refresh } = useRunState(selectedRunId);

  const handleStartRun = async () => {
    setIsStartingRun(true);
    try {
      const res = await apiClient.post('/agent/run', {
        goal: "Process Priya Sharma's Q3 expense claims",
        scenarioName: 's2',
      });
      const newRunId = res.data.runId;
      setSelectedRunId(newRunId);
      await fetchRuns();
    } catch (err) {
      alert(`Failed to start operator run: ${err.message}`);
    } finally {
      setIsStartingRun(false);
    }
  };

  // Extract pending approvals from state or approval_requested events
  const pendingApprovals = (state?.pendingApprovals || []).filter((a) => a.status === 'PENDING');

  return (
    <div>
      {/* Top Header & Run Control Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <h1>Operator <span className="gradient-text">Command Center</span></h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Live agent activity, deterministic policy gate, and human-in-the-loop approvals
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {runs.length > 0 && (
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
            >
              {runs.map((r) => (
                <option key={r} value={r}>Run: {r}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleStartRun}
            disabled={isStartingRun}
            className="btn btn-primary"
            id="start-run-button"
          >
            {isStartingRun ? 'Starting...' : '⚡ Launch Operator Run'}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {state && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</span>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`badge ${isConnected ? 'badge-allow' : 'badge-pending'}`}>
                {isConnected ? 'LIVE STREAMING' : 'IDLE / RECONNECTING'}
              </span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Execution Steps</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {state.stepIndex || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Cost</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-cyan)' }}>
              ${(state.totalCostUsd || 0).toFixed(4)}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tokens Consumed</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {(state.tokensUsed || 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="dashboard-grid">
        {/* Left Column: Requirements & Plan */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Plan & Strategy</h3>
          <PlanProgress
            plan={state?.plan || []}
            requirements={state?.expandedRequirements || []}
          />
        </div>

        {/* Center Column: Live Event Stream */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Real-Time Activity Feed</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              {events.length} events logged
            </span>
          </div>
          <EventFeed events={events} />
        </div>

        {/* Right Column: Approvals & Gate */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Human Approval Gates</h3>
            <span className="badge badge-needs_approval">
              {pendingApprovals.length} Pending
            </span>
          </div>

          {pendingApprovals.length > 0 ? (
            pendingApprovals.map((appr, idx) => (
              <ApprovalCard
                key={appr.claimId || idx}
                approval={appr}
                runId={selectedRunId}
                onDecided={() => refresh()}
              />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
              <p style={{ fontSize: '0.9rem' }}>No claims awaiting approval.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Claims flagged under P4, P6, P7, or P10 will appear here in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
