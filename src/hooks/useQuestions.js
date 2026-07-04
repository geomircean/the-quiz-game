'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { subscribeToOwnQuestions } from '@/data/questions';

// Live view of the signed-in Quizmaster's private question library.
export const useQuestions = () => {
  const { user, isQuizmaster } = useAuth();
  // State is only ever set from the subscription callback; the exposed
  // value is derived so a sign-out (or user switch) never shows stale data.
  const [library, setLibrary] = useState({ ownerId: null, questions: null, error: null });

  useEffect(() => {
    if (!user || !isQuizmaster) {
      return undefined;
    }
    const ownerId = user.uid;
    return subscribeToOwnQuestions(
      ownerId,
      (nextQuestions) => {
        nextQuestions.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
        setLibrary({ ownerId, questions: nextQuestions, error: null });
      },
      (error) => setLibrary({ ownerId, questions: null, error }),
    );
  }, [user, isQuizmaster]);

  const isCurrentOwner = !!user && isQuizmaster && library.ownerId === user.uid;
  const questions = isCurrentOwner ? library.questions : null;
  const error = isCurrentOwner ? library.error : null;

  return { questions, error, isLoading: !!user && isQuizmaster && questions === null && !error };
};
