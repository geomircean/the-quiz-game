'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { normalizeRoomCode } from '@/data/rooms';
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
  <div className="flex justify-center gap-8 text-2xl">
    <span className={room.currentTurn === 'A' && room.status === 'playing' ? 'font-bold underline' : ''}>
      {room.teams?.A?.name ?? 'Team 1'}: {room.scores?.A ?? 0}
    </span>
    <span className={room.currentTurn === 'B' && room.status === 'playing' ? 'font-bold underline' : ''}>
      {room.teams?.B?.name ?? 'Team 2'}: {room.scores?.B ?? 0}
    </span>
  </div>
);

// QR + copyable link for joining the room — shown on the shared screen so
// phones can scan instead of typing the code.
const JoinInvite = ({ joinUrl }) => {
  if (!joinUrl) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={joinUrl} size={180} marginSize={1} title={`Join the room at ${joinUrl}`}/>
      </div>
      <p className="text-sm break-all">{joinUrl}</p>
    </div>
  );
};

// The SHARED BIG SCREEN — a pure display with zero controls. The QM drives
// the game from /host/control in another window; this view is safe to
// screen-share by construction (it never receives the answer key).
const HostRoomInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = normalizeRoomCode(searchParams.get('room'));
  const { user, isLoading: authLoading } = useAuth();
  const { room, error, isLoading } = useRoom(code);

  // Derived from window at runtime — the static build has no origin.
  const joinUrl = typeof window === 'undefined' || !code
    ? null
    : `${window.location.origin}/play/?room=${code}`;

  // Rooms are member-readable — a joined player opening the host URL gets
  // sent to their own view instead.
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

  // --- Lobby ---------------------------------------------------------------
  if (room.status === 'lobby') {
    return (
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        <Card className="bg-purple-800/40 text-purple-100 text-center">
          <CardHeader>
            <CardTitle className="text-3xl">{room.quizName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p>Scan to join, or type the code at this site:</p>
              {/* pl compensates the trailing letter-space so the glyphs are truly centered */}
              <div className="text-6xl font-bold tracking-[0.3em] pl-[0.3em]">{code}</div>
            </div>
            <JoinInvite joinUrl={joinUrl}/>
            <p className="text-sm italic">{tiles.length} tiles · waiting in the lobby</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-800/40 text-purple-100">
          <CardContent className="flex gap-8 p-6">
            <TeamRoster label={room.teams?.A?.name ?? 'Team 1'} players={teamA}/>
            <TeamRoster label={room.teams?.B?.name ?? 'Team 2'} players={teamB}/>
          </CardContent>
        </Card>
        <p className="text-center text-sm italic opacity-70">
          The host starts the game from the command center.
        </p>
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
        <h1 className="text-6xl font-bold">{winnerLabel}</h1>
        <ScoreBar room={room}/>
      </div>
    );
  }

  // --- Playing: active question -------------------------------------------
  const activeTileId = room.activeTileId;
  const roomCodeCorner = (
    <p className="text-center text-sm opacity-70">room code: {code} · join at {joinUrl?.replace(/^https?:\/\//, '').replace(/\/play.*$/, '')}</p>
  );

  if (activeTileId && room.board?.[activeTileId]) {
    const tile = room.board[activeTileId];
    const reveal = room.reveals?.[activeTileId];
    const teamTaps = Object.entries(room.taps?.[activeTileId] ?? {})
      .filter(([uid]) => room.players?.[uid]?.team === room.currentTurn);
    const turnTeamName = room.teams?.[room.currentTurn]?.name ?? room.currentTurn;

    return (
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <ScoreBar room={room}/>
        <Card className="bg-purple-800/40 text-purple-100">
          <CardHeader>
            <em className="text-xl">{tile.tileName}</em>
            <CardTitle className="text-4xl">{tile.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(tile.possibleAnswers ?? []).map(({ answerMessage }, index) => {
              const revealedCorrect = room.revealed && reveal && index === reveal.correctIndex;
              const revealedWrongPick = room.revealed && reveal && !reveal.wasCorrect && index === reveal.teamChoice;
              return (
                <div
                  key={index}
                  className={`rounded-md border p-4 text-2xl ${
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
            {!room.revealed && (
              <p className="text-center text-lg italic">
                {turnTeamName} is answering — {teamTaps.length} tap{teamTaps.length === 1 ? '' : 's'} so far
              </p>
            )}
            {room.revealed && reveal && (
              <p className="text-center text-2xl">
                {reveal.wasCorrect
                  ? `Correct! +1 for ${room.teams?.[reveal.team]?.name ?? reveal.team}.`
                  : reveal.teamChoice === undefined || reveal.teamChoice === null
                    ? 'No valid team answer — no points.'
                    : 'Wrong — no points.'}
              </p>
            )}
          </CardContent>
        </Card>
        {roomCodeCorner}
      </div>
    );
  }

  // --- Playing: the board ----------------------------------------------------
  const turnTeamName = room.teams?.[room.currentTurn]?.name ?? room.currentTurn;
  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      <ScoreBar room={room}/>
      <p className="text-center text-2xl">
        <strong>{turnTeamName}</strong> picks a tile — say it out loud!
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map(([tileId, tile]) => {
          const used = !!room.usedTiles?.[tileId];
          return (
            <div
              key={tileId}
              className={`flex h-28 items-center justify-center rounded-xl p-4 text-xl font-semibold text-center ${
                used
                  ? 'bg-gray-800/40 text-gray-500 line-through'
                  : 'bg-purple-800/40 text-purple-100'
              }`}
            >
              {tile.tileName}
            </div>
          );
        })}
      </div>
      {roomCodeCorner}
    </div>
  );
};

const HostRoom = () => (
  <main className="min-h-screen">
    <div className="container mx-auto px-4 py-16">
      <Suspense fallback={<Loading/>}>
        <HostRoomInner/>
      </Suspense>
    </div>
  </main>
);

export default HostRoom;
