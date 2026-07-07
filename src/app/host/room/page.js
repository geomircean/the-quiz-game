'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { useAnswerKey } from '@/hooks/useAnswerKey';
import { normalizeRoomCode } from '@/data/rooms';
import { nextTurn, pickTile, revealTile, startGame } from '@/data/game';
import { getAlpha } from '@/utils';

const TeamRoster = ({ label, players }) => (
  <div className="flex-1">
    <h3 className="font-semibold pb-2">{label} ({players.length})</h3>
    {players.length === 0 && <p className="text-sm italic opacity-70">Nobody yet</p>}
    <ul className="flex flex-col gap-1">
      {players.map((p, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <span className={`inline-block size-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-gray-500'}`}/>
          <span className={p.connected ? '' : 'opacity-50'}>{p.name}</span>
        </li>
      ))}
    </ul>
  </div>
);

const ScoreBar = ({ room }) => (
  <div className="flex justify-center gap-8 text-xl">
    <span className={room.currentTurn === 'A' && room.status === 'playing' ? 'font-bold underline' : ''}>
      {room.teams?.A?.name ?? 'Team 1'}: {room.scores?.A ?? 0}
    </span>
    <span className={room.currentTurn === 'B' && room.status === 'playing' ? 'font-bold underline' : ''}>
      {room.teams?.B?.name ?? 'Team 2'}: {room.scores?.B ?? 0}
    </span>
  </div>
);

