'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components';
import QuestionConfiguration from '@/components/question-configuration';
import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid';
import { useQuizConfigStore } from '@/stores';

const Question = ({}) => {
  const router = useRouter();
  const { fullQuiz, validations, setupSingleQuestion, resetQuiz } = useQuizConfigStore();
  const question = fullQuiz[0] || {};

  const saveQuestion = async () => {
    // TODO(P1): persist to Firestore via src/data/questions.js (owner-stamped),
    // and hydrate for edit when an id is present — see ROADMAP.md §5 P1.
    console.warn('Saving questions lands in P1 (Firestore).', question);
  };

  const goBack = () => router.push('/admin');

  useEffect(() => {
    setupSingleQuestion();
    return resetQuiz;
  }, [setupSingleQuestion, resetQuiz]);

  return (
    <div className="flex flex-col justify-center gap-4">
      <div className="flex justify-between px-24 py-5">
        <Button onClick={goBack}><ArrowUturnLeftIcon className="size-6"/> </Button>
        <Button onClick={saveQuestion}>Save</Button>
      </div>
      <div className="flex justify-between px-24 py-5">
        <div className='w-full'>
          <h1 className="text-2xl">Create New Question</h1>
          <QuestionConfiguration questionIndex={0} validation={validations.fullQuizValidation[0]}/>
        </div>
      </div>
    </div>
  );
};

export default Question;
