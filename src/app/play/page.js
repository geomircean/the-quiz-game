'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { joinRoom, normalizeRoomCode, watchPresence } from '@/data/rooms';
import { submitTap } from '@/data/game';
import { getAlpha } from '@/utils';

// The player's phone. One thumb-reach per screen, navy + gold (design
// bundle "Quiz Player Phone"). Presentation only — the guest identity,
// host redirect, presence, join and tap wiring are unchanged.

const isPermissionDenied = (error) =>
  error?.code === 'PERMISSION_DENIED' || /permission[_ ]?denied/i.test(String(error?.message ?? ''));

// Team A = Sky, Team B = Coral — the same tinting the big screen uses, so a
// player's colour matches what the room sees. Real team names, tinted.
const teamMeta = (room, team) => (team === 'B'
  ? { key: 'B', name: room?.teams?.B?.name ?? 'Team 2', color: '#FF7043', soft: '#F5B48F', tint: 'rgba(255,112,67,.14)', edge: 'rgba(255,112,67,.55)', on: '#160A05' }
  : { key: 'A', name: room?.teams?.A?.name ?? 'Team 1', color: '#38BDF8', soft: '#8FD4F5', tint: 'rgba(56,189,248,.14)', edge: 'rgba(56,189,248,.55)', on: '#04121F' });

