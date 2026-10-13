/**
 * useRunState.js — Hook to fetch and poll TaskState from MongoDB
 */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

export function useRunState(runId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchState = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await apiClient.get(`/ui/state/${runId}`);
      setState(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      setState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchState();

    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [runId, fetchState]);

  return { state, loading, error, refresh: fetchState };
}

export default useRunState;
