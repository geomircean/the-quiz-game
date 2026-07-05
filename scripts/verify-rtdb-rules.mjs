/**
 * Emulator-based verification of the RTDB room rules (P3 contract):
 * Google-only room creation (creation-only at the room root — ANY collision
 * fails closed, including the host's own), sealed rooms (members + host
 * only, no enumeration), players write only their own membership, host
 * mutations only through enumerated control fields, and — load-bearing —
 * the board STRUCTURALLY rejects the correct answer in every probed shape
 * (leaf isCorrect, whole-tile rewrite, scalar smuggling, root answerKey).
 *
 * Uses separate named app instances so host / player / outsider sessions
 * exist concurrently. Run with the emulator suite up:
 *   node scripts/verify-rtdb-rules.mjs
 */
import { randomInt } from 'node:crypto';
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithCredential,
} from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, ref, set, update } from 'firebase/database';

const CONFIG = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-the-quiz-game.firebaseapp.com',
  databaseURL: 'http://127.0.0.1:9000/?ns=demo-the-quiz-game-default-rtdb',
  projectId: 'demo-the-quiz-game',
};

const session = (name) => {
  const app = initializeApp(CONFIG, name);
  const auth = getAuth(app);
  const rtdb = getDatabase(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
  return { auth, rtdb };
};

const host = session('host');
const player = session('player');
const outsider = session('outsider');
const rivalHost = session('rival');

const signInGoogle = (s, sub, email) =>
  signInWithCredential(s.auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email })));

const results = [];
const check = async (name, expectation, fn) => {
  try {
    await fn();
    results.push({ name, pass: expectation === 'allow', got: 'allow' });
  } catch (error) {
    const denied = /permission|denied/i.test(String(error.message ?? error.code ?? ''));
    results.push({
      name,
      pass: expectation === 'deny' ? denied : false,
      got: denied ? 'deny' : `error:${error.message}`,
    });
  }
};

// Random per-run code: rooms are immutable at the root (no deletes), so a
// fixed code would collide on the suite's second run against one emulator.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const roomDoc = {
  hostId: null, // filled after sign-in
  quizId: 'quiz-1',
  quizName: 'Verification Quiz',
  status: 'lobby',
  answerMode: 'firstTap',
  currentTurn: 'A',
  revealed: false,
  scores: { A: 0, B: 0 },
  teams: { A: { name: 'Team 1' }, B: { name: 'Team 2' } },
  board: {
    q1: {
      tileName: 'Geography',
      questionText: 'Capital of France?',
      possibleAnswers: [{ answerMessage: 'Paris' }, { answerMessage: 'Lyon' }],
    },
  },
};

// --- Sessions ---------------------------------------------------------------
const hostUser = await signInGoogle(host, 'host-sub', 'host@example.com');
const playerUser = await signInAnonymously(player.auth);
const outsiderUser = await signInAnonymously(outsider.auth);
await signInGoogle(rivalHost, 'rival-sub', 'rival@example.com');
roomDoc.hostId = hostUser.user.uid;

// --- Creation ---------------------------------------------------------------
await check('anonymous user cannot create a room', 'deny', () =>
  set(ref(player.rtdb, 'rooms/ANON'), { ...roomDoc, hostId: playerUser.user.uid }));
await check('host cannot create a room with isCorrect in the board', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), {
    ...roomDoc,
    board: { q1: { ...roomDoc.board.q1, possibleAnswers: [{ answerMessage: 'Paris', isCorrect: true }] } },
  }));
await check('host cannot create a room with stray fields inside a tile', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), {
    ...roomDoc,
    board: { q1: { ...roomDoc.board.q1, answerKey: 0 } },
  }));
await check('host creates a clean room', 'allow', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), roomDoc));
await check('rival host cannot overwrite the room (code collision → retry)', 'deny', () =>
  set(ref(rivalHost.rtdb, `rooms/${CODE}`), { ...roomDoc, hostId: 'rival-uid' }));
