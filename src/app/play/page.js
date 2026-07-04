'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components';

// TODO(P3): players land here (optionally with ?room=CODE), sign in
// anonymously, enter a name and pick a team; on refresh an existing
// players/{uid} membership slides them straight back in — see
// ROADMAP.md §5 P3.
const Play = () => (
  <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-xl bg-purple-800/40 text-purple-100">
        <CardHeader>
          <CardTitle>Join a game</CardTitle>
        </CardHeader>
        <CardContent>
          Joining with a room code arrives in P3.
        </CardContent>
      </Card>
    </div>
  </main>
);

export default Play;
