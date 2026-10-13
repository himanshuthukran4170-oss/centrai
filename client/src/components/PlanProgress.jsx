/**
 * PlanProgress.jsx — Displays current plan execution steps
 */
import React from 'react';
import StatusBadge from './StatusBadge';

export function PlanProgress({ plan = [], requirements = [] }) {
  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Expanded Requirements
        </h4>
        {requirements && requirements.length > 0 ? (
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {requirements.map((req, i) => (
              <li key={i} style={{ marginBottom: '0.35rem' }}>{req}</li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No requirements formulated yet.</p>
        )}
      </div>

      <div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Execution Plan
        </h4>
        {plan && plan.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {plan.map((step) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                }}
              >
                <span>
                  <strong style={{ color: 'var(--accent-cyan)', marginRight: '0.5rem' }}>
                    #{step.id}
                  </strong>
                  {step.description}
                </span>
                <StatusBadge status={step.status || 'PENDING'} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Plan steps will appear when operator initializes.</p>
        )}
      </div>
    </div>
  );
}

export default PlanProgress;
