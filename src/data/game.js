import { ref, serverTimestamp, set } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { updateRoom } from '@/data/rooms';

// Host-authoritative game transitions. Every write here is gated by the
// RTDB rules to the host uid; players can only ever write their own tap.

export const startGame = (code) => updateRoom(code, { status: 'playing', currentTurn: 'A' });

export const pickTile = (code, tileId) => updateRoom(code, { activeTileId: tileId, revealed: false });

// Player action — the rules enforce: own uid, game playing, active tile,
// before reveal, player's team on turn, and (in firstTap mode) no re-tap.
// `at` MUST be the server timestamp (rules require at === now).
export const submitTap = ({ code, tileId, uid, answerIndex }) =>
  set(ref(rtdb, `rooms/${code}/taps/${tileId}/${uid}`), { answerIndex, at: serverTimestamp() });

// Resolve the picking team's answer from the taps, per the quiz's mode.
// Returns an answerIndex, or null for "no valid answer" (scored wrong):
// - firstTap: earliest server timestamp wins; exact ties break on lowest uid.
// - majority: most-tapped answer; a tie across top choices counts as wrong.
export const resolveTeamChoice = ({ room, tileId }) => {
  const team = room.currentTurn;
  const taps = Object.entries(room.taps?.[tileId] ?? {})
    .filter(([uid]) => room.players?.[uid]?.team === team)
    .map(([uid, tap]) => ({ uid, ...tap }));

  if (taps.length === 0) return null;

  if (room.answerMode === 'firstTap') {
    taps.sort((a, b) => (a.at - b.at) || (a.uid < b.uid ? -1 : 1));
    return taps[0].answerIndex;
  }

  const counts = {};
  for (const tap of taps) {
    counts[tap.answerIndex] = (counts[tap.answerIndex] ?? 0) + 1;
  }
  const max = Math.max(...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  return top.length === 1 ? Number(top[0]) : null;
};

// Host compares the resolved choice against the host-held correct index and
// writes only the OUTCOME back to the room (1 point or 0, no stealing).
export const revealTile = ({ code, room, tileId, correctIndex }) => {
  const team = room.currentTurn;
  const teamChoice = resolveTeamChoice({ room, tileId });
  const wasCorrect = teamChoice !== null && teamChoice === correctIndex;
  const changes = {
    revealed: true,
    [`reveals/${tileId}`]: {
      correctIndex,
      wasCorrect,
      team,
      ...(teamChoice === null ? {} : { teamChoice }),
    },
  };
  if (wasCorrect) {
    changes[`scores/${team}`] = (room.scores?.[team] ?? 0) + 1;
  }
  return updateRoom(code, changes);
};

// Tile used up, turn passes; when every tile is used the game ends and the
// higher score wins (equal scores are a tie — no tiebreaker, by design).
export const nextTurn = ({ code, room, tileId }) => {
  const used = { ...(room.usedTiles ?? {}), [tileId]: true };
  const allUsed = Object.keys(room.board ?? {}).every((id) => used[id]);
  const changes = {
    [`usedTiles/${tileId}`]: true,
    activeTileId: null,
    revealed: false,
    currentTurn: room.currentTurn === 'A' ? 'B' : 'A',
  };
  if (allUsed) {
    changes.status = 'ended';
    const a = room.scores?.A ?? 0;
    const b = room.scores?.B ?? 0;
    changes.winner = a === b ? 'tie' : a > b ? 'A' : 'B';
  }
  return updateRoom(code, changes);
};