await check('host cannot overwrite their OWN room (self-collision fails closed)', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), roomDoc));

// --- Sealed reads -----------------------------------------------------------
await check('host reads own room', 'allow', () => get(ref(host.rtdb, `rooms/${CODE}`)));
await check('non-member cannot read the room', 'deny', () => get(ref(outsider.rtdb, `rooms/${CODE}`)));
await check('rival host cannot read the room', 'deny', () => get(ref(rivalHost.rtdb, `rooms/${CODE}`)));
await check('outsider cannot enumerate /rooms', 'deny', () => get(ref(outsider.rtdb, 'rooms')));

// --- Joining ----------------------------------------------------------------
await check('player joins with own uid', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUser.user.uid}`), { name: 'Ana', team: 'A', connected: true }));
await check('member reads the room after joining', 'allow', () =>
  get(ref(player.rtdb, `rooms/${CODE}`)));
await check('member cannot enumerate /rooms either', 'deny', () =>
  get(ref(player.rtdb, 'rooms')));
await check('player cannot join a nonexistent room', 'deny', () =>
  set(ref(player.rtdb, `rooms/NOPE/players/${playerUser.user.uid}`), { name: 'Ana', team: 'A', connected: true }));
await check("player cannot write another player's membership", 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${outsiderUser.user.uid}`), { name: 'Fake', team: 'B', connected: true }));
await check('player cannot join with an invalid team', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUser.user.uid}`), { name: 'Ana', team: 'C', connected: true }));
await check('player cannot smuggle extra fields into membership', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUser.user.uid}`), { name: 'Ana', team: 'A', connected: true, isHost: true }));
await check('player updates own presence flag', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUser.user.uid}/connected`), false));

// --- Host-only control ------------------------------------------------------
await check('player cannot change scores', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/scores/A`), 99));
await check('player cannot change status', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/status`), 'playing'));
await check('player cannot change currentTurn', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/currentTurn`), 'B'));
await check('player cannot inject isCorrect into the live board', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/board/q1/possibleAnswers/0/isCorrect`), true));
await check('host updates status', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE}`), { status: 'playing' }));
await check('host updates scores and turn', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE}`), { 'scores/A': 1, currentTurn: 'B', revealed: true }));

// --- The answer must be unwritable in EVERY probed shape --------------------
await check('host cannot inject isCorrect at the leaf path', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/board/q1/possibleAnswers/0/isCorrect`), true));
await check('host cannot rewrite a whole answer object with isCorrect', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/board/q1/possibleAnswers/0`), { answerMessage: 'Paris', isCorrect: true }));
await check('host cannot rewrite a whole tile at all (board is immutable)', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/board/q1`), roomDoc.board.q1));
await check('host cannot smuggle a scalar answer key into possibleAnswers', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/board/q1/possibleAnswers/correctIndex`), 0));
await check('host cannot write an answerKey node at the room root', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/answerKey`), { q1: 0 }));

// --- Data-shape assertion: walk the player-readable payload -----------------
const FORBIDDEN_KEYS = new Set(['isCorrect', 'correctIndex', 'answerKey']);
const findForbidden = (node, path = '') => {
  if (node === null || typeof node !== 'object') return null;
  for (const [key, value] of Object.entries(node)) {
    if (FORBIDDEN_KEYS.has(key)) return `${path}/${key}`;
    const hit = findForbidden(value, `${path}/${key}`);
    if (hit) return hit;
  }
  return null;
};
const snapshot = await get(ref(player.rtdb, `rooms/${CODE}`));
const leak = findForbidden(snapshot.val());
results.push({
  name: 'player-readable room payload contains no forbidden answer keys',
  pass: leak === null,
  got: leak ? `LEAKED at ${leak}` : 'clean',
});

// --- Report -----------------------------------------------------------------
let failed = 0;
for (const { name, pass, got } of results) {
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (got: ${got})`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
