'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components';
import QuestionConfiguration from '@/components/question-configuration';
import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid';
import { useQuizConfigStore } from '@/stores';
import { addQuestion, editQuestion } from '@/services/manage-questions-api';

const Question = ({}) => {
  const router = useRouter();
  const { fullQuiz, validations, setupSingleQuestion, resetQuiz } = useQuizConfigStore();
  const { isAllValid, fullQuizValidation, } = validations;
  const question = fullQuiz[0] || {};
  const { id } = question;

  const getQuestion = () => {
  };
  const saveQuestion = async () => {
    console.log('start save question');
    if (id) {
      const res = await editQuestion(question);
      return;
    }
    const res = await addQuestion(question);
    console.log(res);
  };

  const goBack = () => router.push('/admin');

  useEffect(() => {
    if (id) {
      return getQuestion(id);
    }
    setupSingleQuestion();
    return resetQuiz;
  }, [id, setupSingleQuestion, resetQuiz]);

  return (
    <div className="flex flex-col justify-center gap-4">
      <div className="flex justify-between px-24 py-5">
        <Button onClick={goBack}><ArrowUturnLeftIcon className="size-6"/> </Button>
        <Button onClick={saveQuestion}>Save</Button>
      </div>
      <div className="flex justify-between px-24 py-5">
        <div className='w-full'>
          <h1 className="text-2xl">Create New Question</h1>
          <QuestionConfiguration questionIndex={0} validations={validations}/>
        </div>
      </div>
    </div>
  );
};

export default Question;
