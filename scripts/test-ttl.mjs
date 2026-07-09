/**
 * Room-TTL verification. Two layers:
 *   1. selectStaleCodes — pure logic (missing/old timestamps → stale).
 *   2. sweepStaleRooms — against the RTDB emulator: a stale room and its
 *      answer key are deleted; a fresh room survives.
 *
 * Run with the emulator suite up:  node scripts/test-ttl.mjs
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

process.env.GCLOUD_PROJECT = 'demo-the-quiz-game';
process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
process.env.FIREBASE_CONFIG = JSON.stringify({
  databaseURL: 'http://127.0.0.1:9000/?ns=demo-the-quiz-game-default-rtdb',
  projectId: 'demo-the-quiz-game',
});

// Resolve bare specifiers (and ./index.js) from inside functions/, so the
// firebase-admin package "exports" subpaths resolve against functions/node_modules.
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { getDatabase } = require('firebase-admin/database');
// Loading index.js initializes the default admin app (uses the env above).
const { selectStaleCodes, sweepStaleRooms, TTL_MS } = require('./index.js');

const now = 1_700_000_000_000;
const fresh = now - 60_000; // a minute ago
const stale = now - TTL_MS - 60_000; // just past the 4h cutoff

// --- 1. pure logic -----------------------------------------------------------
assert.deepEqual(
  selectStaleCodes({ A: { lastActiveAt: fresh }, B: { lastActiveAt: stale } }, now).sort(),
  ['B'],
  'only the idle room is stale',
);
assert.deepEqual(selectStaleCodes({ C: { createdAt: stale } }, now), ['C'], 'falls back to createdAt');
assert.deepEqual(selectStaleCodes({ D: {} }, now), ['D'], 'no timestamp at all → stale');
assert.deepEqual(selectStaleCodes({ E: { lastActiveAt: now } }, now), [], 'exactly now → alive');
console.log('✓ selectStaleCodes logic');

// --- 2. against the emulator -------------------------------------------------
const db = getDatabase();
const room = (lastActiveAt) => ({
  hostId: 'host-x', quizId: 'q', status: 'ended', answerMode: 'firstTap',
  scores: { A: 0, B: 0 }, teams: { A: { name: 'A' }, B: { name: 'B' } },
  board: { t: { tileName: 'T', questionText: 'Q?', possibleAnswers: [{ answerMessage: 'x' }] } },
  lastActiveAt,
});

await db.ref('rooms/TTLSTALE').set(room(stale));
await db.ref('roomKeys/TTLSTALE').set({ hostId: 'host-x', key: { t: 0 } });
await db.ref('rooms/TTLFRESH').set(room(fresh));
await db.ref('roomKeys/TTLFRESH').set({ hostId: 'host-x', key: { t: 0 } });

const result = await sweepStaleRooms(db, now);

assert.equal((await db.ref('rooms/TTLSTALE').get()).exists(), false, 'stale room deleted');
assert.equal((await db.ref('roomKeys/TTLSTALE').get()).exists(), false, 'stale answer key deleted');
assert.equal((await db.ref('rooms/TTLFRESH').get()).exists(), true, 'fresh room kept');
assert.equal((await db.ref('roomKeys/TTLFRESH').get()).exists(), true, 'fresh answer key kept');
console.log(`✓ sweepStaleRooms against emulator (removed ${result.removed} of ${result.scanned})`);

console.log('\nAll room-TTL checks passed.');
process.exit(0);
