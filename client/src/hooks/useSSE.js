/**
 * useSSE.js — EventSource hook for real-time SSE event streaming
 */
import { useState, useEffect } from 'react';

export function useSSE(runId) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!runId) return;

    setEvents([]);
    const eventSource = new EventSource(`/ui/events/${runId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setEvents((prev) => [...prev, parsed]);
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [runId]);

  return { events, isConnected };
}

export default useSSE;
