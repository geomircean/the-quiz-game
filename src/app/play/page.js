'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, RadioGroup, RadioGroupItem } from '@/components';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { joinRoom, normalizeRoomCode, watchPresence } from '@/data/rooms';
import { submitTap } from '@/data/game';
import AnswerItem from '@/components/answer-item';
import { getAlpha } from '@/utils';

const isPermissionDenied = (error) =>
  error?.code === 'PERMISSION_DENIED' || /permission[_ ]?denied/i.test(String(error?.message ?? ''));

// Players land here with ?room=CODE (or type it on the home page first).
// A phone quietly gets an anonymous identity; a refresh keeps the same uid,
// so an existing membership slides straight back into the room.
const PlayInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = normalizeRoomCode(searchParams.get('room'));
  const { user, isLoading: authLoading, signInAsGuest } = useAuth();
  const { room, denied, error, isLoading: roomLoading, resubscribe } = useRoom(code);

  const [name, setName] = useState('');
  const [team, setTeam] = useState('A');
  const [joinError, setJoinError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [guestError, setGuestError] = useState(null);
  const [guestAttempt, setGuestAttempt] = useState(0);

  const isMember = !!(room && user && room.players?.[user.uid]);
  const isHostWithoutMembership = !!(room && user && !room.players?.[user.uid] && room.hostId === user.uid);

  // No/invalid code → back to the join screen.
  useEffect(() => {
    if (!code) router.replace('/');
  }, [code, router]);

  // Every visitor gets a guest identity (the QM keeps their Google session).
  // Failures surface with a retry — a spinner-forever is not an answer.
  useEffect(() => {
    if (authLoading || user) return;
    signInAsGuest().catch((err) => setGuestError(err.message));
  }, [authLoading, user, signInAsGuest, guestAttempt]);

  // The host can read the room without being a player — send them to the
  // host view instead of a broken player lobby.
  useEffect(() => {
    if (isHostWithoutMembership) router.replace(`/host/room/?room=${code}`);
  }, [isHostWithoutMembership, code, router]);

  // Presence: only once actually joined (the host or a pre-join visitor
  // must never write a phantom players/{uid}/connected node).
  useEffect(() => {
    if (!isMember) return undefined;
    return watchPresence(code, user.uid);
  }, [isMember, code, user?.uid]);

  if (!code) {
    return <Loading/>;
  }

  if (guestError) {
    return (
      <Card className="mx-auto max-w-md bg-purple-800/40 text-purple-100">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="error-message">Could not get you a guest pass: {guestError}</div>
          <Button onClick={() => { setGuestError(null); setGuestAttempt((n) => n + 1); }}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (authLoading || !user || roomLoading || isHostWithoutMembership) {
    return <Loading/>;
  }

  // Sealed room + no membership yet → show the join form.
  if (denied || (!room && !error)) {
    const join = async () => {
      setJoinError(null);
      const trimmed = name.trim();
      if (!trimmed) {
        return setJoinError('Enter a name so your team knows who you are.');
      }
      setIsJoining(true);
      try {
        await joinRoom({ code, uid: user.uid, name: trimmed, team });
        resubscribe();
      } catch (err) {
        setJoinError(
          isPermissionDenied(err)
            ? `Room ${code} was not found — check the code with your host.`
            : err.message,
        );
      }
      setIsJoining(false);
    };

    return (
      <Card className="mx-auto max-w-md bg-purple-800/40 text-purple-100">
        <CardHeader>
          <CardTitle>Join room {code}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-left">
          <label className="flex flex-col gap-2">
            Your name
            <Input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)}/>
          </label>
          <div className="flex flex-col gap-2">
            <span>Pick a team</span>
            <RadioGroup value={team} onValueChange={setTeam}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="A" id="team-a"/>
                <Label htmlFor="team-a" theme="purple">Team 1</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="B" id="team-b"/>
                <Label htmlFor="team-b" theme="purple">Team 2</Label>
              </div>
            </RadioGroup>
          </div>
          {joinError && <div className="error-message">{joinError}</div>}
          <Button onClick={join} disabled={isJoining}>{isJoining ? 'Joining…' : 'Join'}</Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <div className="error-message text-center">Could not reach the room: {error.message}</div>;
  }

  const myPlayer = room.players?.[user.uid];
  const teammates = Object.values(room.players ?? {}).filter((p) => p.team === myPlayer?.team);
  const teamName = room.teams?.[myPlayer?.team]?.name ?? myPlayer?.team;
  const scores = (
    <p className="text-center text-sm">
      {room.teams?.A?.name ?? 'Team 1'}: {room.scores?.A ?? 0} · {room.teams?.B?.name ?? 'Team 2'}: {room.scores?.B ?? 0}
    </p>
  );

  // --- Ended -----------------------------------------------------------------
  if (room.status === 'ended') {
    const winnerLabel = room.winner === 'tie'
      ? "It's a tie!"
      : `${room.teams?.[room.winner]?.name ?? room.winner} wins!`;
    const weWon = room.winner === myPlayer?.team;
    return (
      <Card className="mx-auto max-w-md bg-purple-800/40 text-purple-100 text-center">
        <CardHeader>
          <CardTitle className="text-3xl">{winnerLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {room.winner !== 'tie' && <p>{weWon ? 'Congratulations! 🎉' : 'Better luck next time.'}</p>}
          {scores}
        </CardContent>
      </Card>
    );
  }

  // --- Playing: active question ------------------------------------------------
  const activeTileId = room.activeTileId;
  if (room.status === 'playing' && activeTileId && room.board?.[activeTileId]) {
    const tile = room.board[activeTileId];
    const reveal = room.reveals?.[activeTileId];
    const isMyTurn = myPlayer?.team === room.currentTurn;
    const myTap = room.taps?.[activeTileId]?.[user.uid];
    const firstTapLocked = room.answerMode === 'firstTap'
      && Object.entries(room.taps?.[activeTileId] ?? {})
        .some(([uid]) => room.players?.[uid]?.team === room.currentTurn);
    const canTap = isMyTurn && !room.revealed && !firstTapLocked;
    const turnTeamName = room.teams?.[room.currentTurn]?.name ?? room.currentTurn;

    const tap = async (index) => {
      try {
        await submitTap({ code, tileId: activeTileId, uid: user.uid, answerIndex: index });
      } catch {
        // Rules rejected it (turn flipped / revealed / firstTap locked) —
        // the live snapshot will already reflect why.
      }
    };

    return (
      <Card className="mx-auto max-w-2xl bg-purple-800/40 text-purple-100">
        <CardHeader>
          <em>{tile.tileName}</em>
          <CardTitle className="text-2xl">{tile.questionText}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!isMyTurn && !room.revealed && (
            <p className="text-sm italic text-center">{turnTeamName} is answering — sit tight.</p>
          )}
          {isMyTurn && !room.revealed && room.answerMode === 'majority' && (
            <p className="text-sm italic text-center">Everyone taps — most taps wins (a tie is wrong!).</p>
          )}
          {isMyTurn && !room.revealed && room.answerMode === 'firstTap' && (
            <p className="text-sm italic text-center">
              {firstTapLocked ? 'Your team&apos;s answer is locked in.' : 'First tap locks it for the whole team!'}
            </p>
          )}
          {(tile.possibleAnswers ?? []).map(({ answerMessage }, index) => (
            <AnswerItem
              key={index}
              index={index}
              isCorrect={room.revealed && reveal ? index === reveal.correctIndex : false}
              showCorrectAnswer={!!room.revealed && !!reveal}
              isAnswerSelected={
                room.revealed && reveal
                  ? index === reveal.teamChoice
                  : myTap?.answerIndex === index
              }
              onClick={() => canTap && tap(index)}
            >
              <span className="mr-4 font-bold">{getAlpha(index)}.</span>
              {answerMessage}
            </AnswerItem>
          ))}
          {room.revealed && reveal && (
            <p className="text-center text-lg">
              {reveal.wasCorrect
                ? `Correct! +1 for ${room.teams?.[reveal.team]?.name ?? reveal.team}.`
                : reveal.teamChoice === undefined || reveal.teamChoice === null
                  ? `No valid team answer${room.answerMode === 'majority' ? ' (no taps, or the votes tied)' : ''} — no points.`
                  : 'Wrong answer — no points.'}
            </p>
          )}
          {scores}
        </CardContent>
      </Card>
    );
  }

  // --- Playing: between questions ----------------------------------------------
  if (room.status === 'playing') {
    const isMyTurn = myPlayer?.team === room.currentTurn;
    const turnTeamName = room.teams?.[room.currentTurn]?.name ?? room.currentTurn;
    return (
      <Card className="mx-auto max-w-md bg-purple-800/40 text-purple-100 text-center">
        <CardContent className="flex flex-col gap-3 p-6">
          <p className="text-xl">
            {isMyTurn
              ? 'Your team picks a tile — shout it out, the host clicks it!'
              : `${turnTeamName} is picking a tile…`}
          </p>
          {scores}
        </CardContent>
      </Card>
    );
  }

  // --- Lobby ---------------------------------------------------------------
  return (
    <Card className="mx-auto max-w-md bg-purple-800/40 text-purple-100">
      <CardHeader>
        <CardTitle>{room.quizName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-left">
        <p>You&apos;re in, <strong>{myPlayer?.name}</strong> — playing for <strong>{teamName}</strong>.</p>
        <p className="text-sm italic">Waiting for the host to start the game…</p>
        <div>
          <span className="text-sm">Your team ({teammates.length}):</span>
          <ul className="text-sm list-disc list-inside">
            {teammates.map((p, i) => (
              <li key={i} className={p.connected ? '' : 'opacity-50'}>
                {p.name}{p.connected ? '' : ' (away)'}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const Play = () => (
  <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
    <div className="container mx-auto px-4 py-16">
      <Suspense fallback={<Loading/>}>
        <PlayInner/>
      </Suspense>
    </div>
  </main>
);

export default Play;
