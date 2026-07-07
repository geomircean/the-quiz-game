'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components';
import Loading from '@/components/loading';
import QuestionConfiguration from '@/components/question-configuration';
import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid';
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

  const goBack = () => router.push('/admin');

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
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="error-message">Could not load question: {loadError}</div>
        <Button onClick={() => router.push('/admin/questions-list')}>Back to Questions</Button>
      </div>
    );
  }

  if (!question) {
    return <Loading/>;
  }

  return (
    <div className="flex flex-col justify-center gap-4">
      <div className="flex justify-between px-24 py-5">
        <Button onClick={goBack}><ArrowUturnLeftIcon className="size-6"/> </Button>
        <Button onClick={saveQuestion} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</Button>
      </div>
      <div className="flex justify-between px-24 py-5">
        <div className='w-full'>
          <h1 className="text-2xl">{id ? 'Edit Question' : 'Create New Question'}</h1>
          {saveError && <div className="error-message">Could not save: {saveError}</div>}
          <QuestionConfiguration questionIndex={0} validation={validation}/>
        </div>
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