// Full-height navy canvas every screen sits in. `bg` overrides for the
// green/red reveal takeovers.
const Screen = ({ children, bg, center, className = '' }) => (
  <main className="min-h-dvh w-full text-foreground" style={{ background: bg ?? 'var(--background)' }}>
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-5 py-8 sm:px-6 ${center ? 'items-center justify-center text-center' : ''} ${className}`}
    >
      {children}
    </div>
  </main>
);

const TopBar = ({ code, meta }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs tracking-[0.12em]" style={{ color: '#6E82B0' }}>
      ROOM <b className="font-display tracking-[0.15em] text-foreground">{code}</b>
    </span>
    {meta && (
      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: meta.tint, color: meta.soft }}>
        <span className="rounded-full" style={{ width: 8, height: 8, background: meta.color }}/>
        {meta.name.toUpperCase()}
      </span>
    )}
  </div>
);

const BlinkDots = ({ color = '#9FB4DE' }) => (
  <span className="inline-flex gap-1">
    {[0, 0.2, 0.4].map((d) => (
      <span key={d} className="rounded-full" style={{ width: 5, height: 5, background: color, animation: `blink 1.2s ${d}s infinite` }}/>
    ))}
  </span>
);

const REVEAL_CONFETTI = [
  { top: 70, left: 48, w: 12, h: 12, bg: 'var(--gold)', rot: 20 },
  { top: 140, right: 56, w: 10, h: 10, bg: 'var(--sky)', round: true },
  { top: 104, right: 104, w: 9, h: 20, bg: 'var(--success)', rot: 25 },
  { top: 180, left: 70, w: 10, h: 10, bg: 'var(--coral)', round: true },
  { bottom: 150, left: 54, w: 11, h: 22, bg: 'var(--gold)', rot: -18 },
  { bottom: 120, right: 60, w: 10, h: 10, bg: 'var(--sky)', round: true },
];

const RevealConfetti = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0">
    {REVEAL_CONFETTI.map((c, i) => (
      <span
        key={i}
        className="absolute"
        style={{ top: c.top, left: c.left, right: c.right, bottom: c.bottom, width: c.w, height: c.h, background: c.bg, borderRadius: c.round ? '50%' : 2, transform: c.rot ? `rotate(${c.rot}deg)` : undefined }}
      />
    ))}
  </div>
);

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
      <Screen center>
        <div className="font-display text-primary" style={{ fontSize: 34 }}>HICCUP.</div>
        <p className="mt-3 max-w-[280px] text-[15px]" style={{ color: '#9FB4DE' }}>Could not get you a guest pass: {guestError}</p>
        <button
          type="button"
          onClick={() => { setGuestError(null); setGuestAttempt((n) => n + 1); }}
          className="mt-7 w-full max-w-[280px] rounded-2xl bg-primary py-4 font-display text-lg tracking-wide text-primary-foreground active:scale-[.98]"
        >
          TRY AGAIN
        </button>
      </Screen>
    );
  }

  if (authLoading || !user || roomLoading || isHostWithoutMembership) {
    return <Loading/>;
  }

  // Sealed room + no membership yet → the join form.
  if (denied || (!room && !error)) {
    const trimmed = name.trim();
    const pick = teamMeta(room, team);
    const join = async () => {
      setJoinError(null);
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
      <Screen>
        <TopBar code={code}/>
        <h1 className="mt-5 font-display leading-none" style={{ fontSize: 34 }}>
          YOU&rsquo;RE IN.<br /><span className="text-primary">PICK YOUR SPOT.</span>
        </h1>

        <label htmlFor="player-name" className="mt-8 text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>YOUR NAME</label>
        <input
          id="player-name"
          type="text"
          value={name}
          maxLength={40}
          placeholder="Type your name"
          onChange={(e) => setName(e.target.value)}
          className="mt-2.5 h-[58px] rounded-2xl px-4 text-xl font-semibold text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
          style={{ background: 'var(--card)', border: '2px solid rgba(246,197,68,.35)' }}
        />

        <span className="mt-6 text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>CHOOSE YOUR TEAM</span>
        <div className="mt-3 flex flex-col gap-3">
          {['A', 'B'].map((t) => {
            const m = teamMeta(room, t);
            const selected = team === t;
            const count = Object.values(room?.players ?? {}).filter((p) => p.team === t).length;
            return (
              <button
                type="button"
                key={t}
                onClick={() => setTeam(t)}
                className="flex items-center gap-3.5 rounded-2xl p-4 text-left active:scale-[.99]"
                style={{ background: selected ? m.tint : 'var(--card)', border: `2px solid ${selected ? m.color : 'rgba(255,255,255,.08)'}` }}
              >
                <span className="rounded-full" style={{ width: 18, height: 18, background: m.color }}/>
                <span className="font-display tracking-[0.04em]" style={{ fontSize: 22, color: selected ? m.soft : '#C7D2EC' }}>{m.name.toUpperCase()}</span>
                {room && <span className="ml-auto text-sm" style={{ color: '#8FA6D8' }}>{count} player{count === 1 ? '' : 's'}</span>}
                {selected && (
                  <span className="flex items-center justify-center rounded-full text-sm font-extrabold" style={{ width: 26, height: 26, background: m.color, color: m.on }}>✓</span>
                )}
              </button>
            );
          })}
        </div>

        {joinError && <div className="error-message mt-4">{joinError}</div>}

        <button
          type="button"
          onClick={join}
          disabled={isJoining}
          className="mt-auto w-full rounded-2xl bg-primary py-5 font-display text-xl tracking-wide text-primary-foreground active:scale-[.99] disabled:opacity-60"
        >
          {isJoining ? 'JOINING…' : `JOIN ${pick.name.toUpperCase()}`}
        </button>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen center>
        <div className="error-message">Could not reach the room: {error.message}</div>
      </Screen>
    );
  }

  const myPlayer = room.players?.[user.uid];
  const me = teamMeta(room, myPlayer?.team);

  // --- Ended -----------------------------------------------------------------
  if (room.status === 'ended') {
    const isTie = room.winner === 'tie';
    const weWon = !isTie && room.winner === myPlayer?.team;
    const a = teamMeta(room, 'A');
    const b = teamMeta(room, 'B');
    const headline = isTie ? "IT'S A TIE!" : weWon ? 'YOU WON!' : `${teamMeta(room, room.winner).name.toUpperCase()} WINS`;
    return (
      <Screen center bg={weWon ? '#0B2A1B' : undefined}>
        {weWon && <RevealConfetti/>}
        <div className="font-display tracking-[0.3em] text-primary" style={{ fontSize: 13 }}>FINAL</div>
        <h1 className="mt-3 font-display leading-none" style={{ fontSize: 52, color: weWon ? '#7FE3AF' : isTie ? 'var(--foreground)' : teamMeta(room, room.winner).color }}>{headline}</h1>
        {!isTie && (
          <p className="mt-4 text-[16px]" style={{ color: weWon ? '#C7ECD6' : '#9FB4DE' }}>
            {weWon ? 'Nice work — you took it. 🎉' : 'Good game. Rematch?'}
          </p>
        )}
        <div className="mt-8 flex items-end gap-6">
          <div className="flex flex-col items-center gap-1" style={{ opacity: !isTie && room.winner !== 'A' ? 0.65 : 1 }}>
            <span className="font-display leading-none" style={{ fontSize: 46, color: a.color }}>{room.scores?.A ?? 0}</span>
            <span className="font-display tracking-[0.08em]" style={{ fontSize: 12, color: a.soft }}>{a.name.toUpperCase()}</span>
          </div>
          <span className="font-display" style={{ fontSize: 20, color: '#6E82B0' }}>—</span>
          <div className="flex flex-col items-center gap-1" style={{ opacity: !isTie && room.winner !== 'B' ? 0.65 : 1 }}>
            <span className="font-display leading-none" style={{ fontSize: 46, color: b.color }}>{room.scores?.B ?? 0}</span>
            <span className="font-display tracking-[0.08em]" style={{ fontSize: 12, color: b.soft }}>{b.name.toUpperCase()}</span>
          </div>
        </div>
      </Screen>
    );
  }

  // --- Playing: active question ----------------------------------------------
  const activeTileId = room.activeTileId;
  if (room.status === 'playing' && activeTileId && room.board?.[activeTileId]) {
    const tile = room.board[activeTileId];
    const reveal = room.reveals?.[activeTileId];
    const revealed = !!(room.revealed && reveal);
    const isMyTurn = myPlayer?.team === room.currentTurn;
    const myTap = room.taps?.[activeTileId]?.[user.uid];
    const firstTapLocked = room.answerMode === 'firstTap'
      && Object.entries(room.taps?.[activeTileId] ?? {})
        .some(([uid]) => room.players?.[uid]?.team === room.currentTurn);
    const canTap = isMyTurn && !room.revealed && !firstTapLocked;
    const turn = teamMeta(room, room.currentTurn);

    const tap = async (index) => {
      try {
        await submitTap({ code, tileId: activeTileId, uid: user.uid, answerIndex: index });
      } catch {
        // Rules rejected it (turn flipped / revealed / firstTap locked) —
        // the live snapshot will already reflect why.
      }
    };

    // --- Reveal takeover: whole phone goes green / red ---------------------
    if (revealed) {
      const correct = reveal.wasCorrect;
      const correctText = tile.possibleAnswers?.[reveal.correctIndex]?.answerMessage;
      const noAnswer = reveal.teamChoice === undefined || reveal.teamChoice === null;
      return (
        <Screen center bg={correct ? '#0B2A1B' : '#2A0F12'}>
          {correct && <RevealConfetti/>}
          <div
            className="flex items-center justify-center rounded-full font-display"
            style={{ width: 110, height: 110, fontSize: 62, background: correct ? 'var(--success)' : 'var(--destructive)', color: correct ? '#04140C' : '#2A0406', animation: correct ? 'correctGlow 2.2s ease-in-out infinite' : undefined }}
          >
            {correct ? '✓' : '✗'}
          </div>
          <h1 className="mt-5 font-display leading-none" style={{ fontSize: 50, color: correct ? '#7FE3AF' : '#F5A3A6' }}>
            {correct ? 'CORRECT!' : noAnswer ? 'NO ANSWER' : 'WRONG'}
          </h1>
          <p className="mt-4 max-w-[280px] text-[17px] leading-relaxed" style={{ color: correct ? '#C7ECD6' : '#F0C9CB' }}>
            The answer was <b className="text-foreground">{correctText}</b>.
          </p>
          <div
            className="mt-6 inline-flex items-center gap-2.5 rounded-full font-display tracking-wide"
            style={{ padding: '11px 22px', fontSize: 20, background: correct ? 'var(--success)' : 'rgba(229,72,77,.16)', color: correct ? '#04140C' : '#F5A3A6', border: correct ? 'none' : '1px solid var(--destructive)' }}
          >
            {correct ? `+1 · ${turn.name.toUpperCase()}` : 'NO POINTS'}
          </div>
        </Screen>
      );
    }

    // --- Live question ----------------------------------------------------
    return (
      <Screen>
        <TopBar code={code} meta={me}/>
        {isMyTurn ? (
          <div className="mt-4 inline-flex max-w-max items-center gap-2 self-start rounded-full bg-primary font-display tracking-wide text-primary-foreground" style={{ padding: '8px 14px', fontSize: 14 }}>
            YOUR TURN{room.answerMode === 'firstTap' ? (firstTapLocked ? ' · LOCKED IN' : ' · FIRST TAP LOCKS IT') : ' · MOST TAPS WINS'}
          </div>
        ) : (
          <div className="mt-4 inline-flex max-w-max items-center gap-2 self-start rounded-full font-semibold" style={{ padding: '8px 14px', fontSize: 13, background: turn.tint, color: turn.soft }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: turn.color }}/>
            {turn.name.toUpperCase()} IS ANSWERING — SIT TIGHT
          </div>
        )}

        <div className="mt-4 text-[10px] font-display tracking-[0.18em]" style={{ color: '#6E82B0' }}>{tile.tileName.toUpperCase()}</div>
        <h1 className="mt-1.5 font-bold" style={{ fontSize: 23, lineHeight: 1.28 }}>{tile.questionText}</h1>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          {(tile.possibleAnswers ?? []).map(({ answerMessage }, index) => {
            const selected = myTap?.answerIndex === index;
            const active = canTap;
            return (
              <button
                type="button"
                key={index}
                onClick={() => active && tap(index)}
                disabled={!active}
                className={`flex items-center gap-3.5 rounded-2xl p-4 text-left transition ${active ? 'active:scale-[.99]' : 'cursor-default'}`}
                style={{
                  background: selected ? me.tint : 'var(--card)',
                  border: `2px solid ${selected ? me.color : active ? 'rgba(246,197,68,.4)' : 'rgba(255,255,255,.07)'}`,
                  opacity: active || selected ? 1 : 0.6,
                }}
              >
                <span className="flex flex-none items-center justify-center rounded-[11px] font-display" style={{ width: 42, height: 42, fontSize: 22, background: selected ? me.color : 'var(--primary)', color: selected ? me.on : 'var(--primary-foreground)' }}>{getAlpha(index)}</span>
                <span className="flex-1 font-semibold" style={{ fontSize: 19, lineHeight: 1.2 }}>{answerMessage}</span>
              </button>
            );
          })}
        </div>
      </Screen>
    );
  }

  // --- Playing: between questions --------------------------------------------
  if (room.status === 'playing') {
    const isMyTurn = myPlayer?.team === room.currentTurn;
    const turn = teamMeta(room, room.currentTurn);
    return (
      <Screen center>
        <TopBar code={code} meta={me}/>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center rounded-full font-display" style={{ width: 76, height: 76, fontSize: 34, background: turn.tint, color: turn.color }}>
            {isMyTurn ? '★' : '⏳'}
          </div>
          <h1 className="font-display leading-tight" style={{ fontSize: 30, color: isMyTurn ? me.soft : 'var(--foreground)' }}>
            {isMyTurn ? 'YOUR TEAM PICKS!' : `${turn.name.toUpperCase()} IS PICKING`}
          </h1>
          <p className="max-w-[280px] text-[15px] leading-relaxed" style={{ color: '#9FB4DE' }}>
            {isMyTurn
              ? 'Shout out a tile — your host taps it and the question goes live.'
              : <>Hang tight while they choose <BlinkDots/></>}
          </p>
        </div>
        <div className="flex w-full items-center justify-center gap-5 text-sm">
          <span style={{ color: teamMeta(room, 'A').soft }}><b className="font-display text-base">{room.scores?.A ?? 0}</b> {teamMeta(room, 'A').name}</span>
          <span style={{ color: '#6E82B0' }}>vs</span>
          <span style={{ color: teamMeta(room, 'B').soft }}>{teamMeta(room, 'B').name} <b className="font-display text-base">{room.scores?.B ?? 0}</b></span>
        </div>
      </Screen>
    );
  }

  // --- Lobby -----------------------------------------------------------------
  const teammates = Object.values(room.players ?? {}).filter((p) => p.team === myPlayer?.team);
  return (
    <Screen>
      <TopBar code={code} meta={me}/>
      <div className="mt-14 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center rounded-full font-display" style={{ width: 84, height: 84, fontSize: 44, background: me.color, color: me.on }}>✓</div>
        <h1 className="font-display leading-none" style={{ fontSize: 34 }}>YOU&rsquo;RE IN, {(myPlayer?.name ?? '').toUpperCase()}!</h1>
        <div className="inline-flex items-center gap-2 text-[16px]" style={{ color: '#9FB4DE' }}>
          Waiting for the host <BlinkDots/>
        </div>
      </div>
      <div className="mt-11 rounded-2xl p-[18px]" style={{ background: 'var(--card)', borderLeft: `5px solid ${me.color}` }}>
        <div className="mb-3.5 font-display tracking-[0.06em]" style={{ fontSize: 18, color: me.soft }}>YOUR TEAM · {teammates.length}</div>
        <div className="flex flex-wrap gap-2">
          {teammates.map((p, i) => {
            const isYou = p.name === myPlayer?.name;
            return (
              <span
                key={i}
                className="rounded-full px-3.5 py-2 text-[15px] font-semibold"
                style={{
                  background: isYou ? 'var(--primary)' : me.tint,
                  color: isYou ? 'var(--primary-foreground)' : 'var(--foreground)',
                  opacity: p.connected ? 1 : 0.5,
                }}
              >
                {p.name}{isYou ? ' (you)' : p.connected ? '' : ' · away'}
              </span>
            );
          })}
        </div>
      </div>
    </Screen>
  );
};

const Play = () => (
  <Suspense fallback={<Loading/>}>
    <PlayInner/>
  </Suspense>
);

export default Play;
