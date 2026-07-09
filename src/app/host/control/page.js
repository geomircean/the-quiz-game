'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
// Navy + gold app-shell (design bundle "Quiz Command Center").

// Team A = Sky, Team B = Coral — same tinting as the big screen and phones.
const teamMeta = (room, team) => (team === 'B'
  ? { key: 'B', name: room?.teams?.B?.name ?? 'Team 2', color: '#FF7043', soft: '#F5B48F', tint: 'rgba(255,112,67,.16)', on: '#160A05' }
  : { key: 'A', name: room?.teams?.A?.name ?? 'Team 1', color: '#38BDF8', soft: '#8FD4F5', tint: 'rgba(56,189,248,.16)', on: '#04121F' });

// The little Anton state pill ("LOBBY", "BOARD", "QUESTION · 4 OF 12"…).
const StateChip = ({ children }) => (
  <span className="inline-flex self-start rounded-lg font-display tracking-[0.16em]" style={{ background: 'var(--secondary)', color: '#9FB4DE', padding: '6px 12px', fontSize: 13 }}>
    {children}
  </span>
);

const Header = ({ code, quizName, subtitle, ended, copyState, onCopy }) => (
  <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b-2 border-primary bg-popover px-5 py-3 sm:px-6">
    <div className="flex flex-none items-center justify-center rounded-[9px] bg-primary font-display text-primary-foreground" style={{ width: 38, height: 38, fontSize: 24 }}>Q</div>
    <div className="min-w-0 leading-tight">
      <div className="truncate font-bold" style={{ fontSize: 16 }}>{quizName}</div>
      <div className="text-xs" style={{ color: '#7C8DB5' }}>Command Center · {subtitle}</div>
    </div>
    <div className="text-xs tracking-[0.1em]" style={{ color: '#6E82B0' }}>
      ROOM <b className="font-display tracking-[0.18em] text-foreground" style={{ fontSize: 16 }}>{code}</b>
    </div>
    <div className="ml-auto flex items-center gap-2.5">
      {!ended && (
        <button
          type="button"
          onClick={onCopy}
          className="rounded-[10px] border border-white/[.14] px-4 py-2.5 text-sm font-semibold text-[#C7D2EC] hover:bg-accent"
        >
          {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy join link'}
        </button>
      )}
      <a
        href={`/host/room/?room=${code}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-[10px] bg-primary px-4 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90"
        style={{ fontSize: 15 }}
      >
        OPEN BIG SCREEN ↗
      </a>
    </div>
  </header>
);

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
  const joinHost = joinUrl ? joinUrl.replace(/^https?:\/\//, '').replace(/\/play.*$/, '') : '';

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
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="error-message text-center">
          {error ? `Could not open room: ${error.message}` : `Room ${code || '?'} was not found.`}
        </div>
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
  const tiles = Object.entries(room.board ?? {});
  const activeTileId = room.activeTileId;
  const tile = activeTileId ? room.board?.[activeTileId] : null;
  const correctIndex = activeTileId ? answerKey?.[activeTileId] : null;
  const reveal = activeTileId ? room.reveals?.[activeTileId] : null;
  const usedCount = Object.keys(room.usedTiles ?? {}).length;

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

  // --- main column, by game state -------------------------------------------
  let flow;
  if (room.status === 'lobby') {
    const teamACount = players.filter((p) => p.team === 'A').length;
    const teamBCount = players.filter((p) => p.team === 'B').length;
    const canStart = teamACount > 0 && teamBCount > 0;
    flow = (
      <>
        <StateChip>LOBBY</StateChip>
        <h1 className="mt-4 font-display leading-none" style={{ fontSize: 42 }}>WAITING FOR PLAYERS</h1>
        <div className="mt-7 flex flex-col items-stretch gap-5 sm:flex-row">
          <div className="flex-none rounded-2xl px-7 py-6 text-center" style={{ background: 'var(--card)', border: '2px solid rgba(246,197,68,.3)' }}>
            <div className="text-xs tracking-[0.18em]" style={{ color: '#6E82B0' }}>SHARE THIS CODE</div>
            <div className="my-1.5 font-display leading-none text-primary" style={{ fontSize: 72, letterSpacing: '0.08em' }}>{code}</div>
            <div className="text-sm" style={{ color: '#9FB4DE' }}>join at <b className="text-foreground">{joinHost}</b></div>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {['A', 'B'].map((t) => {
              const m = teamMeta(room, t);
              const count = players.filter((p) => p.team === t).length;
              return (
                <div key={t} className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: 'var(--card)' }}>
                  <span className="rounded-full" style={{ width: 12, height: 12, background: m.color }}/>
                  <span className="min-w-0 truncate font-display tracking-[0.04em]" style={{ fontSize: 18, color: m.soft }}>{m.name.toUpperCase()}</span>
                  <span className="ml-auto text-[15px]" style={{ color: '#9FB4DE' }}>{count} player{count === 1 ? '' : 's'}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          disabled={!canStart}
          onClick={act(() => startGame(code))}
          className="mt-8 inline-flex max-w-max items-center gap-2.5 rounded-[14px] bg-primary px-9 py-4 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
          style={{ fontSize: 24 }}
        >
          START GAME →
        </button>
        {!canStart && (
          <span className="mt-3 text-xs italic" style={{ color: '#7C8DB5' }}>
            waiting for at least one player on each team — teams can&apos;t change once the game starts
          </span>
        )}
      </>
    );
  } else if (room.status === 'ended') {
    const isTie = room.winner === 'tie';
    const win = isTie ? null : teamMeta(room, room.winner);
    const a = teamMeta(room, 'A');
    const b = teamMeta(room, 'B');
    flow = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="font-display tracking-[0.3em] text-primary" style={{ fontSize: 13 }}>GAME COMPLETE</div>
        {!isTie && (
          <div className="flex items-center justify-center rounded-full bg-primary font-display text-primary-foreground" style={{ width: 80, height: 80, fontSize: 44 }}>1</div>
        )}
        <h1 className="font-display leading-none" style={{ fontSize: 64, color: isTie ? 'var(--foreground)' : win.color }}>
          {isTie ? "IT'S A TIE!" : `${win.name.toUpperCase()} WINS`}
        </h1>
        <div className="mt-4 flex items-end gap-7">
          <div className="flex flex-col items-center gap-1" style={{ opacity: !isTie && room.winner !== 'A' ? 0.6 : 1 }}>
            <span className="font-display leading-none" style={{ fontSize: 52, color: a.color }}>{room.scores?.A ?? 0}</span>
            <span className="font-display tracking-[0.08em]" style={{ fontSize: 12, color: a.soft }}>{a.name.toUpperCase()}</span>
          </div>
          <span className="font-display" style={{ fontSize: 22, color: '#6E82B0' }}>—</span>
          <div className="flex flex-col items-center gap-1" style={{ opacity: !isTie && room.winner !== 'B' ? 0.6 : 1 }}>
            <span className="font-display leading-none" style={{ fontSize: 52, color: b.color }}>{room.scores?.B ?? 0}</span>
            <span className="font-display tracking-[0.08em]" style={{ fontSize: 12, color: b.soft }}>{b.name.toUpperCase()}</span>
          </div>
        </div>
        <a href="/admin/" className="mt-8 rounded-[12px] border border-white/[.16] px-6 py-3 text-[15px] font-semibold text-[#C7D2EC] hover:bg-accent">
          Back to dashboard
        </a>
      </div>
    );
  } else if (tile) {
    const turn = teamMeta(room, room.currentTurn);
    const teamPlayers = players.filter((p) => p.team === room.currentTurn);
    const tapEntries = Object.entries(room.taps?.[activeTileId] ?? {})
      .filter(([uid]) => room.players?.[uid]?.team === room.currentTurn);
    const tapsByAnswer = {};
    const tappersByAnswer = {};
    for (const [uid, tap] of tapEntries) {
      tapsByAnswer[tap.answerIndex] = (tapsByAnswer[tap.answerIndex] ?? 0) + 1;
      (tappersByAnswer[tap.answerIndex] ??= []).push(room.players?.[uid]?.name);
    }
    const modeHint = room.answerMode === 'firstTap' ? 'first tap locks' : 'most taps wins';

    flow = (
      <>
        <div className="flex flex-wrap items-center gap-3">
          <StateChip>QUESTION · {usedCount + 1} OF {tiles.length}</StateChip>
          <span className="text-sm" style={{ color: '#7C8DB5' }}>
            {tile.tileName.toUpperCase()} · <b style={{ color: turn.soft }}>{turn.name}&rsquo;s turn</b> · {modeHint}
          </span>
        </div>
        <p className="mt-3.5 font-extrabold" style={{ fontSize: 27, lineHeight: 1.22, maxWidth: '52ch' }}>{tile.questionText}</p>

        {!room.revealed && (
          <div className="mt-3.5 inline-flex max-w-max items-center gap-2.5 self-start rounded-[10px] px-3.5 py-2 text-[13px] font-bold" style={{ background: 'rgba(246,197,68,.12)', border: '1px solid rgba(246,197,68,.4)', color: 'var(--primary)' }}>
            <span style={{ width: 15, height: 15, borderRadius: 4, border: '2px solid var(--primary)' }}/>
            Only you can see which answer is correct
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {(tile.possibleAnswers ?? []).map(({ answerMessage }, index) => {
            const isKey = index === correctIndex;
            const revealedCorrect = room.revealed && reveal && index === reveal.correctIndex;
            const revealedWrongPick = room.revealed && reveal && !reveal.wasCorrect && index === reveal.teamChoice;
            const count = tapsByAnswer[index] ?? 0;
            const names = tappersByAnswer[index] ?? [];
            const green = revealedCorrect || (isKey && !room.revealed);
            const bg = revealedCorrect ? '#0E3A24' : revealedWrongPick ? '#39151A' : 'var(--card)';
            const border = revealedCorrect || isKey ? '2px solid var(--success)'
              : revealedWrongPick ? '2px solid var(--destructive)'
              : '2px solid rgba(255,255,255,.08)';
            const chipBg = green ? 'var(--success)' : revealedWrongPick ? 'var(--destructive)' : 'var(--secondary)';
            const chipColor = green ? '#04140C' : revealedWrongPick ? '#160406' : '#C7D2EC';
            const countColor = green ? '#7FE3AF' : count > 0 ? '#9FB4DE' : '#5A6E9E';
            return (
              <div key={index} className="flex flex-col gap-2 rounded-[14px] px-4 py-3.5" style={{ background: bg, border }}>
                <div className="flex items-center gap-3.5">
                  <span className="flex flex-none items-center justify-center rounded-[10px] font-display" style={{ width: 38, height: 38, fontSize: 20, background: chipBg, color: chipColor }}>{getAlpha(index)}</span>
                  <span className="flex-1 font-semibold" style={{ fontSize: 19 }}>{answerMessage}</span>
                  {isKey && !room.revealed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide" style={{ background: 'var(--success)', color: '#04140C' }}>✓ CORRECT</span>
                  )}
                  {count === 0 && <span className="text-xs" style={{ color: '#5A6E9E' }}>no taps yet</span>}
                  <span className="text-right font-display" style={{ width: 44, fontSize: 18, color: countColor }}>{count}</span>
                </div>
                {names.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5" style={{ paddingLeft: 52 }}>
                    <span className="text-xs" style={{ color: '#7C8DB5' }}>tapped by</span>
                    {names.map((n, i) => (
                      <span key={i} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: turn.tint, color: turn.soft }}>{n}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm" style={{ color: '#7C8DB5' }}>
          {tapEntries.length} of {teamPlayers.length} on <b style={{ color: turn.soft }}>{turn.name}</b> tapped
        </p>

        {!room.revealed ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={correctIndex === undefined || correctIndex === null}
              onClick={act(() => revealTile({ code, room, tileId: activeTileId, correctIndex }))}
              className="rounded-[14px] bg-primary px-6 py-4 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
              style={{ fontSize: 16 }}
            >
              REVEAL ANSWER
            </button>
            <button
              type="button"
              onClick={act(() => skipTile({ code, room, tileId: activeTileId }))}
              className="rounded-[14px] border border-white/[.16] px-6 py-4 text-[15px] font-bold text-[#C7D2EC] hover:bg-accent"
            >
              Skip question
            </button>
          </div>
        ) : (
          reveal && (
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div
                className="flex flex-1 items-center gap-4 rounded-2xl px-6 py-4"
                style={reveal.wasCorrect
                  ? { background: '#0E3A24', border: '2px solid var(--success)' }
                  : { background: '#39151A', border: '2px solid var(--destructive)' }}
              >
                <span className="flex flex-none items-center justify-center rounded-full font-extrabold" style={{ width: 52, height: 52, fontSize: 28, background: reveal.wasCorrect ? 'var(--success)' : 'var(--destructive)', color: reveal.wasCorrect ? '#04140C' : '#2A0406' }}>
                  {reveal.wasCorrect ? '✓' : '✗'}
                </span>
                <div className="min-w-0">
                  <div className="font-display leading-none" style={{ fontSize: 28, color: reveal.wasCorrect ? '#7FE3AF' : '#F5A3A6' }}>
                    {turn.name.toUpperCase()} — {reveal.wasCorrect ? 'CORRECT' : reveal.teamChoice === undefined || reveal.teamChoice === null ? 'NO ANSWER' : 'WRONG'}
                  </div>
                  <div className="mt-1 text-sm" style={{ color: reveal.wasCorrect ? '#C7ECD6' : '#F0C9CB' }}>
                    {tile.possibleAnswers?.[reveal.correctIndex]?.answerMessage} was the answer.{reveal.wasCorrect ? ' +1 point awarded.' : ' No points.'}
                  </div>
                </div>
                {reveal.wasCorrect && <span className="ml-auto font-display" style={{ fontSize: 40, color: 'var(--success)' }}>+1</span>}
              </div>
              <button
                type="button"
                onClick={act(() => nextTurn({ code, room, tileId: activeTileId }))}
                className="rounded-[14px] bg-primary px-7 py-4 font-display tracking-wide text-primary-foreground hover:bg-primary/90"
                style={{ fontSize: 16 }}
              >
                NEXT TURN →
              </button>
            </div>
          )
        )}
      </>
    );
  } else {
    const turn = teamMeta(room, room.currentTurn);
    flow = (
      <>
        <div className="flex flex-wrap items-center gap-3.5">
          <StateChip>BOARD</StateChip>
          <span className="font-display tracking-[0.04em]" style={{ fontSize: 22, color: turn.color }}>{turn.name.toUpperCase()}&rsquo;S PICK</span>
        </div>
        <div className="mt-2 text-[15px]" style={{ color: '#7C8DB5' }}>Click a tile to open its question on every screen.</div>
        <div className="mt-5 grid flex-1 gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gridAutoRows: 'minmax(96px,1fr)' }}>
          {tiles.map(([tileId, t]) => {
            const used = !!room.usedTiles?.[tileId];
            return (
              <button
                key={tileId}
                disabled={used}
                onClick={act(() => pickTile(code, tileId))}
                className="flex items-center justify-center rounded-[14px] p-3 text-center font-display tracking-[0.03em] transition hover:enabled:brightness-110"
                style={{
                  fontSize: 22,
                  background: used ? '#0C1B44' : 'var(--card)',
                  border: used ? '2px solid rgba(255,255,255,.06)' : '2px solid rgba(246,197,68,.3)',
                  color: used ? '#5A6E9E' : 'var(--foreground)',
                  textDecoration: used ? 'line-through' : undefined,
                  opacity: used ? 0.5 : 1,
                  cursor: used ? 'not-allowed' : 'pointer',
                }}
              >
                {t.tileName.toUpperCase()}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // --- side rail: scores + players + end-game -------------------------------
  const orderedPlayers = [...players].sort((p, q) => (p.team === q.team ? 0 : p.team === 'A' ? -1 : 1));

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header
        code={code}
        quizName={room.quizName}
        subtitle={room.status === 'ended' ? 'game complete' : 'only you see this'}
        ended={room.status === 'ended'}
        copyState={copyState}
        onCopy={copyJoinLink}
      />
      {actionError && <div className="error-message px-6 pt-3 text-center">{actionError}</div>}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col p-6 sm:p-8">{flow}</section>

        <aside className="flex flex-none flex-col gap-5 border-t border-white/[.07] bg-sidebar p-5 lg:w-[372px] lg:border-l lg:border-t-0">
          <div>
            <div className="mb-3 font-display tracking-[0.16em]" style={{ fontSize: 14, color: '#6E82B0' }}>SCORES</div>
            <div className="flex flex-col gap-2.5">
              {['A', 'B'].map((team) => {
                const m = teamMeta(room, team);
                const onTurn = room.status === 'playing' && room.currentTurn === team;
                return (
                  <div key={team} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'var(--card)', outline: onTurn ? `1px solid ${m.color}` : 'none' }}>
                    <span className="rounded-full" style={{ width: 11, height: 11, background: m.color }}/>
                    <span className="min-w-0 flex-1 truncate font-display tracking-[0.04em]" style={{ fontSize: 16, color: m.soft }}>{m.name.toUpperCase()}</span>
                    <span className="font-display leading-none" style={{ fontSize: 26, color: m.color }}>{room.scores?.[team] ?? 0}</span>
                    <div className="ml-2 flex gap-1.5">
                      <button type="button" aria-label={`Subtract a point from ${m.name}`} onClick={act(() => adjustScore({ code, room, team, delta: -1 }))} className="flex items-center justify-center rounded-[9px] border border-white/10 text-lg text-[#C7D2EC] hover:bg-accent" style={{ width: 32, height: 32 }}>−</button>
                      <button type="button" aria-label={`Add a point to ${m.name}`} onClick={act(() => adjustScore({ code, room, team, delta: 1 }))} className="flex items-center justify-center rounded-[9px] border border-white/10 text-lg text-[#C7D2EC] hover:bg-accent" style={{ width: 32, height: 32, background: 'var(--secondary)' }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2.5 font-display tracking-[0.16em]" style={{ fontSize: 14, color: '#6E82B0' }}>PLAYERS · {players.length}</div>
            <div className="flex flex-col overflow-y-auto">
              {players.length === 0 && <p className="py-2 text-xs italic" style={{ color: '#7C8DB5' }}>Nobody has joined yet.</p>}
              {orderedPlayers.map((p) => {
                const m = teamMeta(room, p.team);
                return (
                  <div key={p.uid} className="flex items-center gap-2.5 border-b border-white/[.05] px-1.5 py-2.5">
                    <span className="rounded-full" style={{ width: 9, height: 9, background: p.connected ? m.color : '#5A6E9E' }}/>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ opacity: p.connected ? 1 : 0.5 }}>{p.name}</span>
                    <button type="button" aria-label={`Move ${p.name} to the other team`} onClick={act(() => movePlayer({ code, uid: p.uid, team: p.team === 'A' ? 'B' : 'A' }))} className="flex items-center justify-center rounded-lg text-sm text-[#9FB4DE] hover:bg-accent" style={{ width: 28, height: 28, background: 'var(--secondary)' }}>⇄</button>
                    <button type="button" aria-label={`Kick ${p.name}`} onClick={() => onKick(p)} className="flex items-center justify-center rounded-lg text-base" style={{ width: 28, height: 28, background: 'rgba(229,72,77,.14)', color: '#F0A0A3' }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>

          {room.status === 'playing' && (
            <button type="button" onClick={onEndEarly} className="rounded-[12px] border py-3 text-[15px] font-bold" style={{ borderColor: 'rgba(229,72,77,.4)', color: '#F0A0A3' }}>
              End game early
            </button>
          )}
        </aside>
      </div>
    </main>
  );
};

const HostControl = () => (
  <Suspense fallback={<Loading/>}>
    <ControlInner/>
  </Suspense>
);

export default HostControl;
