'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components';

// TODO(P3): the Quizmaster picks a saved quiz here, a room is created in
// RTDB (board copied WITHOUT isCorrect), and a room code is shown — see
// ROADMAP.md §5 P3.
const Host = () => (
  <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-xl bg-purple-800/40 text-purple-100">
        <CardHeader>
          <CardTitle>Host a game</CardTitle>
        </CardHeader>
        <CardContent>
          Host mode arrives in P3 — start a saved quiz and get a room code for
          players to join.
        </CardContent>
      </Card>
    </div>
  </main>
);

export default Host;
