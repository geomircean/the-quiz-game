'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cog8ToothIcon, TvIcon } from '@heroicons/react/20/solid';
import { normalizeRoomCode } from '@/data/rooms';

// Room codes are always 4 characters (see CODE_LENGTH in data/rooms).
const CODE_LENGTH = 4;

// Public landing = the join screen. Players type the room code the host
// shares; the Quizmaster heads to Build (admin) or Host mode. Navy + gold
// to match the player phone this leads into — the code entry is four
// character boxes (design bundle), driven by one transparent overlay input
// so mobile keyboards, paste and auto-caps all just work.
const Home = () => {
  const router = useRouter();
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const canJoin = code.length === CODE_LENGTH;

  const join = () => {
    const roomCode = normalizeRoomCode(code);
    if (roomCode.length > 0) {
      router.push(`/play/?room=${roomCode}`);
    }
  };

  const activeIndex = focused ? code.length : -1;

  return (
    <main className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-primary"/>

      <div className="flex justify-end gap-2 px-5 pt-6 sm:px-6">
        <button type="button" onClick={() => router.push('/host')} aria-label="Host mode" className="inline-flex items-center gap-2 rounded-xl border border-white/[.16] px-3.5 py-2 text-sm font-semibold text-[#C7D2EC] hover:bg-accent">
          <TvIcon className="size-4"/> Host
        </button>
        <button type="button" onClick={() => router.push('/admin')} aria-label="Quiz Studio" className="inline-flex items-center gap-2 rounded-xl border border-white/[.16] px-3.5 py-2 text-sm font-semibold text-[#C7D2EC] hover:bg-accent">
          <Cog8ToothIcon className="size-4"/> Studio
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[380px] text-center">
          <div className="font-display tracking-[0.32em] text-primary" style={{ fontSize: 13 }}>QUIZ NIGHT</div>
          <h1 className="mt-2 font-display leading-none" style={{ fontSize: 46 }}>TEAM QUIZ SHOW</h1>
          <p className="mt-3 text-[15px]" style={{ color: '#9FB4DE' }}>Enter the room code your host is showing.</p>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
            <label htmlFor="room-code" className="text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>ROOM CODE</label>

            {/* Four visual boxes over one transparent input that owns the value. */}
            <div className="relative" onClick={() => inputRef.current?.focus()}>
              <div className="flex gap-2.5">
                {Array.from({ length: CODE_LENGTH }, (_, i) => {
                  const char = code[i] ?? '';
                  const active = i === activeIndex;
                  return (
                    <div
                      key={i}
                      className="flex flex-1 items-center justify-center rounded-[14px] font-display"
                      style={{
                        height: 72,
                        fontSize: 36,
                        background: active ? 'var(--secondary)' : 'var(--background)',
                        border: `2px solid ${active ? 'var(--primary)' : 'rgba(246,197,68,.35)'}`,
                      }}
                    >
                      {char || (active
                        ? <span style={{ width: 3, height: 34, background: 'var(--primary)', animation: 'blink 1s step-end infinite' }}/>
                        : '')}
                    </div>
                  );
                })}
              </div>
              <input
                ref={inputRef}
                id="room-code"
                type="text"
                value={code}
                maxLength={CODE_LENGTH}
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Room code"
                onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, CODE_LENGTH))}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <div className="text-[13px]" style={{ color: '#6E82B0' }}>Auto-caps · 4 characters</div>

            <button
              type="button"
              onClick={join}
              disabled={!canJoin}
              className="mt-1 w-full rounded-xl bg-primary py-4 font-display text-xl tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
            >
              JOIN GAME
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
