'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components';

// TODO(P3/P4): the live host view — room code + roster in the lobby, then
// the board of tiles, current question, reveal controls and scores. The
// room is resolved from the ?room= query param at runtime (static export
// has no dynamic segments) — see ROADMAP.md §2 and §5.
const HostRoom = () => (
  <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-xl bg-purple-800/40 text-purple-100">
        <CardHeader>
          <CardTitle>Game room</CardTitle>
        </CardHeader>
        <CardContent>
          The live host board arrives in P3/P4.
        </CardContent>
      </Card>
    </div>
  </main>
);

export default HostRoom;
