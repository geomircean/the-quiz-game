'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cog8ToothIcon, TvIcon } from '@heroicons/react/20/solid';
import { normalizeRoomCode } from '@/data/rooms';

// Public landing = the join screen. Players type the room code the host
// shares; the Quizmaster heads to Build (admin) or Host mode. Navy + gold
// to match the player phone this leads into.
const Home = () => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const canJoin = !!normalizeRoomCode(code);

  const join = () => {
    const roomCode = normalizeRoomCode(code);
    if (roomCode.length > 0) {
      router.push(`/play/?room=${roomCode}`);
    }
  };

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
            <input
              id="room-code"
              type="text"
              placeholder="AB3K"
              value={code}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              className="w-full rounded-xl px-4 py-4 text-center font-display uppercase tracking-[0.3em] text-foreground outline-none placeholder:text-[#3A4E7E] focus:border-primary"
              style={{ background: 'var(--background)', border: '2px solid rgba(246,197,68,.35)', fontSize: 40, letterSpacing: '0.25em' }}
            />
            <button
              type="button"
              onClick={join}
              disabled={!canJoin}
              className="w-full rounded-xl bg-primary py-4 font-display text-xl tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
