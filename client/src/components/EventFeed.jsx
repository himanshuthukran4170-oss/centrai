/**
 * EventFeed.jsx — Real-time event log stream for the operator dashboard
 */
import React, { useRef, useEffect } from 'react';

export function EventFeed({ events = [] }) {
  const feedEndRef = useRef(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
        <p>Waiting for agent events...</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Stream will update as the operator processes claims.</p>
      </div>
    );
  }

  return (
    <div className="event-feed">
      {events.map((ev, index) => {
        const timeStr = ev.timestamp
          ? new Date(ev.timestamp).toLocaleTimeString()
          : '';
        const payloadStr = typeof ev.payload === 'object' ? JSON.stringify(ev.payload, null, 2) : String(ev.payload);

        return (
          <div key={ev.id || ev._id || index} className="event-card">
            <div className="event-header">
              <span className="event-type">{ev.type}</span>
              <span className="event-time">{timeStr}</span>
            </div>
            <pre className="event-body">{payloadStr}</pre>
          </div>
        );
      })}
      <div ref={feedEndRef} />
    </div>
  );
}

export default EventFeed;
