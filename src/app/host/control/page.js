'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { ArrowsRightLeftIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon } from '@heroicons/react/20/solid';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { useAnswerKey } from '@/hooks/useAnswerKey';
import { kickPlayer, movePlayer, normalizeRoomCode } from '@/data/rooms';
import { adjustScore, endGameEarly, nextTurn, pickTile, revealTile, skipTile, startGame } from '@/data/game';
import { getAlpha } from '@/utils';

// The QM's private command center. Everything here is host-only: the big
// screen (/host/room) shows the shared view, this window drives the game.
// The answer preview renders HERE and never on the display.
const ControlInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = normalizeRoomCode(searchParams.get('room'));
  const { user, isLoading: authLoading } = useAuth();
  const { room, error, isLoading } = useRoom(code);
  const answerKey = useAnswerKey(code);
  const [actionError, setActionError] = useState(null);
  const [copyState, setCopyState] = useState('idle');

  const joinUrl = typeof window === 'undefined' || !code
    ? null
    : `${window.location.origin}/play/?room=${code}`;

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

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

  const act = (fn) => async () => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const players = Object.entries(room.players ?? {}).map(([uid, p]) => ({ uid, ...p }));
  const teamName = (team) => room.teams?.[team]?.name ?? (team === 'A' ? 'Team 1' : 'Team 2');
  const tiles = Object.entries(room.board ?? {});
  const activeTileId = room.activeTileId;
  const tile = activeTileId ? room.board?.[activeTileId] : null;
  const correctIndex = activeTileId ? answerKey?.[activeTileId] : null;
  const reveal = activeTileId ? room.reveals?.[activeTileId] : null;

  const onKick = (p) => {
    if (window.confirm(`Kick ${p.name}? They can only rejoin before a game starts.`)) {
      act(() => kickPlayer({ code, uid: p.uid }))();
    }
  };
  const onEndEarly = () => {
    if (window.confirm('End the game now? Current scores decide the winner.')) {
      act(() => endGameEarly({ code, room }))();
    }
  };

  // --- flow column content, by game state -----------------------------------
  let flow;
  if (room.status === 'lobby') {
    const teamACount = players.filter((p) => p.team === 'A').length;
    const teamBCount = players.filter((p) => p.team === 'B').length;
    const canStart = teamACount > 0 && teamBCount > 0;
    flow = (
      <Card className="bg-purple-800/40 text-purple-100">
        <CardHeader><CardTitle>Lobby</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p>Share the big screen so players can scan in. {players.length} joined so far.</p>
          <Button size="lg" disabled={!canStart} onClick={act(() => startGame(code))}>Start game</Button>
          {!canStart && (
            <span className="text-xs italic opacity-70">
              waiting for at least one player on each team — teams can&apos;t change once the game starts
            </span>
          )}
        </CardContent>
      </Card>
    );
  } else if (room.status === 'ended') {
    flow = (
      <Card className="bg-purple-800/40 text-purple-100 text-center">
        <CardContent className="p-6 flex flex-col gap-2">
          <p className="text-3xl font-bold">
            {room.winner === 'tie' ? "It's a tie!" : `${teamName(room.winner)} wins!`}
          </p>
          <p>{teamName('A')}: {room.scores?.A ?? 0} · {teamName('B')}: {room.scores?.B ?? 0}</p>
        </CardContent>
      </Card>
    );
  } else if (tile) {
    const turnTeam = room.currentTurn;
    const teamPlayers = players.filter((p) => p.team === turnTeam);
    const tapEntries = Object.entries(room.taps?.[activeTileId] ?? {})
      .filter(([uid]) => room.players?.[uid]?.team === turnTeam);
    const tapsByAnswer = {};
    for (const [, tap] of tapEntries) {
      tapsByAnswer[tap.answerIndex] = (tapsByAnswer[tap.answerIndex] ?? 0) + 1;
    }
    const tapperNames = tapEntries.map(([uid]) => room.players?.[uid]?.name).filter(Boolean);

    flow = (
      <Card className="bg-purple-800/40 text-purple-100">
        <CardHeader>
          <em>{tile.tileName} — {teamName(turnTeam)}&apos;s turn</em>
          <CardTitle className="text-2xl">{tile.questionText}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(tile.possibleAnswers ?? []).map(({ answerMessage }, index) => {
            const isKeyAnswer = index === correctIndex;
            const revealedCorrect = room.revealed && reveal && index === reveal.correctIndex;
            const revealedWrongPick = room.revealed && reveal && !reveal.wasCorrect && index === reveal.teamChoice;
            return (
              <div
                key={index}
                className={`flex items-center gap-2 rounded-md border p-3 ${
                  revealedCorrect ? 'bg-green-700 border-green-400'
                  : revealedWrongPick ? 'bg-red-800 border-red-400'
                  : isKeyAnswer ? 'border-green-400/80'
                  : 'border-purple-500'
                }`}
              >
                <span className="font-bold">{getAlpha(index)}.</span>
                <span className="grow">{answerMessage}</span>
                {isKeyAnswer && !room.revealed && (
                  <span className="flex items-center gap-1 text-xs text-green-300">
                    <CheckCircleIcon className="size-4"/> correct — only you see this
                  </span>
                )}
                {(tapsByAnswer[index] ?? 0) > 0 && (
                  <span className="rounded bg-purple-600/60 px-2 py-0.5 text-xs">
                    {tapsByAnswer[index]} tap{tapsByAnswer[index] > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
          <p className="text-sm italic">
            {tapEntries.length} of {teamPlayers.length} on {teamName(turnTeam)} tapped
            {tapperNames.length > 0 ? `: ${tapperNames.join(', ')}` : ''}
          </p>
          {!room.revealed && (
            <div className="flex gap-2">
              <Button
                size="lg"
                disabled={correctIndex === undefined || correctIndex === null}
                onClick={act(() => revealTile({ code, room, tileId: activeTileId, correctIndex }))}
              >
                Reveal answer
              </Button>
              <Button variant="outline" onClick={act(() => skipTile({ code, room, tileId: activeTileId }))}>
                Skip question
              </Button>
            </div>
          )}
          {room.revealed && reveal && (
            <div className="flex items-center gap-3">
              <span>
                {reveal.wasCorrect
                  ? `Correct! +1 for ${teamName(reveal.team)}.`
                  : reveal.teamChoice === undefined || reveal.teamChoice === null
                    ? 'No valid team answer — no points.'
                    : 'Wrong — no points.'}
              </span>
              <Button size="lg" onClick={act(() => nextTurn({ code, room, tileId: activeTileId }))}>
                Next turn
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  } else {
    flow = (
      <Card className="bg-purple-800/40 text-purple-100">
        <CardHeader>
          <CardTitle>{teamName(room.currentTurn)} picks a tile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map(([tileId, t]) => {
              const used = !!room.usedTiles?.[tileId];
              return (
                <button
                  key={tileId}
                  disabled={used}
                  onClick={act(() => pickTile(code, tileId))}
                  className={`h-20 rounded-lg p-2 text-sm font-semibold transition-all ${
                    used
                      ? 'bg-gray-800/40 text-gray-500 line-through cursor-not-allowed'
                      : 'bg-purple-700/50 text-purple-100 hover:bg-purple-600/60 cursor-pointer'
                  }`}
                >
                  {t.tileName}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Command center · room {code}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyJoinLink}>
            {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy join link'}
          </Button>
          <Button asChild variant="outline">
            <a href={`/host/room/?room=${code}`} target="_blank" rel="noreferrer">
              <ArrowTopRightOnSquareIcon className="size-4 mr-1"/> Open big screen
            </a>
          </Button>
        </div>
      </div>
      {actionError && <div className="error-message text-center">{actionError}</div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] items-start">
        <div>{flow}</div>
        <div className="flex flex-col gap-4">
          <Card className="bg-purple-800/40 text-purple-100">
            <CardHeader><CardTitle className="text-lg">Scores</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {['A', 'B'].map((team) => (
                <div key={team} className="flex items-center justify-between gap-2">
                  <span className={room.currentTurn === team && room.status === 'playing' ? 'font-bold' : ''}>
                    {teamName(team)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" aria-label={`Subtract a point from ${teamName(team)}`}
                            onClick={act(() => adjustScore({ code, room, team, delta: -1 }))}>−</Button>
                    <span className="w-6 text-center text-lg">{room.scores?.[team] ?? 0}</span>
                    <Button size="sm" variant="outline" aria-label={`Add a point to ${teamName(team)}`}
                            onClick={act(() => adjustScore({ code, room, team, delta: 1 }))}>+</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-purple-800/40 text-purple-100">
            <CardHeader><CardTitle className="text-lg">Players</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {['A', 'B'].map((team) => (
                <div key={team}>
                  <h4 className="text-sm font-semibold pb-1">{teamName(team)}</h4>
                  {players.filter((p) => p.team === team).length === 0 && (
                    <p className="text-xs italic opacity-70">Nobody yet</p>
                  )}
                  <ul className="flex flex-col gap-1">
                    {players.filter((p) => p.team === team).map((p) => (
                      <li key={p.uid} className="flex items-center gap-2 text-sm">
                        <span className={`inline-block size-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-gray-500'}`}/>
                        <span className={`grow ${p.connected ? '' : 'opacity-50'}`}>{p.name}</span>
                        <Button size="sm" variant="ghost" aria-label={`Move ${p.name} to the other team`}
                                onClick={act(() => movePlayer({ code, uid: p.uid, team: p.team === 'A' ? 'B' : 'A' }))}>
                          <ArrowsRightLeftIcon className="size-4"/>
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Kick ${p.name}`} onClick={() => onKick(p)}>
                          <X className="size-4 text-red-400"/>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {room.status === 'playing' && (
            <Button variant="outline" onClick={onEndEarly}>End game early</Button>
          )}
        </div>
      </div>
    </div>
  );
};

const HostControl = () => (
  <main className="min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<Loading/>}>
      <ControlInner/>
      </Suspense>
    </div>
  </main>
);

export default HostControl;
