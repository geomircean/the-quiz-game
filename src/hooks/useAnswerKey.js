'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { subscribeToAnswerKey } from '@/data/rooms';

// The host-only answer key for a room (roomKeys/{code}). Players are denied
// by the rules — this hook simply yields null for them.
export const useAnswerKey = (code) => {
  const { user } = useAuth();
  const [state, setState] = useState({ code: null, key: null });

  useEffect(() => {
    if (!code || !user) return undefined;
    return subscribeToAnswerKey(
      code,
      (value) => setState({ code, key: value?.key ?? null }),
      () => setState({ code, key: null }),
    );
  }, [code, user]);

  return state.code === code ? state.key : null;
};
