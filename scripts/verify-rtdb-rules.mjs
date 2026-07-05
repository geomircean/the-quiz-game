/**
 * Emulator-based verification of the RTDB room rules (P3 + P4 contracts):
 * - Google-only, creation-only room roots (any collision fails closed)
 * - sealed rooms (members + host only, no enumeration)
 * - players write only their own validated membership
 * - host mutations only through enumerated control fields
 * - the board STRUCTURALLY rejects the correct answer in every probed shape
 * - taps: own uid only, on turn, on the active tile, before reveal, with a
 *   SERVER timestamp; firstTap mode locks the first tap (no overwrite)
 * - reveals + winner: host-only; answer key (roomKeys/$code): host-only
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
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';

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

// Random per-run codes: room roots are immutable (no deletes), so fixed
// codes would collide on the suite's second run against one emulator.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const randomCode = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const CODE = randomCode();
const CODE2 = randomCode();

const makeRoom = (hostId, answerMode) => ({
  hostId,
  quizId: 'quiz-1',
  quizName: 'Verification Quiz',
  status: 'lobby',
  answerMode,
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
    q2: {
      tileName: 'Art',
      questionText: 'Who painted the Mona Lisa?',
      possibleAnswers: [{ answerMessage: 'Da Vinci' }, { answerMessage: 'Monet' }],
    },
  },
});

// --- Sessions ---------------------------------------------------------------
const hostUser = await signInGoogle(host, 'host-sub', 'host@example.com');
const playerUser = await signInAnonymously(player.auth);
const outsiderUser = await signInAnonymously(outsider.auth);
await signInGoogle(rivalHost, 'rival-sub', 'rival@example.com');
const roomDoc = makeRoom(hostUser.user.uid, 'firstTap');
const playerUid = playerUser.user.uid;

// --- Creation ---------------------------------------------------------------
await check('anonymous user cannot create a room', 'deny', () =>
  set(ref(player.rtdb, 'rooms/ANON'), makeRoom(playerUid, 'firstTap')));
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
await check('host cannot create a room with an unknown root key', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), { ...roomDoc, secretStash: { q1: 0 } }));
await check('host cannot create a room with junk inside teams', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), { ...roomDoc, teams: { A: { name: 'Team 1', motto: 'x' }, B: { name: 'Team 2' } } }));
await check('host creates a clean room', 'allow', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), roomDoc));
await check('rival host cannot overwrite the room (code collision → retry)', 'deny', () =>
  set(ref(rivalHost.rtdb, `rooms/${CODE}`), { ...roomDoc, hostId: 'rival-uid' }));
await check('host cannot overwrite their OWN room (self-collision fails closed)', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}`), roomDoc));

// --- Answer key (roomKeys) ---------------------------------------------------
await check('host stores the answer key', 'allow', () =>
  set(ref(host.rtdb, `roomKeys/${CODE}`), { hostId: hostUser.user.uid, key: { q1: 0, q2: 0 } }));
await check('host reads own answer key', 'allow', () => get(ref(host.rtdb, `roomKeys/${CODE}`)));
await check('rival host cannot read the answer key', 'deny', () => get(ref(rivalHost.rtdb, `roomKeys/${CODE}`)));
await check('anonymous player cannot write an answer key', 'deny', () =>
  set(ref(player.rtdb, `roomKeys/${CODE2}`), { hostId: playerUid, key: { q1: 0 } }));
await check('answer key rejects junk shape', 'deny', () =>
  set(ref(host.rtdb, `roomKeys/${CODE}`), { hostId: hostUser.user.uid, key: { q1: 0 }, leak: true }));
await check('rival Google host cannot pre-squat a key for a room they do not host', 'deny', () =>
  set(ref(rivalHost.rtdb, `roomKeys/${randomCode()}`), { hostId: 'rival-uid', key: { q1: 0 } }));
await check('rival Google host cannot claim the key of an existing foreign room', 'deny', () =>
  set(ref(rivalHost.rtdb, `roomKeys/${CODE2}`), { hostId: 'rival-uid', key: { q1: 0 } }));

// --- Sealed reads -----------------------------------------------------------
await check('host reads own room', 'allow', () => get(ref(host.rtdb, `rooms/${CODE}`)));
await check('non-member cannot read the room', 'deny', () => get(ref(outsider.rtdb, `rooms/${CODE}`)));
await check('rival host cannot read the room', 'deny', () => get(ref(rivalHost.rtdb, `rooms/${CODE}`)));
await check('outsider cannot enumerate /rooms', 'deny', () => get(ref(outsider.rtdb, 'rooms')));

// --- Joining ----------------------------------------------------------------
await check('player joins with own uid', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}`), { name: 'Ana', team: 'A', connected: true }));
await check('member reads the room after joining', 'allow', () =>
  get(ref(player.rtdb, `rooms/${CODE}`)));
await check('member cannot enumerate /rooms either', 'deny', () =>
  get(ref(player.rtdb, 'rooms')));
await check('member cannot read the answer key', 'deny', () =>
  get(ref(player.rtdb, `roomKeys/${CODE}`)));
await check('player cannot join a nonexistent room', 'deny', () =>
  set(ref(player.rtdb, `rooms/NOPE/players/${playerUid}`), { name: 'Ana', team: 'A', connected: true }));
await check("player cannot write another player's membership", 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${outsiderUser.user.uid}`), { name: 'Fake', team: 'B', connected: true }));
await check('player cannot join with an invalid team', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}`), { name: 'Ana', team: 'C', connected: true }));
await check('player cannot smuggle extra fields into membership', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}`), { name: 'Ana', team: 'A', connected: true, isHost: true }));
await check('player updates own presence flag', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}/connected`), true));

// --- Host-only control ------------------------------------------------------
await check('player cannot change scores', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/scores/A`), 99));
await check('player cannot change status', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/status`), 'playing'));
await check('player cannot change currentTurn', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/currentTurn`), 'B'));
await check('lobby: player may still switch teams', 'allow', async () => {
  await set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}`), { name: 'Ana', team: 'B', connected: true });
  await set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}`), { name: 'Ana', team: 'A', connected: true });
});
await check('host starts the game and opens a tile', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE}`), { status: 'playing', currentTurn: 'A', activeTileId: 'q1', revealed: false }));
await check('playing: player CANNOT switch teams (freeze after lobby)', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}`), { name: 'Ana', team: 'B', connected: true }));
await check('playing: fresh player cannot join mid-game', 'deny', () =>
  set(ref(outsider.rtdb, `rooms/${CODE}/players/${outsiderUser.user.uid}`), { name: 'Late', team: 'A', connected: true }));
await check('playing: presence updates still allowed', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE}/players/${playerUid}/connected`), true));

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

// --- Taps (firstTap room; playing, turn A, active tile q1) -------------------
await check('player cannot tap with a client-supplied timestamp', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q1/${playerUid}`), { answerIndex: 0, at: Date.now() - 60000 }));
await check('player cannot tap an out-of-range answer', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q1/${playerUid}`), { answerIndex: 12, at: serverTimestamp() }));
await check('player cannot tap the wrong tile', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q2/${playerUid}`), { answerIndex: 0, at: serverTimestamp() }));
await check("player cannot write a teammate's tap", 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q1/${outsiderUser.user.uid}`), { answerIndex: 0, at: serverTimestamp() }));
await check('outsider (not in room) cannot tap', 'deny', () =>
  set(ref(outsider.rtdb, `rooms/${CODE}/taps/q1/${outsiderUser.user.uid}`), { answerIndex: 0, at: serverTimestamp() }));
await check('on-turn player taps with a server timestamp', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q1/${playerUid}`), { answerIndex: 1, at: serverTimestamp() }));
await check('firstTap mode locks the tap — no overwrite', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q1/${playerUid}`), { answerIndex: 0, at: serverTimestamp() }));
await check('host cannot write taps (players only)', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/taps/q1/${hostUser.user.uid}`), { answerIndex: 0, at: serverTimestamp() }));

// --- Reveal + off-turn/after-reveal taps -------------------------------------
await check('player cannot write a reveal', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/reveals/q1`), { correctIndex: 0, wasCorrect: true, team: 'A' }));
await check('host reveals the tile outcome', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE}`), {
    revealed: true,
    'reveals/q1': { correctIndex: 0, teamChoice: 1, wasCorrect: false, team: 'A' },
  }));
await check('host passes the turn', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE}`), { 'usedTiles/q1': true, activeTileId: 'q2', revealed: false, currentTurn: 'B' }));
await check('off-turn player (team A, turn B) cannot tap', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/taps/q2/${playerUid}`), { answerIndex: 0, at: serverTimestamp() }));

// --- Winner ------------------------------------------------------------------
await check('player cannot write the winner', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE}/winner`), 'A'));
await check('host cannot write an invalid winner', 'deny', () =>
  set(ref(host.rtdb, `rooms/${CODE}/winner`), 'C'));
await check('host ends the game with a winner', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE}`), { status: 'ended', winner: 'tie' }));

// --- Majority mode allows re-taps ---------------------------------------------
const room2 = makeRoom(hostUser.user.uid, 'majority');
await check('host creates a majority-mode room', 'allow', () =>
  set(ref(host.rtdb, `rooms/${CODE2}`), room2));
await check('player joins the majority room', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE2}/players/${playerUid}`), { name: 'Ana', team: 'A', connected: true }));
await check('host opens a tile in the majority room', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE2}`), { status: 'playing', currentTurn: 'A', activeTileId: 'q1', revealed: false }));
await check('majority room: player taps', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE2}/taps/q1/${playerUid}`), { answerIndex: 0, at: serverTimestamp() }));
await check('majority room: player CAN change their tap', 'allow', () =>
  set(ref(player.rtdb, `rooms/${CODE2}/taps/q1/${playerUid}`), { answerIndex: 1, at: serverTimestamp() }));
// Isolates the taps rule's `revealed !== true` clause: in majority mode, on
// the player's own uid, own turn and the active tile, ONLY the reveal flag
// can deny this write.
await check('majority room: host reveals', 'allow', () =>
  update(ref(host.rtdb, `rooms/${CODE2}`), {
    revealed: true,
    'reveals/q1': { correctIndex: 0, teamChoice: 1, wasCorrect: false, team: 'A' },
  }));
await check('player cannot tap after reveal (isolated reveal clause)', 'deny', () =>
  set(ref(player.rtdb, `rooms/${CODE2}/taps/q1/${playerUid}`), { answerIndex: 0, at: serverTimestamp() }));

// --- Data-shape assertions -----------------------------------------------------
// The board must never contain answer information, and the room root must
// never carry an answerKey. (correctIndex under reveals/ is the intentional
// post-reveal disclosure, so the walk scopes to board + root key check.)
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
const finalRoom = (await get(ref(player.rtdb, `rooms/${CODE}`))).val();
const boardLeak = findForbidden(finalRoom?.board);
results.push({
  name: 'player-readable BOARD contains no answer keys (post-game walk)',
  pass: boardLeak === null,
  got: boardLeak ? `LEAKED at board${boardLeak}` : 'clean',
});
results.push({
  name: 'room root carries no answerKey node',
  pass: finalRoom?.answerKey === undefined,
  got: finalRoom?.answerKey === undefined ? 'clean' : 'LEAKED',
});

// --- Report -----------------------------------------------------------------
let failed = 0;
for (const { name, pass, got } of results) {
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (got: ${got})`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
