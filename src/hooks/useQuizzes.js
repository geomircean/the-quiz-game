'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { subscribeToOwnQuizzes } from '@/data/quizzes';

// Live view of the signed-in Quizmaster's saved quizzes.
export const useQuizzes = () => {
  const { user, isQuizmaster } = useAuth();
  const [store, setStore] = useState({ ownerId: null, quizzes: null, error: null });

  useEffect(() => {
    if (!user || !isQuizmaster) {
      return undefined;
    }
    const ownerId = user.uid;
    return subscribeToOwnQuizzes(
      ownerId,
      (nextQuizzes) => {
        nextQuizzes.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
        setStore({ ownerId, quizzes: nextQuizzes, error: null });
      },
      (error) => setStore({ ownerId, quizzes: null, error }),
    );
  }, [user, isQuizmaster]);

  const isCurrentOwner = !!user && isQuizmaster && store.ownerId === user.uid;
  const quizzes = isCurrentOwner ? store.quizzes : null;
  const error = isCurrentOwner ? store.error : null;

  return { quizzes, error, isLoading: !!user && isQuizmaster && quizzes === null && !error };
};
