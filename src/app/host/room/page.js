'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Loading from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useRoom } from '@/hooks/useRoom';
import { normalizeRoomCode } from '@/data/rooms';
import { getAlpha } from '@/utils';

// The SHARED BIG SCREEN — a pure display, zero controls, cast to the room.
// The QM drives the game from /host/control in another window. Safe to
// screen-share by construction: it never receives the answer key.
// "Head-to-Head Bars" layout (design bundle), fluid so it fills any TV.

// Team A = Sky, Team B = Coral (kept clear of the green/red reveal colours so
// "which team" never reads as "right/wrong"). Names come from the room data.
const teamMeta = (room, team) => (team === 'A'
  ? {
    name: room?.teams?.A?.name ?? 'Team 1',
    color: 'var(--sky)', soft: '#8FD4F5', panel: 'var(--card)', tint: 'rgba(56,189,248,.14)',
    score: room?.scores?.A ?? 0,
  }
  : {
    name: room?.teams?.B?.name ?? 'Team 2',
    color: 'var(--coral)', soft: '#F5B48F', panel: '#3A2114', tint: 'rgba(255,112,67,.14)',
    score: room?.scores?.B ?? 0,
  });

const CONFETTI = [
  { top: '8%', left: '11%', w: 15, h: 15, bg: 'var(--gold)', r: 20 },
  { top: '16%', left: '27%', w: 12, h: 12, bg: 'var(--sky)', round: true },
  { top: '9%', right: '17%', w: 14, h: 14, bg: 'var(--coral)', r: 35 },
  { top: '18%', right: '9%', w: 11, h: 11, bg: 'var(--success)', round: true },
  { top: '22%', left: '7%', w: 10, h: 22, bg: 'var(--gold)', r: -15 },
  { top: '13%', right: '32%', w: 10, h: 20, bg: 'var(--sky)', r: 25 },
  { bottom: '16%', left: '18%', w: 13, h: 13, bg: 'var(--gold)', round: true },
  { bottom: '12%', right: '24%', w: 12, h: 26, bg: 'var(--coral)', r: 28 },
  { bottom: '20%', left: '40%', w: 11, h: 11, bg: 'var(--success)', round: true },
];

const Confetti = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
    {CONFETTI.map((c, i) => (
      <span
        key={i}
        className="absolute"
        style={{
          top: c.top, left: c.left, right: c.right, bottom: c.bottom,
          width: c.w, height: c.h, background: c.bg,
          borderRadius: c.round ? '50%' : 2,
          transform: c.r ? `rotate(${c.r}deg)` : undefined,
        }}
      />
    ))}
  </div>
);

const RoomCodeCorner = ({ code }) => (
  <div className="absolute bottom-3 right-5 z-10 text-sm tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
    ROOM{' '}
    <b className="font-display tracking-[0.2em] text-foreground" style={{ fontSize: 'clamp(15px,1.3vw,20px)' }}>{code}</b>
  </div>
);

// Top VS scoreboard bar, shared by board / question / reveal / ended.
const VsScoreboard = ({ room }) => {
  const a = teamMeta(room, 'A');
  const b = teamMeta(room, 'B');
  const onTurn = room.status === 'playing' ? room.currentTurn : null;
  const barH = 'clamp(84px,11vh,112px)';
  const teamName = 'clamp(18px,2vw,26px)';
  const scoreSize = 'clamp(40px,5vw,56px)';
  return (
    <div className="flex shrink-0 items-stretch border-b-[3px] border-primary" style={{ height: barH }}>
      <div className="flex flex-1 items-center gap-4 px-6 sm:px-9" style={{ background: a.panel }}>
        <span className="rounded-full" style={{ width: 16, height: 16, background: a.color }}/>
        <span className="font-display tracking-[0.08em]" style={{ color: a.soft, fontSize: teamName }}>{a.name.toUpperCase()}</span>
        <span className="ml-auto font-display leading-none" style={{ color: a.color, fontSize: scoreSize, opacity: onTurn && onTurn !== 'A' ? 0.65 : 1 }}>{a.score}</span>
      </div>
      <div className="flex flex-none items-center justify-center bg-primary font-display text-primary-foreground" style={{ width: barH, fontSize: 'clamp(24px,3vw,36px)' }}>VS</div>
      <div className="flex flex-1 items-center gap-4 px-6 sm:px-9" style={{ background: b.panel }}>
        <span className="mr-auto font-display leading-none" style={{ color: b.color, fontSize: scoreSize, opacity: onTurn && onTurn !== 'B' ? 0.65 : 1 }}>{b.score}</span>
        <span className="font-display tracking-[0.08em]" style={{ color: b.soft, fontSize: teamName }}>{b.name.toUpperCase()}</span>
        <span className="rounded-full" style={{ width: 16, height: 16, background: b.color }}/>
      </div>
    </div>
  );
};

