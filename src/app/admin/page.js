'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/loading';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useLaunchQuiz } from '@/hooks/useLaunchQuiz';
import { useToast } from '@/context/toast-context';
import { deleteQuiz } from '@/data/quizzes';
import RandomQuizSheet from '@/components/random-quiz-sheet';

const BASE_URL = '/admin';

const ANSWER_MODE_LABELS = {
  firstTap: 'First-tap',
  majority: 'Majority wins',
};

const AdminLanding = () => {
  const router = useRouter();
  const { quizzes, error, isLoading } = useQuizzes();
  const { launch, isLaunching, launchError } = useLaunchQuiz();
  const { showToast } = useToast();
  const [deleteError, setDeleteError] = useState(null);
  const [isRandomOpen, setIsRandomOpen] = useState(false);

  const onDeleteQuiz = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteQuiz(id);
      showToast('Quiz deleted');
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display leading-none" style={{ fontSize: 38 }}>QUIZZES</h1>
          <p className="mt-1.5 text-sm" style={{ color: '#7C8DB5' }}>Launch a game or keep building.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => router.push(`${BASE_URL}/new-quiz-configuration`)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display tracking-wide text-primary-foreground hover:bg-primary/90"
            style={{ fontSize: 16 }}
          >
            + CONFIGURE NEW QUIZ
          </button>
          <button type="button" onClick={() => setIsRandomOpen(true)} className="rounded-xl border border-white/[.16] px-4 py-3 text-[15px] font-bold text-[#C7D2EC] hover:bg-accent">
            Generate random
          </button>
          <button type="button" onClick={() => router.push(`${BASE_URL}/questions-list`)} className="rounded-xl border border-white/[.16] px-4 py-3 text-[15px] font-bold text-[#C7D2EC] hover:bg-accent">
            Question library
          </button>
        </div>
      </div>

      {error && <div className="error-message">Could not load quizzes: {error.message}</div>}
      {deleteError && <div className="error-message">Could not delete: {deleteError}</div>}
      {launchError && <div className="error-message">Could not launch: {launchError}</div>}
      {isLoading && <Loading/>}
      {!isLoading && !quizzes?.length && (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center" style={{ background: 'var(--card)' }}>
          <p className="italic" style={{ color: '#9FB4DE' }}>No quizzes yet — configure your first one.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes?.map(({ id, name, questionIds, answerMode }) => (
          <div key={id} className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div>
              <div className="font-extrabold" style={{ fontSize: 20 }}>{name}</div>
              <div className="mt-1.5 text-[13px]" style={{ color: '#7C8DB5' }}>
                {questionIds?.length ?? 0} question{(questionIds?.length ?? 0) === 1 ? '' : 's'} · {ANSWER_MODE_LABELS[answerMode] ?? answerMode} · 2 teams
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isLaunching}
                onClick={() => launch(quizzes.find((q) => q.id === id))}
                className="rounded-[10px] bg-primary px-4 py-2 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                style={{ fontSize: 14 }}
              >
                {isLaunching ? 'STARTING…' : 'LAUNCH'}
              </button>
              <button type="button" onClick={() => router.push(`${BASE_URL}/new-quiz-configuration/?id=${id}`)} className="rounded-[10px] border border-white/[.16] px-3.5 py-2 text-sm font-semibold text-[#C7D2EC] hover:bg-accent">
                Edit
              </button>
              <button type="button" onClick={() => onDeleteQuiz(id, name)} className="rounded-[10px] border px-3.5 py-2 text-sm font-semibold" style={{ borderColor: 'rgba(229,72,77,.4)', color: '#F0A0A3' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <RandomQuizSheet open={isRandomOpen} onOpenChange={setIsRandomOpen}/>
    </div>
  );
};

export default AdminLanding;
