'use strict';

// Room TTL — a scheduled sweep that deletes live-game rooms (and their
// host-only answer keys) once they have been idle past the cutoff.
//
// "Idle" = time since `lastActiveAt`, which the client bumps on create,
// every host action, and each player join (see src/data/rooms.js). Rooms
// predating that field fall back to `createdAt`; anything with neither is
// treated as stale. Rooms live in Realtime Database, which has no native
// TTL, so this scheduled function is the cleanup mechanism.

const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

initializeApp();

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours of inactivity

// Pure, unit-testable core: given the whole `rooms` object and the current
// time, return the codes idle past `ttlMs`. Missing timestamps → stale.
const selectStaleCodes = (rooms, now, ttlMs = TTL_MS) => {
  const cutoff = now - ttlMs;
  return Object.entries(rooms ?? {})
    .filter(([, room]) => {
      const ts = room?.lastActiveAt ?? room?.createdAt ?? 0;
      return ts < cutoff;
    })
    .map(([code]) => code);
};

// Delete each stale room and its matching answer key in one atomic update.
const sweepStaleRooms = async (db, now) => {
  const snap = await db.ref('rooms').get();
  if (!snap.exists()) return { scanned: 0, removed: 0 };

  const rooms = snap.val();
  const staleCodes = selectStaleCodes(rooms, now);
  if (staleCodes.length > 0) {
    const updates = {};
    for (const code of staleCodes) {
      updates[`rooms/${code}`] = null;
      updates[`roomKeys/${code}`] = null;
    }
    await db.ref().update(updates);
  }
  return { scanned: Object.keys(rooms).length, removed: staleCodes.length };
};

const cleanupStaleRooms = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '256MiB',
    retryCount: 0,
  },
  async () => {
    const { scanned, removed } = await sweepStaleRooms(getDatabase(), Date.now());
    logger.info(`room TTL sweep: ${removed} of ${scanned} room(s) removed (idle > 4h)`);
  },
);

module.exports = { cleanupStaleRooms, selectStaleCodes, sweepStaleRooms, TTL_MS };