const LobbyRoster = ({ meta, players }) => (
  <div className="flex min-h-0 flex-1 flex-col rounded-xl p-4 sm:p-5" style={{ background: meta.panel, borderLeft: `6px solid ${meta.color}` }}>
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-display tracking-[0.06em]" style={{ color: meta.color, fontSize: 'clamp(20px,2.4vw,28px)' }}>{meta.name.toUpperCase()}</span>
      <span className="ml-auto text-sm" style={{ color: meta.soft }}>{players.length} player{players.length === 1 ? '' : 's'}</span>
    </div>
    <div className="flex flex-wrap content-start gap-2">
      {players.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold"
          style={{ background: meta.tint, fontSize: 'clamp(14px,1.5vw,17px)', opacity: p.connected ? 1 : 0.5 }}
        >
          <span className="rounded-full" style={{ width: 9, height: 9, background: meta.color }}/>
          {p.name}
        </span>
      ))}
      {players.length === 0 && (
        <span className="inline-flex items-center rounded-full border border-dashed px-3.5 py-2 font-semibold" style={{ color: 'var(--muted-foreground)', borderColor: 'rgba(255,255,255,.16)', fontSize: 'clamp(14px,1.5vw,16px)' }}>
          waiting…
        </span>
      )}
    </div>
  </div>
);

// One full-width answer bar (question + reveal phases).
const AnswerBar = ({ index, text, taps, state }) => {
  // state: 'idle' | 'correct' | 'wrong' | 'dim'
  const bg = state === 'correct' ? '#0E3A24' : state === 'wrong' ? '#39151A' : state === 'dim' ? '#0C1B44' : 'var(--card)';
  const border = state === 'correct' ? '2px solid var(--success)'
    : state === 'wrong' ? '2px solid var(--destructive)'
    : state === 'dim' ? '2px solid rgba(255,255,255,.07)'
    : '2px solid rgba(246,197,68,.28)';
  const chipBg = state === 'correct' ? 'var(--success)' : state === 'wrong' ? 'var(--destructive)' : state === 'dim' ? 'rgba(143,166,216,.18)' : 'var(--primary)';
  const chipColor = state === 'correct' ? '#04140C' : state === 'wrong' ? '#160406' : state === 'dim' ? '#8FA6D8' : 'var(--primary-foreground)';
  const tapColor = state === 'correct' ? '#7FE3AF' : state === 'wrong' ? '#F0A0A3' : state === 'dim' ? '#5A6E9E' : 'var(--muted-foreground)';
  const chip = 'clamp(40px,3vw,52px)';
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-4 rounded-xl px-4 sm:px-6"
      style={{ background: bg, border, opacity: state === 'dim' ? 0.55 : 1, animation: state === 'correct' ? 'correctGlow 2.4s ease-in-out infinite' : undefined }}
    >
      <span className="flex flex-none items-center justify-center rounded-[10px] font-display" style={{ width: chip, height: chip, background: chipBg, color: chipColor, fontSize: 'clamp(20px,2vw,26px)' }}>{getAlpha(index)}</span>
      <span className="min-w-0 flex-1 font-bold" style={{ fontSize: 'clamp(19px,2.2vw,28px)', lineHeight: 1.15, color: state === 'dim' ? '#C7D2EC' : 'var(--foreground)' }}>{text}</span>
      <span className="font-display tracking-[0.06em] whitespace-nowrap" style={{ color: tapColor, fontSize: 'clamp(14px,1.4vw,18px)' }}>{taps} TAP{taps === 1 ? '' : 'S'}</span>
      {state === 'correct' && <span className="flex flex-none items-center justify-center rounded-full font-extrabold" style={{ width: 34, height: 34, background: 'var(--success)', color: '#04140C' }}>✓</span>}
      {state === 'wrong' && <span className="flex flex-none items-center justify-center rounded-full font-extrabold" style={{ width: 34, height: 34, background: 'var(--destructive)', color: '#160406' }}>✗</span>}
    </div>
  );
};

const HostRoomInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = normalizeRoomCode(searchParams.get('room'));
  const { user, isLoading: authLoading } = useAuth();
  const { room, error, isLoading } = useRoom(code);

  const joinUrl = typeof window === 'undefined' || !code
    ? null
    : `${window.location.origin}/play/?room=${code}`;
  const joinHost = joinUrl ? joinUrl.replace(/^https?:\/\//, '').replace(/\/play.*$/, '') : '';

  const isMemberNotHost = !!(room && user && room.hostId !== user.uid);
  useEffect(() => {
    if (isMemberNotHost) router.replace(`/play/?room=${code}`);
  }, [isMemberNotHost, code, router]);

  if (authLoading || isLoading || isMemberNotHost) {
    return <Loading/>;
  }

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="error-message text-center">
          {error ? `Could not open room: ${error.message}` : `Room ${code || '?'} was not found.`}
        </div>
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
      <div className="flex h-full flex-col">
        <div className="h-2 shrink-0 bg-primary"/>
        <div className="px-10 pb-4 pt-6 text-center">
          <div className="font-display tracking-[0.35em] text-primary" style={{ fontSize: 'clamp(12px,1.2vw,16px)' }}>QUIZ NIGHT</div>
          <div className="font-extrabold leading-tight" style={{ fontSize: 'clamp(28px,3.6vw,44px)' }}>{room.quizName}</div>
        </div>
        <div className="flex min-h-0 flex-1 gap-6 px-10 pb-10">
          <div className="flex w-[38%] max-w-[440px] flex-none flex-col items-center justify-center gap-3 rounded-2xl p-6" style={{ background: 'var(--card)', border: '2px solid rgba(246,197,68,.3)' }}>
            <div className="font-display tracking-[0.2em]" style={{ color: 'var(--muted-foreground)', fontSize: 'clamp(13px,1.4vw,16px)' }}>SCAN OR TYPE THE CODE</div>
            <div className="font-display leading-none text-primary" style={{ fontSize: 'clamp(64px,9vw,120px)', letterSpacing: '0.06em' }}>{code}</div>
            {joinUrl && (
              <div className="mt-2 rounded-xl bg-white p-3">
                <QRCodeSVG value={joinUrl} size={132} marginSize={1} title={`Join at ${joinUrl}`}/>
              </div>
            )}
            <div className="text-sm tracking-wide" style={{ color: 'var(--muted-foreground)' }}>{joinHost || 'join on your phone'}</div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <LobbyRoster meta={teamMeta(room, 'A')} players={teamA}/>
            <LobbyRoster meta={teamMeta(room, 'B')} players={teamB}/>
          </div>
        </div>
      </div>
    );
  }

  // --- Ended ---------------------------------------------------------------
  if (room.status === 'ended') {
    const isTie = room.winner === 'tie';
    const win = isTie ? null : teamMeta(room, room.winner);
    const a = teamMeta(room, 'A');
    const b = teamMeta(room, 'B');
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden">
        <Confetti/>
        <div className="z-10 font-display tracking-[0.4em] text-primary" style={{ fontSize: 'clamp(14px,1.6vw,18px)' }}>FINAL RESULTS</div>
        {!isTie && (
          <div className="z-10 my-2 flex items-center justify-center rounded-full bg-primary font-display text-primary-foreground" style={{ width: 'clamp(72px,8vw,96px)', height: 'clamp(72px,8vw,96px)', fontSize: 'clamp(40px,5vw,52px)' }}>1</div>
        )}
        <div className="z-10 text-center font-display leading-none" style={{ color: isTie ? 'var(--foreground)' : win.color, fontSize: 'clamp(56px,9vw,96px)' }}>
          {isTie ? "IT'S A TIE!" : `${win.name.toUpperCase()} WINS`}
        </div>
        <div className="z-10 mt-5 flex items-center gap-7">
          <div className="flex flex-col items-center gap-1" style={{ opacity: !isTie && room.winner !== 'A' ? 0.7 : 1 }}>
            <span className="font-display leading-none" style={{ color: a.color, fontSize: 'clamp(48px,7vw,64px)' }}>{a.score}</span>
            <span className="font-display tracking-[0.1em]" style={{ color: a.soft, fontSize: 'clamp(13px,1.4vw,16px)' }}>{a.name.toUpperCase()}</span>
          </div>
          <div className="font-display" style={{ color: 'var(--muted-foreground)', fontSize: 'clamp(20px,2.4vw,28px)' }}>—</div>
          <div className="flex flex-col items-center gap-1" style={{ opacity: !isTie && room.winner !== 'B' ? 0.7 : 1 }}>
            <span className="font-display leading-none" style={{ color: b.color, fontSize: 'clamp(48px,7vw,64px)' }}>{b.score}</span>
            <span className="font-display tracking-[0.1em]" style={{ color: b.soft, fontSize: 'clamp(13px,1.4vw,16px)' }}>{b.name.toUpperCase()}</span>
          </div>
        </div>
        <div className="z-10 mt-6 text-sm tracking-[0.15em]" style={{ color: 'var(--muted-foreground)' }}>
          THANKS FOR PLAYING · ROOM <b className="font-display tracking-[0.2em] text-foreground">{code}</b>
        </div>
      </div>
    );
  }

  // --- Playing: active question / reveal -----------------------------------
  const activeTileId = room.activeTileId;
  if (activeTileId && room.board?.[activeTileId]) {
    const tile = room.board[activeTileId];
    const reveal = room.reveals?.[activeTileId];
    const revealed = !!(room.revealed && reveal);
    const turn = teamMeta(room, room.currentTurn);

    const turnTaps = Object.entries(room.taps?.[activeTileId] ?? {})
      .filter(([uid]) => room.players?.[uid]?.team === room.currentTurn);
    const tapsByAnswer = {};
    turnTaps.forEach(([, tap]) => { tapsByAnswer[tap.answerIndex] = (tapsByAnswer[tap.answerIndex] ?? 0) + 1; });

    const modeHint = room.answerMode === 'firstTap' ? 'FIRST TAP LOCKS' : 'MAJORITY WINS';
    const answers = tile.possibleAnswers ?? [];

    const answerState = (i) => {
      if (!revealed) return 'idle';
      if (i === reveal.correctIndex) return 'correct';
      if (!reveal.wasCorrect && i === reveal.teamChoice) return 'wrong';
      return 'dim';
    };

    const outcome = !revealed ? null
      : reveal.wasCorrect ? { text: `✓ ${turn.name.toUpperCase()} — CORRECT +1`, bg: 'var(--success)', color: '#04140C' }
      : reveal.teamChoice === undefined || reveal.teamChoice === null ? { text: 'NO VALID ANSWER — NO POINTS', bg: '#39151A', color: '#F0A0A3', border: '1px solid var(--destructive)' }
      : { text: '✗ WRONG — NO POINTS', bg: '#39151A', color: '#F0A0A3', border: '1px solid var(--destructive)' };

    return (
      <div className="relative flex h-full flex-col">
        <VsScoreboard room={room}/>
        <div className="px-8 pb-2 pt-4 text-center sm:px-14">
          <div className="mb-1.5 font-display tracking-[0.18em] text-primary" style={{ fontSize: 'clamp(12px,1.4vw,15px)' }}>
            {tile.tileName.toUpperCase()} &nbsp;—&nbsp; <span style={{ color: turn.color }}>{turn.name.toUpperCase()}&rsquo;S TURN</span>{!revealed ? <> &nbsp;·&nbsp; {modeHint}</> : null}
          </div>
          <div className="mx-auto font-extrabold" style={{ fontSize: 'clamp(24px,3.4vw,40px)', lineHeight: 1.14, maxWidth: '58ch', textWrap: 'balance' }}>{tile.questionText}</div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-8 pb-6 pt-1.5 sm:px-11">
          {answers.map(({ answerMessage }, i) => (
            <AnswerBar key={i} index={i} text={answerMessage} taps={tapsByAnswer[i] ?? 0} state={answerState(i)}/>
          ))}
        </div>
        {outcome && (
          <div className="shrink-0 pb-5 text-center">
            <span className="inline-flex items-center gap-2.5 rounded-full font-display tracking-[0.04em]" style={{ background: outcome.bg, color: outcome.color, border: outcome.border, padding: '9px 24px', fontSize: 'clamp(16px,2vw,22px)' }}>{outcome.text}</span>
          </div>
        )}
        <RoomCodeCorner code={code}/>
      </div>
    );
  }

  // --- Playing: the board --------------------------------------------------
  const turn = teamMeta(room, room.currentTurn);
  return (
    <div className="relative flex h-full flex-col">
      <VsScoreboard room={room}/>
      <div className="px-10 pb-1 pt-5 text-center">
        <span className="inline-flex items-center gap-3 font-display" style={{ fontSize: 'clamp(22px,2.6vw,30px)', letterSpacing: '0.06em' }}>
          <span style={{ color: turn.color }}>{turn.name.toUpperCase()}</span>
          <span className="font-sans font-normal" style={{ color: 'var(--muted-foreground)' }}>— pick a tile</span>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 px-10 pb-12 pt-2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gridAutoRows: '1fr' }}>
        {tiles.map(([tileId, t]) => {
          const used = !!room.usedTiles?.[tileId];
          return (
            <div
              key={tileId}
              className="relative flex items-center justify-center rounded-2xl p-3 text-center"
              style={{
                background: used ? '#0C1B44' : 'var(--card)',
                border: used ? '2px solid rgba(255,255,255,.06)' : '2px solid rgba(246,197,68,.3)',
                opacity: used ? 0.4 : 1,
              }}
            >
              <span className="font-display leading-tight" style={{ fontSize: 'clamp(18px,2vw,26px)', letterSpacing: '0.03em', textDecoration: used ? 'line-through' : undefined }}>{t.tileName.toUpperCase()}</span>
              {used && <span className="absolute right-2.5 top-2 text-xs tracking-wide" style={{ color: '#5A6E9E' }}>DONE</span>}
            </div>
          );
        })}
      </div>
      <RoomCodeCorner code={code}/>
    </div>
  );
};

const HostRoom = () => (
  <main className="h-dvh w-screen overflow-hidden bg-background text-foreground">
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loading/></div>}>
      <HostRoomInner/>
    </Suspense>
  </main>
);

export default HostRoom;
