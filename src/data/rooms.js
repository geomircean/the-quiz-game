import {
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { rtdb } from '@/lib/firebase';

// No 0/O/1/I — codes are read aloud and typed on phones.
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;
const CODE_ATTEMPTS = 6;

const randomCode = () =>
  Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

// Uppercase and strip anything that isn't A-Z/0-9 — user-typed codes must
// never reach ref() with RTDB-illegal path characters (. # $ [ ]).
export const normalizeRoomCode = (raw) => (raw ?? '').trim().toUpperCase().replace(/[^0-9A-Z]/g, '');

const isPermissionDenied = (error) =>
  error?.code === 'PERMISSION_DENIED' || /permission[_ ]?denied/i.test(String(error?.message ?? ''));

// Copy the quiz's questions into a player-safe board: isCorrect is STRIPPED
// here and the RTDB rules structurally reject any board write containing it.
// The correct answers stay on the host screen only (returned separately).
const buildBoard = ({ quiz, questions }) => {
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const board = {};
  const answerKey = {};
  for (const questionId of quiz.questionIds) {
    const question = byId.get(questionId);
    // HARD-FAIL on any missing/foreign pointer — a poisoned quiz must never
    // launch a partial board (see firestore.rules P3 requirement).
    if (!question) {
      throw new Error('This quiz references a question that no longer exists — edit the quiz first.');
    }
    const correctIndex = question.possibleAnswers.findIndex(({ isCorrect }) => isCorrect);
    if (correctIndex === -1) {
      throw new Error(`"${question.tileName}" has no correct answer marked — edit that question first.`);
    }
    board[questionId] = {
      tileName: question.tileName,
      questionText: question.questionText,
      possibleAnswers: question.possibleAnswers.map(({ answerMessage }) => ({ answerMessage })),
    };
    answerKey[questionId] = correctIndex;
  }
  return { board, answerKey };
};

// Claim-by-write: the RTDB rules only allow creating a room node that does
// not exist yet (for anyone — including the same host), so ANY code
// collision is a permission error, caught and retried with a fresh code.
// Non-permission errors are rethrown immediately (they are not collisions).
export const createRoom = async ({ hostId, quiz, questions }) => {
  const { board, answerKey } = buildBoard({ quiz, questions });
  const room = {
    hostId,
    quizId: quiz.id,
    quizName: quiz.name,
    status: 'lobby',
    answerMode: quiz.answerMode,
    currentTurn: 'A',
    revealed: false,
    scores: { A: 0, B: 0 },
    teams: quiz.teams ?? { A: { name: 'Team 1' }, B: { name: 'Team 2' } },
    board,
    createdAt: serverTimestamp(),
  };

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = randomCode();
    try {
      await set(ref(rtdb, `rooms/${code}`), room);
      // The answer key lives OUTSIDE rooms/ (member reads cascade over the
      // whole room subtree) in a host-only node. A stale foreign key at
      // this code is a permission error → retry with a fresh code (the
      // just-claimed room node is orphaned but inert).
      await set(ref(rtdb, `roomKeys/${code}`), { hostId, key: answerKey });
      return { code, answerKey };
    } catch (error) {
      if (!isPermissionDenied(error)) throw error;
      // Either a code collision (retryable) or a rules-validation rejection
      // (deterministic — will exhaust the retries and land on the message
      // below). RTDB reports both as PERMISSION_DENIED.
    }
  }
  throw new Error('Could not create the room — try again, and if it keeps failing re-save the quiz first.');
};

export const subscribeToAnswerKey = (code, onChange, onError) =>
  onValue(ref(rtdb, `roomKeys/${code}`), (snapshot) => onChange(snapshot.val()), onError);

export const joinRoom = ({ code, uid, name, team }) =>
  set(ref(rtdb, `rooms/${code}/players/${uid}`), { name, team, connected: true });

export const subscribeToRoom = (code, onChange, onError) =>
  onValue(ref(rtdb, `rooms/${code}`), (snapshot) => onChange(snapshot.val()), onError);

// Presence: mark me connected now and flip to false when the connection
// drops. Re-armed on every reconnect via the .info/connected signal.
// The returned cleanup cancels the pending onDisconnect and marks the
// player away (leaving the page IS a disconnect from the room's view).
export const watchPresence = (code, uid) => {
  const connectedRef = ref(rtdb, '.info/connected');
  const myConnectedRef = ref(rtdb, `rooms/${code}/players/${uid}/connected`);
  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      onDisconnect(myConnectedRef).set(false).catch(() => {});
      set(myConnectedRef, true).catch(() => {});
    }
  });
  return () => {
    unsubscribe();
    onDisconnect(myConnectedRef).cancel().catch(() => {});
    set(myConnectedRef, false).catch(() => {});
  };
};

// Host-only control writes (P4 grows these into the full game loop).
export const updateRoom = (code, changes) => update(ref(rtdb, `rooms/${code}`), changes);
