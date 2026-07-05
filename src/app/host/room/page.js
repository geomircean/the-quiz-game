'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { normalizeRoomCode } from '@/data/rooms';

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

// The QM's live room view. Lobby for now: share the code, watch the roster
// fill up. P4 adds the board, reveal controls and scoring.
const HostRoomInner = () => {
  const searchParams = useSearchParams();
  const code = normalizeRoomCode(searchParams.get('room'));
  const { isLoading: authLoading } = useAuth();
  const { room, error, isLoading } = useRoom(code);

  if (authLoading || isLoading) {
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
  const tileCount = Object.keys(room.board ?? {}).length;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <Card className="bg-purple-800/40 text-purple-100 text-center">
        <CardHeader>
          <CardTitle>{room.quizName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p>Players join at this site with the code:</p>
          <div className="text-6xl font-bold tracking-[0.3em]">{code}</div>
          <p className="text-sm italic">{tileCount} tiles · waiting in the lobby</p>
        </CardContent>
      </Card>
      <Card className="bg-purple-800/40 text-purple-100">
        <CardContent className="flex gap-8 p-6">
          <TeamRoster label={room.teams?.A?.name ?? 'Team 1'} players={teamA}/>
          <TeamRoster label={room.teams?.B?.name ?? 'Team 2'} players={teamB}/>
        </CardContent>
      </Card>
      <div className="flex flex-col items-center">
        {/* TODO(P4): startGame → status 'playing', board of tiles, reveal loop */}
        <Button size="lg" disabled>Start game</Button>
        <span className="text-xs italic opacity-70">the live loop arrives in P4</span>
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
