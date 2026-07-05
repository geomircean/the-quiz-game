'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { PlayIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/context/auth-context';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useLaunchQuiz } from '@/hooks/useLaunchQuiz';

// Host mode: the Quizmaster (Google-signed-in) picks a saved quiz and
// launches a live room. Same gate pattern as /admin.
const Host = () => {
  const router = useRouter();
  const { user, isLoading, isQuizmaster, signInWithGoogle } = useAuth();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes();
  const { launch, isLaunching, launchError } = useLaunchQuiz();
  const [signInError, setSignInError] = useState(null);

  const onSignIn = async () => {
    setSignInError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
      setSignInError(error.code === 'auth/popup-blocked'
        ? 'Your browser blocked the sign-in popup — allow popups and try again.'
        : error.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
      <div className="container mx-auto px-4 py-16">
        {isLoading && <Loading/>}
        {!isLoading && !isQuizmaster && (
          <Card className="mx-auto max-w-xl bg-purple-800/40 text-purple-100">
            <CardHeader>
              <CardTitle>Host a game</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              <p>Sign in with Google to host one of your saved quizzes.</p>
              <Button onClick={onSignIn}>Sign in with Google</Button>
              {signInError && <div className="error-message">{signInError}</div>}
            </CardContent>
          </Card>
        )}
        {!isLoading && isQuizmaster && (
          <div className="mx-auto max-w-2xl flex flex-col gap-4">
            <h1 className="text-2xl text-center">Pick a quiz to host</h1>
            {launchError && <div className="error-message text-center">{launchError}</div>}
            {quizzesLoading && <Loading/>}
            {!quizzesLoading && !quizzes?.length && (
              <p className="text-center italic">
                No quizzes yet — build one first.{' '}
                <Button size="sm" onClick={() => router.push('/admin/new-quiz-configuration')}>Build a quiz</Button>
              </p>
            )}
            {quizzes?.map((quiz) => (
              <Card key={quiz.id} className="bg-purple-800/40 text-purple-100">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold">{quiz.name}</div>
                    <div className="text-sm opacity-80">{quiz.questionIds?.length ?? 0} tiles</div>
                  </div>
                  <Button onClick={() => launch(quiz)} disabled={isLaunching}>
                    <PlayIcon className="size-4 mr-1"/> {isLaunching ? 'Starting…' : 'Launch'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Host;