// The QM's live room view: lobby → board of tiles → question + reveal →
// pass the turn → ended. All control writes are host-gated by the rules.
const HostRoomInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = normalizeRoomCode(searchParams.get('room'));
  const { user, isLoading: authLoading } = useAuth();
  const { room, error, isLoading } = useRoom(code);
  const answerKey = useAnswerKey(code);
  const [actionError, setActionError] = useState(null);

  // Rooms are member-readable — a joined player opening the host URL gets
  // sent to their own view instead of the host controls.
  const isMemberNotHost = !!(room && user && room.hostId !== user.uid);
  useEffect(() => {
    if (isMemberNotHost) router.replace(`/play/?room=${code}`);
  }, [isMemberNotHost, code, router]);

  if (authLoading || isLoading || isMemberNotHost) {
    return <Loading/>;
  }

  if (!room) {
    return (
      <div className="error-message text-center">
        {error ? `Could not open room: ${error.message}` : `Room ${code || '?'} was not found.`}
      </div>
    );
  }

  const players = Object.values(room.players ?? {});
  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');
  const tiles = Object.entries(room.board ?? {});
  const act = (fn) => async () => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // --- Lobby ---------------------------------------------------------------
  if (room.status === 'lobby') {
    return (
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        <Card className="bg-purple-800/40 text-purple-100 text-center">
          <CardHeader>
            <CardTitle>{room.quizName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p>Players join at this site with the code:</p>
            <div className="text-6xl font-bold tracking-[0.3em]">{code}</div>
            <p className="text-sm italic">{tiles.length} tiles · waiting in the lobby</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-800/40 text-purple-100">
          <CardContent className="flex gap-8 p-6">
            <TeamRoster label={room.teams?.A?.name ?? 'Team 1'} players={teamA}/>
            <TeamRoster label={room.teams?.B?.name ?? 'Team 2'} players={teamB}/>
          </CardContent>
        </Card>
        {actionError && <div className="error-message text-center">{actionError}</div>}
        <div className="flex flex-col items-center">
          <Button
            size="lg"
            disabled={teamA.length === 0 || teamB.length === 0}
            onClick={act(() => startGame(code))}
          >
            Start game
          </Button>
          {(teamA.length === 0 || teamB.length === 0) && (
            <span className="text-xs italic opacity-70">
              waiting for at least one player on each team — teams can&apos;t change once the game starts
            </span>
          )}
        </div>
      </div>
    );
  }

  // --- Ended ---------------------------------------------------------------
  if (room.status === 'ended') {
    const winnerLabel = room.winner === 'tie'
      ? "It's a tie!"
      : `${room.teams?.[room.winner]?.name ?? room.winner} wins!`;
    return (
      <div className="mx-auto max-w-3xl flex flex-col gap-6 text-center">
        <h1 className="text-5xl font-bold">{winnerLabel}</h1>
        <ScoreBar room={room}/>
      </div>
    );
  }

  // --- Playing: active question -------------------------------------------
  const activeTileId = room.activeTileId;
  if (activeTileId && room.board?.[activeTileId]) {
    const tile = room.board[activeTileId];
    const reveal = room.reveals?.[activeTileId];
    const teamTaps = Object.entries(room.taps?.[activeTileId] ?? {})
      .filter(([uid]) => room.players?.[uid]?.team === room.currentTurn);
    const correctIndex = answerKey?.[activeTileId];
    const turnTeamName = room.teams?.[room.currentTurn]?.name ?? room.currentTurn;

    return (
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <ScoreBar room={room}/>
        <Card className="bg-purple-800/40 text-purple-100">
          <CardHeader>
            <em>{tile.tileName}</em>
            <CardTitle className="text-3xl">{tile.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(tile.possibleAnswers ?? []).map(({ answerMessage }, index) => {
              const revealedCorrect = room.revealed && reveal && index === reveal.correctIndex;
              const revealedWrongPick = room.revealed && reveal && !reveal.wasCorrect && index === reveal.teamChoice;
              return (
                <div
                  key={index}
                  className={`rounded-md border p-4 text-lg ${
                    revealedCorrect ? 'bg-green-700 border-green-400'
                    : revealedWrongPick ? 'bg-red-800 border-red-400'
                    : 'border-purple-500'
                  }`}
                >
                  <span className="mr-4 font-bold">{getAlpha(index)}.</span>
                  {answerMessage}
                </div>
              );
            })}
          </CardContent>
        </Card>
        {actionError && <div className="error-message text-center">{actionError}</div>}
        {!room.revealed && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm italic">
              {turnTeamName} is answering — {teamTaps.length} tap{teamTaps.length === 1 ? '' : 's'} so far
            </p>
            <Button
              size="lg"
              disabled={correctIndex === undefined || correctIndex === null}
              onClick={act(() => revealTile({ code, room, tileId: activeTileId, correctIndex }))}
            >
              Reveal answer
            </Button>
            {(correctIndex === undefined || correctIndex === null) && (
              <span className="text-xs italic opacity-70">
                this room has no answer key (created by an older version) — launch the quiz again
              </span>
            )}
          </div>
        )}
        {room.revealed && reveal && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl">
              {reveal.wasCorrect
                ? `Correct! +1 for ${room.teams?.[reveal.team]?.name ?? reveal.team}.`
                : reveal.teamChoice === undefined || reveal.teamChoice === null
                  ? 'No valid team answer — no points.'
                  : 'Wrong — no points.'}
            </p>
            <Button size="lg" onClick={act(() => nextTurn({ code, room, tileId: activeTileId }))}>
              Next turn
            </Button>
          </div>
        )}
      </div>
    );
  }

  // --- Playing: the board ----------------------------------------------------
  const turnTeamName = room.teams?.[room.currentTurn]?.name ?? room.currentTurn;
  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      <ScoreBar room={room}/>
      <p className="text-center text-xl">
        <strong>{turnTeamName}</strong> picks a tile — say it out loud, the host clicks it.
      </p>
      {actionError && <div className="error-message text-center">{actionError}</div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map(([tileId, tile]) => {
          const used = !!room.usedTiles?.[tileId];
          return (
            <button
              key={tileId}
              disabled={used}
              onClick={act(() => pickTile(code, tileId))}
              className={`h-28 rounded-xl p-4 text-lg font-semibold transition-all ${
                used
                  ? 'bg-gray-800/40 text-gray-500 line-through cursor-not-allowed'
                  : 'bg-purple-800/40 text-purple-100 hover:bg-purple-700/60 cursor-pointer'
              }`}
            >
              {tile.tileName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const HostRoom = () => (
  <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
    <div className="container mx-auto px-4 py-16">
      <Suspense fallback={<Loading/>}>
        <HostRoomInner/>
      </Suspense>
    </div>
  </main>
);

export default HostRoom;
