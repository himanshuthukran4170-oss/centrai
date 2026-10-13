/**
 * eventBus.js
 * Replaces Python agent/event_bus.py — SQLite WAL events_<run_id>.db → MongoDB AgentEvent collection
 */
import AgentEvent from '../models/AgentEvent.js';

/**
 * Emit an event into MongoDB.
 * Mirrors Python: emit(run_id, event_type, payload) -> int (row id)
 * @returns {Promise<string>} Inserted document _id as string
 */
export async function emit(runId, eventType, payload) {
  const doc = await AgentEvent.create({ runId, type: eventType, payload });
  return doc._id.toString();
}

/**
 * Poll events for a run since a given MongoDB ObjectId.
 * Mirrors Python: poll_events(run_id, since_id, type_filter) -> List[dict]
 * @param {string} runId
 * @param {string|null} sinceId - MongoDB ObjectId string (or null for all)
 * @param {string|null} typeFilter - event type filter
 * @returns {Promise<Array>}
 */
export async function pollEvents(runId, sinceId = null, typeFilter = null) {
  const query = { runId };
  if (sinceId) {
    const { Types } = await import('mongoose');
    query._id = { $gt: new Types.ObjectId(sinceId) };
  }
  if (typeFilter) {
    query.type = typeFilter;
  }

  const events = await AgentEvent.find(query).sort({ _id: 1 }).lean();

  return events.map((ev) => ({
    id:        ev._id.toString(),
    runId:     ev.runId,
    timestamp: ev.timestamp,
    type:      ev.type,
    payload:   ev.payload,
  }));
}
