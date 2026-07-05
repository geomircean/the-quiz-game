'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useQuestions } from '@/hooks/useQuestions';
import { createRoom } from '@/data/rooms';

// Launch a saved quiz into a live room and land on the host view.
// Requires the question library (to copy the board) — hard-fails if any
// quiz pointer is missing rather than launching a partial board.
export const useLaunchQuiz = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { questions, isLoading: libraryLoading } = useQuestions();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);

  const launch = async (quiz) => {
    setLaunchError(null);
    if (libraryLoading || !questions) {
      return setLaunchError('Your library is still loading — try again in a second.');
    }
    setIsLaunching(true);
    try {
      const { code } = await createRoom({ hostId: user.uid, quiz, questions });
      router.push(`/host/room/?room=${code}`);
    } catch (error) {
      setLaunchError(error.message);
      setIsLaunching(false);
    }
  };

  return { launch, isLaunching, launchError };
};
