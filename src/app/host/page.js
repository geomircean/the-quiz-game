'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/loading';
import { PlayIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/context/auth-context';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useLaunchQuiz } from '@/hooks/useLaunchQuiz';

// Host mode: the Quizmaster (Google-signed-in) picks a saved quiz and
// launches a live room. Same gate pattern as /admin. Navy + gold.
const Host = () => {
  const router = useRouter();
  const { isLoading, isQuizmaster, signInWithGoogle } = useAuth();
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

  if (isLoading) {
    return <main className="flex min-h-dvh items-center justify-center bg-background"><Loading/></main>;
  }

  if (!isQuizmaster) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-primary"/>
        <div className="flex w-full max-w-[440px] flex-col items-center gap-2 rounded-[20px] p-11 text-center" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="flex items-center justify-center rounded-[14px] bg-primary font-display text-primary-foreground" style={{ width: 56, height: 56, fontSize: 34 }}>Q</div>
          <div className="mt-2.5 font-display tracking-[0.06em]" style={{ fontSize: 32 }}>HOST A GAME</div>
          <p className="max-w-[300px] text-[16px] leading-relaxed" style={{ color: '#9FB4DE' }}>
            Sign in with Google to host one of your saved quizzes.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-[12px] bg-[#F2F5FF] py-3.5 text-[16px] font-bold text-[#1a1a1a] hover:brightness-95"
          >
            <span className="flex items-center justify-center rounded-full border-2 border-[#C7D2EC] font-display text-[#4285F4]" style={{ width: 22, height: 22, fontSize: 13 }}>G</span>
            Sign in with Google
          </button>
          {signInError && <div className="error-message mt-3">{signInError}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-primary"/>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-10">
        <h1 className="font-display tracking-[0.06em]" style={{ fontSize: 32 }}>PICK A QUIZ TO HOST</h1>
        {launchError && <div className="error-message">{launchError}</div>}
        {quizzesLoading && <Loading/>}
        {!quizzesLoading && !quizzes?.length && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 p-12 text-center" style={{ background: 'var(--card)' }}>
            <p className="italic" style={{ color: '#9FB4DE' }}>No quizzes yet — build one first.</p>
            <button type="button" onClick={() => router.push('/admin/new-quiz-configuration')} className="rounded-xl bg-primary px-5 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90" style={{ fontSize: 15 }}>BUILD A QUIZ</button>
          </div>
        )}
        {quizzes?.map((quiz) => (
          <div key={quiz.id} className="flex items-center justify-between gap-4 rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="min-w-0">
              <div className="font-semibold" style={{ fontSize: 18 }}>{quiz.name}</div>
              <div className="mt-0.5 text-sm" style={{ color: '#7C8DB5' }}>{quiz.questionIds?.length ?? 0} tile{(quiz.questionIds?.length ?? 0) === 1 ? '' : 's'}</div>
            </div>
            <button
              type="button"
              onClick={() => launch(quiz)}
              disabled={isLaunching}
              className="inline-flex flex-none items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              style={{ fontSize: 15 }}
            >
              <PlayIcon className="size-4"/> {isLaunching ? 'STARTING…' : 'LAUNCH'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
};

export default Host;
