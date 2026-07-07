'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { subscribeToRoom } from '@/data/rooms';

// Live view of a room. Rooms are sealed: a read only succeeds for the host
// or a joined player, so `denied` doubles as "you have not joined yet".
export const useRoom = (code) => {
  const { user } = useAuth();
  // `generation` forces a re-subscribe after a successful join (a denied
  // onValue listener is cancelled by the server and won't recover alone).
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState({ code: null, room: null, error: null, settled: false });

  useEffect(() => {
    if (!code || !user) {
      return undefined;
    }
    return subscribeToRoom(
      code,
      (room) => setState({ code, room, error: null, settled: true }),
      (error) => setState({ code, room: null, error, settled: true }),
    );
  }, [code, user, generation]);

  const isCurrent = state.code === code;
  const room = isCurrent ? state.room : null;
  const error = isCurrent ? state.error : null;
  const denied = !!error && (
    error.code === 'PERMISSION_DENIED' || /permission[_ ]?denied/i.test(String(error.message ?? ''))
  );

  return {
    room,
    error,
    denied,
    isLoading: !!code && !!user && (!isCurrent || !state.settled),
    resubscribe: () => setGeneration((g) => g + 1),
  };
};
