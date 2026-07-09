'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loading from '@/components/loading';
import QuestionConfiguration from '@/components/question-configuration';
import { useQuizConfigStore } from '@/stores';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { validateQuestion } from '@/app/validations';
import { addQuestion, editQuestion, getQuestion } from '@/data/questions';

// Static export has no dynamic segments — edit mode is /admin/question/?id=<docId>.
const QuestionEditor = () => {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { fullQuiz, setupSingleQuestion, loadQuestion, resetQuiz } = useQuizConfigStore();
  const { showToast } = useToast();
  const [validation, setValidation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const question = fullQuiz[0];

  const saveQuestion = async () => {
    setSaveError(null);
    const { isValid, ...rest } = validateQuestion(question);
    if (!isValid) {
      return setValidation(rest);
    }
    setValidation(null);
    setIsSaving(true);
    try {
      if (id) {
        await editQuestion({ id, question });
      } else {
        await addQuestion({ ownerId: user.uid, question });
      }
      showToast(id ? 'Question updated' : 'Question saved');
      router.push('/admin/questions-list');
    } catch (error) {
      setSaveError(error.message);
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setupSingleQuestion();
      return resetQuiz;
    }
    // Guard against a stale fetch resolving after the user navigated on
    // (e.g. Edit → back → Add Question) and clobbering the blank form.
    let cancelled = false;
    getQuestion(id)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          loadQuestion(existing);
        } else {
          setLoadError('Question not found.');
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
      resetQuiz();
    };
  }, [id, loadQuestion, setupSingleQuestion, resetQuiz]);

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col items-center gap-4 px-6 py-16">
        <div className="error-message">Could not load question: {loadError}</div>
        <button type="button" onClick={() => router.push('/admin/questions-list')} className="rounded-xl border border-white/[.16] px-4 py-2.5 text-sm font-bold text-[#C7D2EC] hover:bg-accent">Back to library</button>
      </div>
    );
  }

  if (!question) {
    return <Loading/>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col px-6 py-7 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push('/admin/questions-list')} className="text-sm hover:text-foreground" style={{ color: '#7C8DB5' }}>← Library</button>
        <span style={{ color: '#33456F' }}>/</span>
        <h1 className="font-display tracking-[0.06em]" style={{ fontSize: 26 }}>{id ? 'EDIT QUESTION' : 'NEW QUESTION'}</h1>
        {id && <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: 'rgba(56,189,248,.14)', color: '#8FD4F5' }}>EDITING</span>}
        <button
          type="button"
          onClick={saveQuestion}
          disabled={isSaving}
          className="ml-auto rounded-xl bg-primary px-6 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          style={{ fontSize: 15 }}
        >
          {isSaving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
      {saveError && <div className="error-message mb-3">Could not save: {saveError}</div>}
      <div className="rounded-[18px] p-6 sm:p-7" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
        <QuestionConfiguration questionIndex={0} validation={validation}/>
      </div>
    </div>
  );
};

const Question = () => (
  <Suspense fallback={<Loading/>}>
    <QuestionEditor/>
  </Suspense>
);

export default Question;
