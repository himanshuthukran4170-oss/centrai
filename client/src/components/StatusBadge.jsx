/**
 * StatusBadge.jsx — Visual indicator badge for policy and claim statuses
 */
import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();
  let badgeClass = 'badge-info';

  if (['ALLOW', 'APPROVED', 'PASS'].includes(normalized)) {
    badgeClass = 'badge-allow';
  } else if (['REJECT', 'DENIED', 'FAIL', 'FORBIDDEN'].includes(normalized)) {
    badgeClass = 'badge-reject';
  } else if (['NEEDS_APPROVAL', 'PENDING'].includes(normalized)) {
    badgeClass = 'badge-needs_approval';
  } else if (['SUBMITTED'].includes(normalized)) {
    badgeClass = 'badge-submitted';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {normalized.replace('_', ' ')}
    </span>
  );
}

export default StatusBadge;
