'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components';
import { Cog8ToothIcon, TvIcon } from '@heroicons/react/20/solid';
import { normalizeRoomCode } from '@/data/rooms';

// Public landing = the join screen. Players type the room code the host
// shares; the Quizmaster heads to Build (admin) or Host mode.
const Home = () => {
  const router = useRouter();
  const [code, setCode] = useState('');

  const join = () => {
    const roomCode = normalizeRoomCode(code);
    if (roomCode.length > 0) {
      router.push(`/play/?room=${roomCode}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
      <div className="container mx-auto px-4 py-16">
        <div className="w-full flex justify-end gap-2">
          <Button className="border-0" onClick={() => router.push('/host')} aria-label="Host mode">
            <TvIcon className="size-6 text-white"/>
          </Button>
          <Button className="border-0" onClick={() => router.push('/admin')} aria-label="Admin">
            <Cog8ToothIcon className="size-6 text-white"/>
          </Button>
        </div>
        <div className="mx-auto max-w-md pt-16 flex flex-col gap-6 text-center">
          <h1 className="text-4xl font-bold">Team Quiz Show</h1>
          <Card className="bg-purple-800/40 text-purple-100">
            <CardHeader>
              <CardTitle>Join a game</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                type="text"
                placeholder="Room code (e.g. AB3K)"
                value={code}
                maxLength={8}
                className="text-center text-2xl tracking-widest uppercase"
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && join()}
              />
              <Button className="w-full" onClick={join} disabled={!normalizeRoomCode(code)}>
                Join
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Home;
